
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
    this._expiryPreset = null;
    this.declareHandlers();
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
  }

  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;
    if (service === 'share.track_event') {
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
      case 'custom-expiry':
        return this._customExpiry = child;
      case 'share-list':
        this._shareList = child;
        this._loadShares();
        return;
      case 'link-result':
        return this._linkResult = child;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case 'create-secure-share':
        return this._createShare();
      case 'expiry-preset':
        return this._selectPreset(cmd);
      case 'copy-secure-link':
        return this._copyLink(cmd);
      case 'revoke-secure-share':
        return this._revokeShare(cmd);
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

    const email = this._emailInput ? (this._emailInput.getData().value || '').trim() : '';
    if (!email) {
      if (this._emailInput) this._emailInput.showError(LOCALE.SECURE_SHARE_ENTER_EMAIL);
      return;
    }
    if (!Validator.email(email)) {
      if (this._emailInput) this._emailInput.showError(LOCALE.INVALID_EMAIL);
      return;
    }

    const nid              = this.mget(_a.nid);
    const hub_id           = this.mget(_a.hub_id);
    const domain_restriction = this._domainInput ? (this._domainInput.getData().value || '') : '';
    const password         = this._createPasswordInput
      ? (this._createPasswordInput.getData().value || '').trim()
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

    const payload = { nid, hub_id, email, domain_restriction, days, hours };
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

  // Clear all form inputs and preset state after a successful create
  _resetForm() {
    [this._emailInput, this._domainInput, this._createPasswordInput, this._daysInput, this._hoursInput].forEach(ref => {
      if (ref) {
        const input = ref.el.querySelector('input');
        if (input) input.value = '';
      }
    });
    this._expiryPreset = null;
    this.el.querySelectorAll(`.${this.fig.family}__preset`).forEach(btn => {
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

}

__window_secure_share.initClass();
module.exports = __window_secure_share;
