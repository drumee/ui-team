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
    this._onWindowClosed = this._onWindowClosed.bind(this);
    this._onWindowRaised = this._onWindowRaised.bind(this);
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
   * @param {*} data 
   */
  _buildContent(data) {
    this.debug("AAA:45 _buildContent", data)
    this._data = data;
    this.feed(require('./skeleton')(this, data));
  }

  /**
   * 
   */
  _loadDefault() {
    this._buildContent({
      filename: LOCALE.HOME,
      hub_id: Wm.mget(_a.hub_id),
      nid: Wm.mget(_a.home_id),
      pid: Wm.mget(_a.home_id),
      filepath: "/"
    })
  }
  /**
   * 
   */
  onDomRefresh() {
    this._loadDefault()
  }

  /**
   * 
   */
  _onWindowClosed() {
    let w = Wm.getActiveWindow()
    let { nid, hub_id, actual_home_id, filetype } = w.model.toJSON()
    this.debug("AAA:64", w, { nid, hub_id, actual_home_id, filetype })
    switch (filetype) {
      case _a.hub:
        return this.fetchService(SERVICE.media.get_path, { nid: actual_home_id, hub_id }).then((data) => {
          this._buildContent(data)
        })
      case _a.folder:
        return this.fetchService(SERVICE.media.get_path, { nid, hub_id }).then((data) => {
          this._buildContent(data)
        })
    }
    if (w === Wm) {
      this._loadDefault()
    }
  }

  /**
   * 
   */
  _onWindowRaised(media) {
    if (!media) return
    let { nid, hub_id, actual_home_id, filetype } = media.model.toJSON()
    this.debug("AAA:86", media, { nid, hub_id, actual_home_id, filetype })
    switch (filetype) {
      case _a.hub:
        this.fetchService(SERVICE.media.get_path, { nid: actual_home_id, hub_id }).then((data) => {
          this.debug("AAA:91", data)
          this._buildContent(data)
        })
        break;
      case _a.folder:
        this.fetchService(SERVICE.media.get_path, { nid, hub_id }).then((data) => {
          this.debug("AAA:97", data)
          this._buildContent(data)
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
      case _a.home:
        return this._loadDefault();
      case _a.raised:
        return this._onWindowRaised(data.media)
    }
    this._buildContent(data)
  }


  /**
   * Navigate the active window to the breadcrumb item node.
   * @param {View} cmd - The breadcrumb item view (has nid, hub_id, filetype in model)
   */
  _browse(cmd) {
    let w = Wm.getActiveWindow();
    switch (cmd.mget(_a.filetype)) {
      case _a.hub:
      case _a.folder:
        let data = []
        let nid = cmd.mget(_a.nid);
        let hub_id = cmd.mget(_a.hub_id);
        for (let item of this._data) {
          data.push(item)
          if (item.nid == nid && item.hub_id == hub_id) {
            break;
          }
        }
        if (data.length) {
          this._buildContent(data)
        }
        return w.openNode(cmd);
    }
  }

  /**
  * @param {*} cmd 
  * @param {*} args 
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    this.debug("AAA:116", service, cmd)
    switch (service) {
      case "breadcrum-jump":
        return this._browse(cmd);
    }
  }

}

module.exports = __desk_breadcrumb;
