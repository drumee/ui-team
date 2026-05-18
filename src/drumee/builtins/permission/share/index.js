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

  _render() {
    if (this.isDestroyed && this.isDestroyed()) return;
    this.feed(require('./skeleton')(this));
  }

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
    this._dirtyPermission = true;
    this.mset({ privilege });
    this._render();
  }

  _copyLink() {
    const url = this.mget('share_url');
    if (!url) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      // Transient toast (auto-dismisses) — not a popup. Same copy-link
      // acknowledgement window/core.js uses; defaults to ACK_COPY_LINK.
      Wm.acknowledge();
    }
  }

  // A share-area workspace exposes its public URL intrinsically via
  // get_external_room_attr — there is no create-link step like the
  // sharebox outbound flow (sharebox.create_link returns WRONG_API for
  // share hubs). The "Public" toggle therefore just shows/hides the
  // URL the workspace already has.

  _loadSettings() {
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    this.postService(SERVICE.hub.get_external_room_attr, { hub_id })
      .then((data) => {
        if (!data) return;
        const share_url = data.link || '';
        this.mset({
          public_link: share_url ? 1 : 0,
          share_url,
          privilege: data.permission != null ? data.permission : (this.mget(_a.privilege) || 0),
          days: data.days || 0,
          hours: data.hours || 0,
        });
        this._render();
      })
      .catch((e) => this.warn && this.warn('get_external_room_attr failed', e));
  }

  _applyChanges() {
    if (this._applyBusy) return;
    this._applyBusy = 1;
    // Single call with the full state — access level (permission) and
    // expiry (days/hours) must travel together, see _persistSettings.
    this._persistSettings()
      .then(() => {
        this._dirtyPermission = false;
        this._closeSidebar();
      })
      .catch((e) => this.warn && this.warn('apply failed', e))
      .finally(() => { this._applyBusy = 0; });
  }

  // One server round-trip carrying the COMPLETE state. The server's
  // update_external_settings applies BOTH permission and expiry on every
  // call and defaults a missing `permission` to GUEST — so a partial call
  // silently resets the other setting. Always send permission + days +
  // hours together. (`flag` is not read by the server.)
  _persistSettings() {
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return Promise.resolve();
    const permission = this.mget(_a.privilege) || 0;
    const days = parseInt(this.mget(_a.days)) || 0;
    const hours = parseInt(this.mget(_a.hours)) || 0;
    return this.postService(SERVICE.hub.update_external_settings, {
      hub_id,
      permission,
      days,
      hours,
      validity_mode: days || hours ? _a.limited : _a.infinity,
    });
  }

  _setExpiry(days) {
    this._expiryMenuOpen = false;
    this.mset({ days: parseInt(days) || 0, hours: 0 });
    this._render();
    return this._persistSettings()
      .catch((e) => this.warn && this.warn('persist expiry failed', e));
  }

  _clearExpiry() {
    return this._setExpiry(0);
  }

  _closeSidebar() {
    this.el.dataset.position = "out";
    setTimeout(() => this.suppress(), 500);
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  onDomRefresh() {
    this._render();
    setTimeout(() => {
      this.el.dataset.position = "in";
    }, 300);
    this._loadSettings();
  }

  // ── UI events ─────────────────────────────────────────────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case 'toggle-public-link': {
        const current = this.mget('public_link');
        this.mset({ public_link: current ? 0 : 1 });
        return this._render();
      }

      case 'copy-link':
        return this._copyLink();

      case 'toggle-access':
        return this._toggleAccess(cmd);

      case 'set-expiry':
        this._expiryMenuOpen = !this._expiryMenuOpen;
        return this._render();

      case 'pick-expiry':
        return this._setExpiry(cmd.mget('days'));

      case 'clear-expiry':
        return this._clearExpiry();

      case 'apply':
        return this._applyChanges();

      case _e.close:
        return this._closeSidebar();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __permission_share;
