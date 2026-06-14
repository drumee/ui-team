
const { copyToClipboard } = require('@drumee/ui-essentials');
const mfsInteract = require('../interact');

class __window_secure_share extends mfsInteract {

  static initClass() {
    this.prototype.figName = 'window_secure_share';
    // Figma "Permission Panel (Slide in from right)" — fixed 450px-wide right dock.
    this.prototype.size = { width: 450, height: 876, minWidth: 380, minHeight: 480 };
  }

  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    // Embedded mode (Figma): the panel renders as a right drawer INSIDE the host
    // workspace window's dialog wrapper (same mechanism as folder settings), so it
    // must NOT behave like a floating window — skip all self-positioning/chrome.
    this._embedded = !!(opt && opt.embedded);
    if (!this._embedded) {
      // Standalone fallback — Figma "Permission Panel (Slide in from right)": a
      // fixed 450px right dock. The window base inflates this.size.width to
      // Math.max(width, innerWidth/4), so pin it back to the Figma width (clamped
      // to the viewport so it can never overflow). Re-applied in onDomRefresh
      // because Wm.launch positions from the preset AFTER initialize.
      this._dockWidth = Math.min(450, window.innerWidth);
      this.size.width = this._dockWidth;
      this._applyRightDock();
    }
    this._expiryPreset     = null;
    this._customExpiryDate = null;
    this._expiryOn         = false;
    this._notifyOnOpen     = true;   // notify the sender when a recipient opens (default ON)
    // v2: Recipients mode is MULTI-select — download/chat/edit are independent
    // capabilities, not a hierarchy. can_view is the implicit baseline (empty set).
    this._capabilities     = new Set();
    this._shareMode        = 'public';
    this._requireEmail    = false;
    this._requirePassword = false;
    this._emailChips      = [];
    this._grantLevel      = null;
    this._pendingRequest  = null;
    this.declareHandlers();
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
  }

  onWsMessage(svc, data, options = {}) {
    // Service is the FIRST arg; options is usually {} (no options.service). The old
    // `const {service}=options||svc` resolved to undefined and dropped every event.
    const service = (options && options.service) || svc;
    if (service === 'share.track_event') {
      // NOTE: we deliberately do NOT auto-open the approve popup inside this panel
      // on a new access request (per Lexis 2026-06-14) — it rendered as a stuck,
      // unusable popup cramped into the sharing panel. Approval is handled from the
      // activity-panel notification instead (which opens a proper centered popup).
      // The window only refreshes its lists here.
      this._loadShares();
      // Also refresh the access-list table (who opened / current recipients) so it
      // updates live — e.g. on secure_share_opened when a recipient views the share,
      // or after an approval/revoke. _loadShares only reloads the links list, not this
      // table, so without this the access list stayed stale until a manual refresh.
      if (this._accessEvents) this._loadAccessEvents();
      return;
    }
    if (super.onWsMessage) super.onWsMessage(svc, data, options);
  }

  onDomRefresh() {
    this.feed(require('./skeleton/main')(this));
    // Embedded drawer: the host workspace window owns the layout (its dialog
    // wrapper positions us), so skip the floating-window dock/raise/drag setup.
    if (this._embedded) return;
    // Re-assert the right dock AFTER Wm has applied the launch-preset position
    // (otherwise the panel renders at the cascade spot — offset/overflowing).
    this._applyRightDock();
    this.raise();
    this.setupInteract();
  }

  // Pin the window to the top-right corner as a full-height, fixed-width panel
  // (Figma slide-in). Positions relative to the window-manager area (Wm.$el),
  // NOT the full viewport — windows live inside the Wm layer, which is offset by
  // the sidebar and narrower than window.innerWidth (the base's max_size() uses
  // Wm.$el.width() for the same reason). Using innerWidth pushed the panel past
  // the right edge. left is clamped so it can never overflow.
  _applyRightDock() {
    const wm    = (typeof Wm !== 'undefined' && Wm.$el) ? Wm.$el : null;
    const areaW = wm ? wm.width()  : window.innerWidth;
    const areaH = wm ? wm.height() : window.innerHeight;
    const width  = Math.min(this._dockWidth || 450, areaW);
    const left   = Math.max(0, areaW - width);
    this.style.set({ width, height: areaH, left, top: 0 });
    if (this.el) {
      this.$el.css({ width: `${width}px`, height: `${areaH}px`, left: `${left}px`, top: '0px' });
    }
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'ref-email':
        return this._emailInput = child;
      case 'ref-domain':
        return this._domainInput = child;
      case 'ref-create-password':
        return this._createPasswordInput = child;
      case 'chips-container':
        return this._chipsContainer = child;
      case 'ref-chips-input':
        return this._chipsInput = child;
      case 'custom-expiry':
        return this._customExpiry = child;
      case 'secure-options':
        return this._secureOptions = child;
      case 'share-list':
        this._shareList = child;
        this._loadShares();
        return;
      case 'shared-links-body':
        return this._sharedLinksBody = child;
      case 'shared-links-label':
        return this._sharedLinksLabel = child;
      case 'access-events':
        this._accessEvents = child;
        this._loadAccessEvents();   // PRIMARY view — auto-expanded, load on render
        return;
      case 'link-result':
        return this._linkResult = child;
      case 'approve-overlay':
        return this.__approveOverlay = child;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case 'create-secure-share':
        return this._createShare();
      case 'select-permission':
        return this._selectPermission(cmd);
      case 'select-share-mode':
        return this._selectShareMode(cmd);
      case 'toggle-require-email':
        return this._toggleRequireEmail();
      case 'toggle-require-password':
        return this._toggleRequirePassword();
      case 'toggle-password-visibility':
        return this._togglePasswordVisibility(cmd);
      case 'add-email-chip':
        return this._addEmailChip();
      case 'remove-email-chip':
        return this._removeEmailChip(cmd);
      case 'toggle-expiry':
        return this._toggleExpiry();

      case 'toggle-notify':
        return this._toggleNotify();
      case 'expiry-preset':
        return this._selectPreset(cmd);
      case 'expiry-date-picked':
        return this._onExpiryDatePicked(cmd);
      case 'copy-secure-link':
        return this._copyLink(cmd);
      case 'revoke-secure-share':
        return this._revokeShare(cmd);
      case 'toggle-access-list':
        return this._toggleAccessList();
      case 'toggle-shared-links':
        return this._toggleSharedLinks();
      case 'revoke-access-recipient':
        return this._revokeRecipient(cmd);
      case 'select-grant-level':
        return this._selectGrantLevel(cmd);
      case 'approve-access-request':
        return this._approveRequest();
      case 'deny-access-request':
        return this._denyRequest();
      case 'close-approve-popup':
        return this._closeApprovePopup();
      case 'close-access-result':
        return this._closeApprovePopup();
      case 'change-permission':
        // Reopen the approve popup for the same request (Figma "Change permission").
        return this._showApprovePopup(this.mget('_pendingRequest'));
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }

  // Select an expiry preset and update visual state
  _selectPreset(cmd) {
    const preset = cmd.mget('preset');
    this._expiryPreset = preset;

    // Highlight selected button via data-selected attribute
    const presetBtns = this.el.querySelectorAll(`.${this.fig.family}__preset`);
    presetBtns.forEach(btn => {
      btn.dataset.selected = (btn.dataset.preset === preset) ? 'yes' : '';
    });

    // Show custom inputs only when "Custom" is selected
    if (this._customExpiry) {
      this._customExpiry.el.dataset.mode = (preset === 'custom') ? _a.open : _a.closed;
    }
    if (preset !== 'custom') this._customExpiryDate = null;
  }

  // Link Expiration toggle (Figma collapsed control). On → reveal the presets +
  // calendar picker; Off → clear any chosen expiry so the link never expires.
  _toggleExpiry() {
    const pfx = this.fig.family;
    this._expiryOn = !this._expiryOn;
    const toggle = this.el.querySelector(`.${pfx}__toggle`);
    if (toggle) toggle.dataset.on = this._expiryOn ? 'yes' : '';
    const options = this.el.querySelector(`.${pfx}__expiry-options`);
    if (options) options.dataset.mode = this._expiryOn ? _a.open : _a.closed;
    if (!this._expiryOn) {
      this._expiryPreset     = null;
      this._customExpiryDate = null;
      this.el.querySelectorAll(`.${pfx}__preset`).forEach(btn => { btn.dataset.selected = ''; });
      if (this._customExpiry) this._customExpiry.el.dataset.mode = _a.closed;
    }
  }

  _toggleNotify() {
    const pfx = this.fig.family;
    this._notifyOnOpen = !this._notifyOnOpen;
    // Scope to the notify row — there are two `__toggle` elements in the panel.
    const toggle = this.el.querySelector(`.${pfx}__notify-row .${pfx}__toggle`);
    if (toggle) toggle.dataset.on = this._notifyOnOpen ? 'yes' : '';
  }

  // Calendar date/time picked for a custom expiry. The datepicker reports the
  // chosen date as a JS Date in `startDate`; we convert it to hours-from-now at
  // create time so the server contract (days/hours → expiry_time) is unchanged.
  _onExpiryDatePicked(cmd) {
    const d = cmd.mget('startDate');
    this._customExpiryDate = (d instanceof Date) ? d : (d ? new Date(d) : null);
  }

  _selectPermission(cmd) {
    const level = cmd.mget('level');
    if (!level) return;
    // Multi-select: each capability toggles independently (Figma checkboxes).
    if (this._capabilities.has(level)) this._capabilities.delete(level);
    else this._capabilities.add(level);
    this.el.querySelectorAll(`.${this.fig.family}__perm-btn`).forEach(btn => {
      btn.dataset.selected = this._capabilities.has(btn.dataset.level) ? 'yes' : '';
    });
  }

  // Public vs Secure single choice. Secure reveals the email/password checkboxes.
  _selectShareMode(cmd) {
    const mode = cmd.mget('share_mode');
    if (!mode) return;
    this._shareMode = mode;
    this.el.querySelectorAll(`.${this.fig.family}__mode-option`).forEach(opt => {
      opt.dataset.selected = (opt.dataset.mode === mode) ? 'yes' : '';
    });
    // Figma: the Secure card (wrapping the row + email/password options) gets the
    // selected border/fill so it reads as one nested panel.
    const secureCard = this.el.querySelector(`.${this.fig.family}__secure-card`);
    if (secureCard) secureCard.dataset.selected = (mode === 'secure') ? 'yes' : '';
    if (this._secureOptions) {
      this._secureOptions.el.dataset.mode = (mode === 'secure') ? _a.open : _a.closed;
    }
    // Leaving Secure → drop any secure-only settings so a public link carries no gate.
    if (mode !== 'secure') this._resetSecureOptions();
  }

  // Reset the email/password checkboxes, chips, password field and hide their gates.
  _resetSecureOptions() {
    const pfx = this.fig.family;
    this._requireEmail    = false;
    this._requirePassword = false;
    this._emailChips      = [];
    const emailCheck = this.el.querySelector(`.${pfx}__check[data-for='require-email']`);
    if (emailCheck) emailCheck.dataset.on = '';
    const emailGate = this.el.querySelector(`.${pfx}__email-gate`);
    if (emailGate) emailGate.dataset.mode = _a.closed;
    this._renderChips();
    const pwCheck = this.el.querySelector(`.${pfx}__check[data-for='require-password']`);
    if (pwCheck) pwCheck.dataset.on = '';
    const pwGate = this.el.querySelector(`.${pfx}__password-gate`);
    if (pwGate) pwGate.dataset.mode = _a.closed;
    if (this._createPasswordInput) {
      const input = this._createPasswordInput.el.querySelector('input');
      if (input) input.value = '';
    }
  }

  _toggleRequireEmail() {
    this._requireEmail = !this._requireEmail;
    const check = this.el.querySelector(`.${this.fig.family}__check[data-for='require-email']`);
    if (check) check.dataset.on = this._requireEmail ? 'yes' : '';
    const gate = this.el.querySelector(`.${this.fig.family}__email-gate`);
    if (gate) gate.dataset.mode = this._requireEmail ? _a.open : _a.closed;
    if (!this._requireEmail) {
      this._emailChips = [];
      this._renderChips();
    }
  }

  _toggleRequirePassword() {
    this._requirePassword = !this._requirePassword;
    const check = this.el.querySelector(`.${this.fig.family}__check[data-for='require-password']`);
    if (check) check.dataset.on = this._requirePassword ? 'yes' : '';
    const gate = this.el.querySelector(`.${this.fig.family}__password-gate`);
    if (gate) gate.dataset.mode = this._requirePassword ? _a.open : _a.closed;
    if (!this._requirePassword && this._createPasswordInput) {
      const input = this._createPasswordInput.el.querySelector('input');
      if (input) input.value = '';
    }
  }

  // Show/hide the password — mirrors welcome/signin: toggle the input type, swap
  // the eye_closed↔eye glyph and flip data-state (CSS colours it on state=1).
  _togglePasswordVisibility(cmd) {
    const row = cmd.el.closest(`.${this.fig.family}__password-row`);
    const input = row && row.querySelector('input');
    if (!input) return;
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    const useEl = cmd.el.querySelector('svg use');
    if (useEl) {
      useEl.setAttribute('xlink:href', isVisible ? '#--icon-eye_closed' : '#--icon-eye');
    }
    cmd.el.dataset.state = isVisible ? '0' : '1';
  }

  _addEmailChip() {
    if (!this._chipsInput) return;
    const input = this._chipsInput.el.querySelector('input');
    if (!input) return;
    const raw = input.value.trim().toLowerCase();
    if (!raw) return;
    const isEmail  = Validator.email(raw);
    const isDomain = raw.startsWith('@') && raw.length > 1 && !/\s/.test(raw);
    if (!isEmail && !isDomain) return;
    if (!this._emailChips.includes(raw)) this._emailChips.push(raw);
    input.value = '';
    this._renderChips();
  }

  _removeEmailChip(cmd) {
    const email = cmd.mget('chip_email');
    this._emailChips = this._emailChips.filter(e => e !== email);
    this._renderChips();
  }

  _renderChips() {
    if (!this._chipsContainer) return;
    const pfx  = this.fig.family;
    const kids = this._emailChips.map(email =>
      Skeletons.Box.X({
        className : `${pfx}__chip`,
        kids      : [
          Skeletons.Note({ className: `${pfx}__chip-text`, content: email }),
          Skeletons.Note({
            className  : `${pfx}__chip-remove`,
            content    : '×',
            service    : 'remove-email-chip',
            chip_email : email,
            uiHandler  : [this]
          })
        ]
      })
    );
    this._chipsContainer.feed(Skeletons.Box.X({ className: `${pfx}__chips`, kids }));
    this._collapseChipsOverflow();
  }

  // Keep the chips on a single row (Figma "Access filter"): show the chips that
  // fit, collapse the rest into a "+N" badge whose hover popup lists the hidden
  // emails. Re-measured on every render, so it stays correct as chips change.
  _collapseChipsOverflow() {
    if (!this._chipsContainer) return;
    const pfx = this.fig.family;
    const container = this._chipsContainer.el;
    const row = container && container.querySelector(`.${pfx}__chips`);
    if (!row) return;

    // Reset previous collapse so measuring starts from the full set.
    const oldBadge = row.querySelector(`.${pfx}__chip-more`);
    if (oldBadge) oldBadge.remove();
    const chips = Array.from(row.querySelectorAll(`.${pfx}__chip`));
    chips.forEach(c => { c.style.display = ''; });

    const avail = container.clientWidth;
    if (!avail || chips.length === 0) return;

    const gap     = parseFloat(getComputedStyle(row).columnGap) || 8;
    const RESERVE = 52; // room for the "+N" badge

    // Count the leading chips that fit on the line.
    let used    = 0;
    let visible = chips.length;
    for (let i = 0; i < chips.length; i++) {
      const w = chips[i].offsetWidth + (i ? gap : 0);
      if (used + w > avail) { visible = i; break; }
      used += w;
    }
    if (visible === chips.length) return; // everything fits → no badge

    // Make room for the badge beside the visible chips.
    while (visible > 0 && used + gap + RESERVE > avail) {
      visible--;
      used -= chips[visible].offsetWidth + (visible ? gap : 0);
    }
    for (let i = visible; i < chips.length; i++) chips[i].style.display = 'none';

    const hidden = this._emailChips.slice(visible);
    const badge  = document.createElement('div');
    badge.className = `${pfx}__chip ${pfx}__chip-more`;
    const count = document.createElement('span');
    count.className = `${pfx}__chip-text`;
    count.textContent = `+${hidden.length}`;
    badge.appendChild(count);

    const popup = document.createElement('div');
    popup.className = `${pfx}__chip-popup`;
    hidden.forEach(email => {
      const r = document.createElement('div');
      r.className = `${pfx}__chip-popup-row`;
      r.textContent = email;
      popup.appendChild(r);
    });
    badge.appendChild(popup);
    row.appendChild(badge);
  }

  async _loadShares() {
    const nid    = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);
    try {
      const rows = await this.postService(SERVICE.secure_share.list, { nid, hub_id });
      this._renderShareList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      this._renderShareList([]);
    }
  }

  // Collapse / expand the secondary SHARED LINKS list.
  _toggleSharedLinks() {
    if (!this._sharedLinksBody) return;
    const open = this._sharedLinksBody.el.dataset.mode !== _a.open;
    this._sharedLinksBody.el.dataset.mode = open ? _a.open : _a.closed;
  }

  _renderShareList(rows) {
    if (!this._shareList) return;
    // Reflect the count in the collapsed header (e.g. "Shared links (3)").
    if (this._sharedLinksLabel) {
      this._sharedLinksLabel.el.textContent = rows.length
        ? `${LOCALE.SECURE_SHARE_EXISTING} (${rows.length})`
        : LOCALE.SECURE_SHARE_EXISTING;
    }
    const row_skl = require('./skeleton/share-row');
    if (!rows.length) {
      this._shareList.feed(Skeletons.Note({
        className: `${this.fig.family}__share-empty`,
        content: LOCALE.SECURE_SHARE_NO_SHARES
      }));
      return;
    }
    const kids = rows.map((row) => row_skl(this, row));
    this._shareList.feed(Skeletons.Box.Y({
      className: `${this.fig.family}__share-rows`,
      kids
    }));
  }

  // ── "View access list" — per-access-event table (Figma 2.2.3) ──
  // Collapsed by default; the toggle lazy-loads the events the first and every
  // subsequent time it is opened so the data stays fresh.
  _toggleAccessList() {
    if (!this._accessEvents) return;
    const open = this._accessEvents.el.dataset.mode !== _a.open;
    this._accessEvents.el.dataset.mode = open ? _a.open : _a.closed;
    if (open) this._loadAccessEvents();
  }

  async _loadAccessEvents() {
    if (!this._accessEvents) return;
    const nid    = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);
    const events_skl = require('./skeleton/access-events');
    try {
      const rows = await this.postService(SERVICE.secure_share.list_access_events, { nid, hub_id });
      this._accessEvents.feed(events_skl(this, Array.isArray(rows) ? rows : []));
    } catch (e) {
      this._accessEvents.feed(events_skl(this, []));
    }
  }

  // ⊖ revoke a single recipient's current grant (re-requestable — not blocklisted),
  // then refresh the table so the row drops off.
  async _revokeRecipient(cmd) {
    const email  = cmd.mget('email') || '';
    const uid    = cmd.mget('uid') || '';
    if (!email && !uid) return;
    const nid    = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);
    await this.postService(SERVICE.secure_share.revoke_recipient, { nid, hub_id, email, uid });
    this._loadAccessEvents();
  }

  async _createShare() {
    if (this._linkResult) this._linkResult.el.dataset.mode = _a.closed;

    const nid    = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);

    // Derive days/hours from selected preset
    let days = 0, hours = 0;
    switch (this._expiryPreset) {
      case '1h':    hours = 1; break;
      case '24h':   days  = 1; break;
      case '7d':    days  = 7; break;
      case 'custom':
        // Convert the picked absolute date/time into whole hours from now.
        if (this._customExpiryDate) {
          const ms = this._customExpiryDate.getTime() - Date.now();
          hours = (ms > 0) ? Math.ceil(ms / 3600000) : 0;
        }
        break;
      default:
        break; // no preset selected = no expiry
    }

    const payload = { nid, hub_id, capabilities: Array.from(this._capabilities), days, hours, notify_on_open: this._notifyOnOpen ? 1 : 0 };

    if (this._shareMode === 'secure') {
      // A secure share must carry at least one protection layer.
      if (!this._requireEmail && !this._requirePassword) {
        Butler.say(LOCALE.SECURE_SHARE_SELECT_PROTECTION);
        return;
      }

      if (this._requireEmail) {
        payload.require_email = true;
        // Auto-confirm any text still sitting in the chips input (user typed but
        // didn't press Enter before clicking "Get link").
        if (this._chipsInput) {
          const inputEl = this._chipsInput.el.querySelector('input');
          if (inputEl && inputEl.value.trim()) {
            this._addEmailChip();
            // _addEmailChip clears the input ONLY when the value was a valid email/
            // domain. Leftover text means it was invalid — block creation so we don't
            // silently drop the intended restriction and publish an any-email link.
            if (inputEl.value.trim()) {
              Butler.say(LOCALE.INVALID_EMAIL);
              return;
            }
          }
        }
        // "Require email to view" must restrict to at least one allowed email/domain;
        // with an empty list the gate would accept ANY email (a cosmetic, non-real
        // gate). Block creation and prompt the sender to add one (per Lexis 2026-06-14).
        if (!this._emailChips.length) {
          Butler.say(LOCALE.SECURE_SHARE_REQUIRE_ALLOWED_EMAIL);
          return;
        }
        payload.allowed_emails = this._emailChips;
      }

      if (this._requirePassword) {
        const password = this._createPasswordInput
          ? (this._createPasswordInput.el.querySelector('input')?.value || '').trim()
          : '';
        if (!password) {
          Butler.say(LOCALE.SECURE_SHARE_PASSWORD_REQUIRED_CREATE);
          return;
        }
        payload.password = password;
      }
    }
    // Public mode → no email/password gate; a plain shareable link.

    const data = await this.postService(SERVICE.secure_share.create, payload);

    if (data && data.link) {
      this.mset({ link: data.link });
      if (this._linkResult) {
        const pfx   = this.fig.family;
        const token = data.id || data.token;
        // Figma link-generated row: truncated link + copy icon + red Revoke.
        this._linkResult.el.dataset.mode = _a.open;
        this._linkResult.feed(Skeletons.Box.X({
          className : `${pfx}__link-row`,
          kids      : [
            // Figma: brand-tinted box holding [link glyph + URL] on the left and
            // the copy icon pinned to the right (space-between).
            Skeletons.Box.X({
              className : `${pfx}__link-box`,
              kids      : [
                Skeletons.Box.X({
                  className : `${pfx}__link-main`,
                  kids      : [
                    Skeletons.Image.Svg({ className: `${pfx}__link-icon`, ico: 'apps-link-simple' }),
                    Skeletons.Note({ className: `${pfx}__link-text`, content: data.link }),
                  ]
                }),
                Skeletons.Button.Svg({
                  ico       : 'apps-copy',
                  className : `${pfx}__copy-icon`,
                  service   : 'copy-secure-link',
                  link      : data.link,
                  uiHandler : [this],
                }),
              ]
            }),
            Skeletons.Box.X({
              className : `${pfx}__link-revoke button`,
              service   : 'revoke-secure-share',
              token,
              uiHandler : [this],
              kidsOpt   : { active: 0 },
              kids      : [
                Skeletons.Image.Svg({ className: `${pfx}__link-revoke-icon`, ico: 'app-ban' }),
                Skeletons.Note({ content: LOCALE.SECURE_SHARE_REVOKE })
              ]
            })
          ]
        }));
      }
      this._loadShares();
      // Keep the user's setup visible after Get-link (per Lexis 2026-06-14) so they
      // can see what they configured and add more; previously _resetForm() wiped it.
      // State is per-window-instance, so it naturally clears when the panel is closed.
    }
  }

  // Clear all form inputs and reset state after a successful create
  _resetForm() {
    const pfx = this.fig.family;

    // Reset capability set → implicit can_view (no button selected)
    this._capabilities.clear();
    this.el.querySelectorAll(`.${pfx}__perm-btn`).forEach(btn => {
      btn.dataset.selected = '';
    });

    // Reset share mode → Public, hide and clear the secure options
    this._shareMode = 'public';
    this.el.querySelectorAll(`.${pfx}__mode-option`).forEach(opt => {
      opt.dataset.selected = (opt.dataset.mode === 'public') ? 'yes' : '';
    });
    if (this._secureOptions) this._secureOptions.el.dataset.mode = _a.closed;
    this._resetSecureOptions();

    // Reset expiry → toggle off, collapse options, clear preset/date
    this._customExpiryDate = null;
    this._expiryPreset = null;
    this._expiryOn = false;
    const expiryToggle = this.el.querySelector(`.${pfx}__toggle`);
    if (expiryToggle) expiryToggle.dataset.on = '';
    const expiryOptions = this.el.querySelector(`.${pfx}__expiry-options`);
    if (expiryOptions) expiryOptions.dataset.mode = _a.closed;
    this.el.querySelectorAll(`.${pfx}__preset`).forEach(btn => {
      btn.dataset.selected = '';
    });
    if (this._customExpiry) this._customExpiry.el.dataset.mode = _a.closed;

    // Reset notify-on-open → ON (default)
    this._notifyOnOpen = true;
    const notifyToggle = this.el.querySelector(`.${pfx}__notify-row .${pfx}__toggle`);
    if (notifyToggle) notifyToggle.dataset.on = 'yes';
  }

  async _revokeShare(cmd) {
    const token  = cmd.mget(_a.token);
    const hub_id = this.mget(_a.hub_id);
    await this.postService(SERVICE.secure_share.revoke, { token, hub_id });
    // Figma revoke → disable: the generated-link row collapses and "Get link"
    // reappears. Harmless when revoking from a share-list row (already closed).
    if (this._linkResult) this._linkResult.el.dataset.mode = _a.closed;
    this._loadShares();
  }

  _copyLink(cmd) {
    const link = cmd.mget('link') || this.mget('link');
    if (!link) return;
    copyToClipboard(link);
  }

  _showApprovePopup(request) {
    this.mset({ _pendingRequest: request });
    // Default the grant to the level the recipient requested (Figma pre-selects
    // it), so Approve works immediately; the sender can still pick another level.
    this._grantLevel = (request && request.requested_level) || null;
    const overlay = this.__approveOverlay;
    if (!overlay) return;
    overlay.feed(require('./skeleton/approve-access')(this));
    overlay.el.dataset.mode = _a.open;
  }

  _closeApprovePopup() {
    const overlay = this.__approveOverlay;
    if (!overlay) return;
    overlay.el.dataset.mode = _a.closed;
    overlay.clear();
    this._grantLevel     = null;
    this._pendingRequest = null;
    this.mset({ _resultOutcome: null });
  }

  _selectGrantLevel(cmd) {
    const level = cmd.mget('level');
    this._grantLevel = level;
    const overlay = this.__approveOverlay;
    if (overlay) {
      overlay.el.querySelectorAll('[data-level]').forEach(btn => {
        btn.dataset.selected = (btn.dataset.level === level) ? 'yes' : '';
      });
    }
  }

  async _approveRequest() {
    const req = this.mget('_pendingRequest') || {};
    const requestId = req.request_id || req.id;
    if (!requestId || !this._grantLevel) return;
    const grantLevel = this._grantLevel;
    const hub_id = this.mget(_a.hub_id);
    try {
      await this.postService(SERVICE.secure_share.respond_to_access_request, {
        hub_id,
        request_id   : requestId,
        action       : 'approve',
        granted_level: grantLevel,
      });
    } catch (e) {
      this.warn('[secure_share] approve request failed:', e && e.message);
      return this._closeApprovePopup();
    }
    this._loadAccessEvents();
    // Figma 65/66: show the "Access granted" confirmation with the effective level.
    this._showResultModal(grantLevel);
  }

  async _denyRequest() {
    const req = this.mget('_pendingRequest') || {};
    const requestId = req.request_id || req.id;
    if (!requestId) return;
    const hub_id = this.mget(_a.hub_id);
    try {
      await this.postService(SERVICE.secure_share.respond_to_access_request, {
        hub_id,
        request_id: requestId,
        action    : 'deny',
      });
    } catch (e) {
      this.warn('[secure_share] deny request failed:', e && e.message);
      return this._closeApprovePopup();
    }
    // Figma 64: show the "Access Denied" (view only) confirmation.
    this._showResultModal('denied');
  }

  // Figma 64/65/66 — post-decision confirmation modal. Rendered into the same
  // approve overlay (kept open) so it stacks over the dimmed backdrop. Keeps
  // `_pendingRequest` so "Change permission" can reopen the approve popup.
  _showResultModal(outcome) {
    this.mset({ _resultOutcome: outcome });
    const overlay = this.__approveOverlay;
    if (!overlay) return this._closeApprovePopup();
    overlay.feed(require('./skeleton/access-result')(this));
    overlay.el.dataset.mode = _a.open;
  }

}

__window_secure_share.initClass();
module.exports = __window_secure_share;
