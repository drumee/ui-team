
const { copyToClipboard } = require('@drumee/ui-essentials');
const mfsInteract = require('../interact');

class __window_secure_share extends mfsInteract {

  static initClass() {
    this.prototype.figName = 'window_secure_share';
    this.prototype.size = { width: 480, height: 560, minWidth: 420, minHeight: 400 };
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
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton/main')(this));
    this.raise();
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
      case 'copy-secure-link':
        return this._copyLink(cmd);
      case 'revoke-secure-share':
        return this._revokeShare(cmd);
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
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
        content: ''
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
    const days             = this._daysInput  ? (parseInt(this._daysInput.getData().value)  || 0) : 0;
    const hours            = this._hoursInput ? (parseInt(this._hoursInput.getData().value) || 0) : 0;

    const data = await this.postService(SERVICE.secure_share.create, {
      nid, hub_id, email, domain_restriction, days, hours
    });

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
              uiHandler : this,
              kidsOpt   : { active: 0 },
              kids      : [
                Skeletons.Note({ content: LOCALE.COPY })
              ]
            })
          ]
        }));
      }
      this._loadShares();
    }
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
    copyToClipboard(link).then(() => Wm.acknowledge());
  }

}

__window_secure_share.initClass();
module.exports = __window_secure_share;
