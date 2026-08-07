
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
    this._customExpiryDays = 0;
    this._expiryOn         = false;
    this._notifyOnOpen     = true;   // notify the sender when a recipient opens (default ON)
    this._createdToken     = null;   // token of the link generated in this panel session
    this._notifySeq        = 0;      // guards out-of-order notify_on_open responses
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
  // (Figma slide-in). The window lives inside the WM windows-layer, so `left`
  // is relative to that layer (offset from the viewport by the sidebar), NOT
  // the viewport. We can't derive `left` from Wm.$el.width(): off-screen
  // slide-out panels (chat / address-book, parked at right:-880px) inflate the
  // reported WM width, which pushed the dock's right edge PAST the viewport so
  // its right side (padding + the recipient toggles) got clipped. Instead,
  // anchor the panel's RIGHT edge to the real viewport edge and translate that
  // into layer coordinates by subtracting the layer's own viewport offset.
  _applyRightDock() {
    const wm    = (typeof Wm !== 'undefined' && Wm.$el) ? Wm.$el : null;
    const areaH = wm ? wm.height() : window.innerHeight;
    const width = Math.min(this._dockWidth || 450, window.innerWidth);

    // Apply size first so the element reflows before we read its real box.
    this.style.set({ width, height: areaH, top: 0 });
    if (this.el) {
      this.$el.css({ width: `${width}px`, height: `${areaH}px`, top: '0px' });
    }

    // offsetParent = the windows-layer (or null when the window is fixed, in
    // which case coordinates are already viewport-relative → offset 0).
    // realW guards against a min-width / base sizing overriding our 450.
    const layer     = this.el && this.el.offsetParent ? this.el.offsetParent : null;
    const layerLeft = layer ? layer.getBoundingClientRect().left : 0;
    const realW     = this.el ? (this.el.getBoundingClientRect().width || width) : width;
    const left      = Math.max(0, window.innerWidth - realW - layerLeft);

    this.style.set({ left });
    if (this.el) {
      this.$el.css({ left: `${left}px` });
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
      case 'access-events-label':
        return this._accessEventsLabel = child;
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
    if (preset !== 'custom') {
      this._customExpiryDays = 0;
      this._renderCustomDays();
    }
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
      this._customExpiryDays = 0;
      this._renderCustomDays();
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
    // The flip above stays local and instant, and still seeds the NEXT create.
    // But this row sits BELOW the Get-link button, so once a link exists the
    // preference belongs to THAT link and has to be persisted: notify_on_open
    // used to be create-time only, so turning the toggle off after pressing
    // Get link changed nothing and the sender kept being notified.
    if (this._createdToken) this._persistNotifyOnOpen(this._createdToken);
  }

  /**
   * Persist the notify-on-open preference for a link that already exists.
   * Reverts the switch when the server did not store what we asked for, so the
   * panel can never show "off" while the sender is still being notified — that
   * mismatch is the whole bug. Fire-and-forget: the toggle already moved.
   */
  async _persistNotifyOnOpen(token) {
    const intended = this._notifyOnOpen ? 1 : 0;
    const seq      = ++this._notifySeq;
    let stored;
    try {
      const res = await this.postService(SERVICE.secure_share.set_notify_on_open, {
        token,
        hub_id         : this.mget(_a.hub_id),
        notify_on_open : intended,
      });
      // postService resolves undefined on a transport failure (it routes through
      // onServerComplain rather than throwing), so treat anything that is not an
      // explicit OK as "did not persist".
      stored = res?.status === 'OK' ? Number(res.notify_on_open) : undefined;
    } catch (e) {
      // stored stays undefined → treated as "did not persist" below.
      this.warn('[secure_share] set_notify_on_open failed:', e && e.message);
    }
    // A newer click superseded this one — its own response owns the switch.
    if (seq !== this._notifySeq) return;
    if (stored === intended) return;
    // Show the truth: the server's value when it gave one, otherwise the state
    // from before this click (we already flipped it above).
    let truth;
    if (stored === 1)      truth = true;
    else if (stored === 0) truth = false;
    else                   truth = !this._notifyOnOpen;
    this._notifyOnOpen = truth;
    const toggle = this.el.querySelector(`.${this.fig.family}__notify-row .${this.fig.family}__toggle`);
    if (toggle) toggle.dataset.on = this._notifyOnOpen ? 'yes' : '';
    Butler.say(LOCALE.SOMETHING_WENT_WRONG);
  }

  // Custom expiry via the range calendar. The picker reports the span between
  // the start and end date (endDate - startDate) in `durationDays`; that becomes
  // the link's validity in days (the server contract is days/hours → expiry_time).
  // `dpAction` distinguishes a live pick from the footer's Done/Cancel, which
  // dismiss the floating calendar overlay.
  _onExpiryDatePicked(cmd) {
    this._customExpiryDays = cmd.mget('durationDays') || 0;
    // Show the range length (in days) on the Custom preset chip.
    this._renderCustomDays();
    const action = cmd.mget('dpAction');
    if ((action === 'done' || action === 'cancel') && this._customExpiry) {
      this._customExpiry.el.dataset.mode = _a.closed;
    }
  }

  // Fill the Custom preset's day-count chip from the current range length;
  // blank when there's no range yet.
  _renderCustomDays() {
    const el = this.el.querySelector(`.${this.fig.family}__preset-days`);
    if (!el) return;
    const days = this._customExpiryDays || 0;
    el.textContent = days > 0 ? `${days}d` : '';
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

  // The table is keyed on the ACCESS EVENTS themselves — one row per visit — so
  // the visit log is the only list it needs. (It was briefly keyed on links, which
  // additionally fetched secure_share.list for their status and never-opened rows;
  // see the archive memory before reinstating that.)
  async _loadAccessEvents() {
    if (!this._accessEvents) return;
    const nid    = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);
    const events_skl = require('./skeleton/access-events');
    let list = [];
    try {
      const rows = await this.postService(SERVICE.secure_share.list_access_events, { nid, hub_id });
      if (Array.isArray(rows)) list = rows;
    } catch (e) {
      list = [];
    }
    this._accessEvents.feed(events_skl(this, list));
    // Reflect the access count in the toggle header (e.g. "View access list (12)"),
    // mirroring the Shared-links label. Count = rows shown = total access events.
    // Empty/error → plain label (no "(0)"), like Shared-links.
    if (this._accessEventsLabel) {
      this._accessEventsLabel.el.textContent = list.length
        ? `${LOCALE.SECURE_SHARE_VIEW_ACCESS_LIST} (${list.length})`
        : LOCALE.SECURE_SHARE_VIEW_ACCESS_LIST;
    }
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
        // Multi-date selection → validity = lastDate - firstDate (whole days).
        days = this._customExpiryDays || 0;
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
        // The allowed-emails list is OPTIONAL (per Lexis 2026-06-17). Empty → "require
        // email to view" accepts any valid email (Mode 1); one or more chips → restrict
        // to that list/domain (Mode 2). The recipient must still enter a valid email at
        // the gate (format-validated on both the client and the server).
        if (this._emailChips.length) payload.allowed_emails = this._emailChips;
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
      // Remember which link this panel just generated: the notify toggle below
      // the Get-link button belongs to THAT link. Captured outside the
      // _linkResult guard so it is set even if the result row is absent.
      this._createdToken = data.id || data.token || null;
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
    this._customExpiryDays = 0;
    this._expiryPreset = null;
    this._expiryOn = false;
    const expiryToggle = this.el.querySelector(`.${pfx}__toggle`);
    if (expiryToggle) expiryToggle.dataset.on = '';
    const expiryOptions = this.el.querySelector(`.${pfx}__expiry-options`);
    if (expiryOptions) expiryOptions.dataset.mode = _a.closed;
    this._renderCustomDays();
    this.el.querySelectorAll(`.${pfx}__preset`).forEach(btn => {
      btn.dataset.selected = '';
    });
    if (this._customExpiry) this._customExpiry.el.dataset.mode = _a.closed;

    // Reset notify-on-open → ON (default). Drop the tracked link too, so the
    // reset toggle seeds the next create instead of writing to the old link.
    this._notifyOnOpen = true;
    this._createdToken = null;
    const notifyToggle = this.el.querySelector(`.${pfx}__notify-row .${pfx}__toggle`);
    if (notifyToggle) notifyToggle.dataset.on = 'yes';
  }

  // Single revoke path for the whole panel: the access table's per-link Revoke,
  // and the just-generated link's own Revoke. Revoking cuts EVERYONE using that
  // link, so the confirmation says so — previously nothing on screen acknowledged
  // the action at all, which is what made a revoke that had worked look like a
  // no-op.
  async _revokeShare(cmd) {
    const token  = cmd.mget(_a.token);
    if (!token) return;
    const hub_id = this.mget(_a.hub_id);
    const res = await this.postService(SERVICE.secure_share.revoke, { token, hub_id });
    if (res && res.revoked_at) {
      Butler.say(LOCALE.SECURE_SHARE_LINK_REVOKED);
    } else {
      Butler.say(LOCALE.SOMETHING_WENT_WRONG);
    }
    // Figma revoke → disable: the generated-link row collapses and "Get link"
    // reappears. Harmless when revoking from a share-list row (already closed).
    if (this._linkResult) this._linkResult.el.dataset.mode = _a.closed;
    // Stop tracking a link that no longer exists, so the notify toggle goes back
    // to seeding the next create rather than writing to a revoked token.
    if (this._createdToken && this._createdToken === token) this._createdToken = null;
    this._loadShares();
    this._loadAccessEvents();
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
