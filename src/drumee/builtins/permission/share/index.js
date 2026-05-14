require('./skin');

class __permission_share extends DrumeeMFS {

  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, position: "0" }
    super.initialize(opt);
    this.declareHandlers();
    let m = opt.media;
    if (!m) return;
    this.media = m;
    this.copyPropertiesFrom(m);
  }

  // ── Helpers ───────────────────────────────────────────────────

  _expiryLabel() {
    const days = parseInt(this.mget(_a.days)) || 0;
    if (!days) return LOCALE.NO_EXPIRATION || 'No expiration';
    return days === 1
      ? (LOCALE.IN_1_DAY || 'In 1 Day')
      : `In ${days} Days`;
  }

  _toggleAccess(cmd) {
    const bit = cmd.mget('bit');
    if (!bit) return;
    let privilege = this.mget(_a.privilege) || 0;
    privilege ^= bit;
    this.mset({ privilege });
    this.feed(require('./skeleton')(this));
  }

  _copyLink() {
    const url = this.mget('share_url');
    if (!url) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    setTimeout(() => {
      this.el.dataset.position = "in";
    }, 300)
  }

  // ── UI events ─────────────────────────────────────────────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case 'toggle-public-link': {
        const current = this.mget('public_link');
        this.mset({ public_link: current ? 0 : 1 });
        this.feed(require('./skeleton')(this));
        break;
      }
      case 'copy-link':
        this._copyLink();
        break;

      case 'toggle-access':
        this._toggleAccess(cmd);
        break;

      case 'clear-expiry':
        this.mset({ days: 0, hours: 0 });
        this.feed(require('./skeleton')(this));
        break;

      case 'apply':
        this.triggerHandlers({
          service: 'permission-changed',
          privilege: this.mget(_a.privilege) || 0,
          days: parseInt(this.mget(_a.days)) || 0,
          public_link: this.mget('public_link') ? 1 : 0,
        });
        break;

      case _e.close:
        this.el.dataset.position = "out";
        setTimeout(() => {
          this.suppress();
        }, 500)
        return

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __permission_share;
