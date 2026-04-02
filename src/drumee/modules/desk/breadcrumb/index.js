/* ==================================================================== *
 * desk_breadcrumb — Desk-level breadcrumb widget
 * Listens to RADIO_BROADCAST "breadcrumb:update" emitted by window/core.js
 * whenever the active window navigates, and renders the path.
 * ==================================================================== */

class __desk_breadcrumb extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._sourceWindow = null;
    this._updateBreadcrumb = this._updateBreadcrumb.bind(this);
    this._onWindowClosed= this._onWindowClosed.bind(this);
    this._onWindowRaised= this._onWindowRaised.bind(this);
    RADIO_BROADCAST.on("breadcrumb:update", this._updateBreadcrumb);
  }

  /**
   *
   */
  onDestroy() {
    RADIO_BROADCAST.off("breadcrumb:update", this._updateBreadcrumb);
  }

  /**
   * 
   */
  _onWindowClosed() {
    let w = Wm.getActiveWindow()
    let { nid, hub_id, actual_home_id, filetype } = w.model.toJSON()
    this.debug("AAA:37", w, { nid, hub_id, actual_home_id, filetype })
    switch (filetype) {
      case _a.hub:
        this.fetchService(SERVICE.media.get_path, { nid: actual_home_id, hub_id }).then((data) => {
          this.debug("AAA:41", data)
          this.feed(require('./skeleton')(this, data));
        })
        break;
      case _a.folder:
        this.fetchService(SERVICE.media.get_path, { nid, hub_id }).then((data) => {
          this.debug("AAA:47", data)
          this.feed(require('./skeleton')(this, data));
        })
        break;
    }
  }

  /**
   * 
   */
  _onWindowRaised(media) {
    if (!media) return
    let { nid, hub_id, actual_home_id, filetype } = media.model.toJSON()
    this.debug("AAA:37", media, { nid, hub_id, actual_home_id, filetype })
    switch (filetype) {
      case _a.hub:
        this.fetchService(SERVICE.media.get_path, { nid: actual_home_id, hub_id }).then((data) => {
          this.debug("AAA:41", data)
          this.feed(require('./skeleton')(this, data));
        })
        break;
      case _a.folder:
        this.fetchService(SERVICE.media.get_path, { nid, hub_id }).then((data) => {
          this.debug("AAA:47", data)
          this.feed(require('./skeleton')(this, data));
        })
        break;
    }

  }

  /**
   * Called whenever an active window updates its navigation path.
   * @param {Array}  data   - Array of path items (same format as buildBreadcrumbs)
   * @param {Object} source - The window widget that triggered the broadcast
   */
  _updateBreadcrumb(data = [], source) {
    this.debug("AAA:34", data)
    switch (data.event) {
      case _a.closed:
        return this._onWindowClosed()
      case _a.raised:
        return this._onWindowRaised(data.media)
    }
    this.feed(require('./skeleton')(this, data));
  }
}

module.exports = __desk_breadcrumb;
