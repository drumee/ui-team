
const mfsInteract = require('../interact');

/**
 * "Get info" details window for a regular file (spec 2026-06-10) — name,
 * type, size, dates, owner, location. Opened from the media context menu
 * (media/interact.js openDetailsWindow), singleton per node.
 */
class __window_media_details extends mfsInteract {

  static initClass() {
    this.prototype.figName = 'window_media_details';
    this.prototype.size = { width: 420, height: 520, minWidth: 360, minHeight: 400 };
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

  async onDomRefresh() {
    // Refresh node attributes so size/dates are current; the preset copied
    // from the grid item may be stale. Render from the local model on failure.
    try {
      const data = await this.fetchService(SERVICE.media.get_node_attr, {
        nid: this.mget(_a.nid),
        hub_id: this.mget(_a.hub_id),
      });
      if (data && !data.error) this.mset(data);
    } catch (e) {
      this.warn('media-details: get_node_attr failed', e);
    }
    this.feed(require('./skeleton')(this));
    this.raise();
    this.setupInteract();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case _e.close:
        return this.goodbye();
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__window_media_details.initClass();
module.exports = __window_media_details;
