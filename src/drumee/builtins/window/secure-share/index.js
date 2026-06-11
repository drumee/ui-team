
const { copyToClipboard } = require('@drumee/ui-essentials');
const mfsInteract = require('../interact');

class __window_secure_share extends mfsInteract {

  static initClass() {
    this.prototype.figName = 'window_secure_share';
    this.prototype.size = { width: 480, height: 600, minWidth: 420, minHeight: 420 };
  }

  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    if (this.style.get(_a.left) == null) {
      this.style.set({ left: (window.innerWidth / 2) - (this.size.width / 2) });
    }
    if (this.style.get(_a.top) == null) {
      this.style.set({ top: (window.innerHeight / 2) - (this.size.height / 2) });
    }
    this.style.set({ width: this.size.width, height: this.size.height });
    this._expiryPreset    = null;
    this._permissionLevel = 'can_view';
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
    const { service } = options || svc;
    if (service === 'share.track_event') {
      if (data && data.event === 'secure_share_access_requested') {
        this._showApprovePopup(data);
      }
      this._loadShares();
      return;
    }
    if (super.onWsMessage) super.onWsMessage(svc, data, options);
  }

  onDomRefresh() {
    this.feed(require('./skeleton/main')(this));
    this.raise();
    this.setupInteract();
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'ref-email':
        return this._emailInput = child;
      case 'ref-domain':
        return this._domainInput = child;
      case 'ref-days':
        return this._daysInput = child;
      case 'ref-hours':
        return this._hoursInput = child;
      case 'ref-create-password':
        return this._createPasswordInput = child;
      case 'chips-container':
        return this._chipsContainer = child;
      case 'ref-chips-input':
        return this._chipsInput = child;
      case 'custom-expiry':
        return this._customExpiry = child;
      case 'share-list':
        this._shareList = child;
        this._loadShares();
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
      case 'toggle-require-email':
        return this._toggleRequireEmail();
      case 'toggle-require-password':
        return this._toggleRequirePassword();
      case 'add-email-chip':
        return this._addEmailChip();
      case 'remove-email-chip':
        return this._removeEmailChip(cmd);
      case 'expiry-preset':
        return this._selectPreset(cmd);
      case 'copy-secure-link':
        return this._copyLink(cmd);
      case 'revoke-secure-share':
        return this._revokeShare(cmd);
      case 'select-grant-level':
        return this._selectGrantLevel(cmd);
      case 'approve-access-request':
        return this._approveRequest();
      case 'deny-access-request':
        return this._denyRequest();
      case 'close-approve-popup':
        return this._closeApprovePopup();
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
  }

  _selectPermission(cmd) {
    const level = cmd.mget('level');
    if (!level) return;
    this._permissionLevel = level;
    this.el.querySelectorAll(`.${this.fig.family}__perm-btn`).forEach(btn => {
      btn.dataset.selected = (btn.dataset.level === level) ? 'yes' : '';
    });
  }

  _toggleRequireEmail() {
    this._requireEmail = !this._requireEmail;
    const toggle = this.el.querySelector(`.${this.fig.family}__toggle[data-for='require-email']`);
    if (toggle) toggle.dataset.on = this._requireEmail ? 'yes' : '';
    const gate = this.el.querySelector(`.${this.fig.family}__email-gate`);
    if (gate) gate.dataset.mode = this._requireEmail ? _a.open : _a.closed;
    if (!this._requireEmail) {
      this._emailChips = [];
      this._renderChips();
    }
  }

  _toggleRequirePassword() {
    this._requirePassword = !this._requirePassword;
    const toggle = this.el.querySelector(`.${this.fig.family}__toggle[data-for='require-password']`);
    if (toggle) toggle.dataset.on = this._requirePassword ? 'yes' : '';
    const gate = this.el.querySelector(`.${this.fig.family}__password-gate`);
    if (gate) gate.dataset.mode = this._requirePassword ? _a.open : _a.closed;
    if (!this._requirePassword && this._createPasswordInput) {
      const input = this._createPasswordInput.el.querySelector('input');
      if (input) input.value = '';
    }
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

  _renderShareList(rows) {
    if (!this._shareList) return;
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

  async _createShare() {
    if (this._linkResult) this._linkResult.el.dataset.mode = _a.closed;

    const nid    = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);

    const password = this._requirePassword && this._createPasswordInput
      ? (this._createPasswordInput.el.querySelector('input')?.value || '').trim()
      : '';

    // Derive days/hours from selected preset
    let days = 0, hours = 0;
    switch (this._expiryPreset) {
      case '1h':    hours = 1; break;
      case '24h':   days  = 1; break;
      case '7d':    days  = 7; break;
      case 'custom':
        days  = this._daysInput  ? (parseInt(this._daysInput.getData().value)  || 0) : 0;
        hours = this._hoursInput ? (parseInt(this._hoursInput.getData().value) || 0) : 0;
        break;
      default:
        break; // no preset selected = no expiry
    }

    const payload = { nid, hub_id, permission_level: this._permissionLevel, days, hours };
    if (this._requireEmail) {
      // Auto-confirm any text still sitting in the chips input (user typed but
      // didn't press Enter before clicking "Get link").
      if (this._chipsInput) {
        const inputEl = this._chipsInput.el.querySelector('input');
        if (inputEl && inputEl.value.trim()) this._addEmailChip();
      }
      if (!this._emailChips.length) {
        Butler.say(LOCALE.SECURE_SHARE_EMAIL_REQUIRED);
        return;
      }
    }
    if (this._requireEmail && this._emailChips.length) payload.allowed_emails = this._emailChips;
    if (password) payload.password = password;

    const data = await this.postService(SERVICE.secure_share.create, payload);

    if (data && data.link) {
      this.mset({ link: data.link });
      if (this._linkResult) {
        this._linkResult.el.dataset.mode = _a.open;
        this._linkResult.feed(Skeletons.Box.X({
          className : `${this.fig.family}__link-row`,
          kids      : [
            Skeletons.Note({ className: `${this.fig.family}__link-text`, content: data.link }),
            Skeletons.Box.X({
              className : `${this.fig.family}__copy-button button`,
              service   : 'copy-secure-link',
              uiHandler : [this],
              kidsOpt   : { active: 0 },
              kids      : [
                Skeletons.Note({ content: LOCALE.COPY })
              ]
            })
          ]
        }));
      }
      this._loadShares();
      this._resetForm();
    }
  }

  // Clear all form inputs and reset state after a successful create
  _resetForm() {
    const pfx = this.fig.family;

    // Reset permission level → back to default 'can_view'
    this._permissionLevel = 'can_view';
    this.el.querySelectorAll(`.${pfx}__perm-btn`).forEach(btn => {
      btn.dataset.selected = (btn.dataset.level === 'can_view') ? 'yes' : '';
    });

    // Reset email toggle + gate
    this._requireEmail = false;
    this._emailChips   = [];
    const emailToggle = this.el.querySelector(`.${pfx}__toggle[data-for='require-email']`);
    if (emailToggle) emailToggle.dataset.on = '';
    const emailGate = this.el.querySelector(`.${pfx}__email-gate`);
    if (emailGate) emailGate.dataset.mode = _a.closed;
    this._renderChips();

    // Reset password toggle + gate + input
    this._requirePassword = false;
    const pwToggle = this.el.querySelector(`.${pfx}__toggle[data-for='require-password']`);
    if (pwToggle) pwToggle.dataset.on = '';
    const pwGate = this.el.querySelector(`.${pfx}__password-gate`);
    if (pwGate) pwGate.dataset.mode = _a.closed;
    if (this._createPasswordInput) {
      const input = this._createPasswordInput.el.querySelector('input');
      if (input) input.value = '';
    }

    // Reset expiry (unchanged logic)
    [this._daysInput, this._hoursInput].forEach(ref => {
      if (ref) {
        const input = ref.el.querySelector('input');
        if (input) input.value = '';
      }
    });
    this._expiryPreset = null;
    this.el.querySelectorAll(`.${pfx}__preset`).forEach(btn => {
      btn.dataset.selected = '';
    });
    if (this._customExpiry) this._customExpiry.el.dataset.mode = _a.closed;
  }

  async _revokeShare(cmd) {
    const token  = cmd.mget(_a.token);
    const hub_id = this.mget(_a.hub_id);
    await this.postService(SERVICE.secure_share.revoke, { token, hub_id });
    this._loadShares();
  }

  _copyLink(cmd) {
    const link = cmd.mget('link') || this.mget('link');
    if (!link) return;
    copyToClipboard(link);
  }

  _showApprovePopup(request) {
    this.mset({ _pendingRequest: request });
    this._grantLevel = null;
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
    const hub_id = this.mget(_a.hub_id);
    try {
      await this.postService(SERVICE.secure_share.respond_to_access_request, {
        hub_id,
        request_id   : requestId,
        action       : 'approve',
        granted_level: this._grantLevel,
      });
    } catch (e) {
      this.warn('[secure_share] approve request failed:', e && e.message);
    }
    this._closeApprovePopup();
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
    }
    this._closeApprovePopup();
  }

}

__window_secure_share.initClass();
module.exports = __window_secure_share;
