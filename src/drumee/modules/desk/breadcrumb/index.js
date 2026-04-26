/* ==================================================================== *
 * desk_breadcrumb — Desk-level breadcrumb widget
 * Listens to RADIO_BROADCAST "breadcrumb:content" emitted by window/core.js
 * whenever the active window navigates, and renders the path.
 * ==================================================================== */
const PROPERTIES = [
  _a.area,
  _a.actual_home_id,
  _a.ctime,
  _a.ext,
  _a.filename,
  _a.filepath,
  _a.filetype,
  _a.filesize,
  _a.home_id,
  _a.hub_id,
  _a.isalink,
  _a.md5Hash,
  _a.metadata,
  _a.mtime,
  _a.nid,
  _a.ownpath,
  _a.pid,
  _a.privilege,
  _a.service,
  _a.status,
]

class __desk_breadcrumb extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._sourceWindow = null;
    this._onWindowClosed = this._onWindowClosed.bind(this);
    this._onBrowse = this._onBrowse.bind(this);
    this._updateContent = this._updateContent.bind(this);
    this._updateContext = this._updateContext.bind(this);
    RADIO_BROADCAST.on("breadcrumb:content", this._updateContent);
    RADIO_BROADCAST.on("breadcrumb:context", this._updateContext);
  }

  /**
   *
   */
  onDestroy() {
    RADIO_BROADCAST.off("breadcrumb:content", this._updateContent);
    RADIO_BROADCAST.off("breadcrumb:context", this._updateContext);
  }

  /**
   * 
   * @param {*} data 
   */
  _buildContent(data) {
    this.debug("AAA:45 _buildContent", data)
    if (_.isEmpty(data)) {
      this._data = [];
      this.ensurePart(_a.content).then((p) => {
        p.clear();
      })
      this.ensurePart(_a.context).then((p) => p.el.dataset.current = 1);
      return
    }
    this._data = data;
    this.ensurePart(_a.context).then((p) => p.el.dataset.current = 0);
    this.ensurePart(_a.content).then((p) => {
      const normalized = this._normalizeData(data);
      const items = [];
      normalized.forEach((item, i) => {
        if (item && (item.filename || item.name)) {
          items.push({ ...item, kind: "desk_breadcrumb_item", service: "breadcrum-jump", isCurrent: i === normalized.length - 1 });
        }
      });
      p.feed(items);
    })
  }


  /**
   * 
   */
  _loadDefault() {
    this._updateContext({
      filename: LOCALE.HOME,
      hub_id: Wm.mget(_a.hub_id),
      nid: Wm.mget(_a.home_id),
      pid: Wm.mget(_a.home_id),
      filepath: "/",
      service: "load-home"
    })
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this))
    this._loadDefault()
  }

  /**
   * 
   */
  _updatePath(nid, hub_id) {
    if (!nid || !hub_id) {
      this.warn("Require node data")
      return;
    }
    this.fetchService(SERVICE.media.get_path, { nid, hub_id }).then((data) => {
      if (_.isEmpty(data)) return;
      this._buildContent(data)
      let { hub_name, home_id, hub_id, nid } = data[0]
      this.debug("AAA:124", this.__context.mget(_a.hub_id), { hub_name, home_id, hub_id, nid })
      if (this.__context.mget(_a.hub_id) !== hub_id) {
        let filename = (hub_name || LOCALE.HOME)
        this.__context.mset({
          filename, home_id, hub_id, nid
        })
        this.__context.set({
          content: filename
        })
      }
    })
  }

  /**
   * 
   */
  _onWindowClosed() {
    let w = Wm.getActiveWindow()
    if (w === Wm) {
      this._loadDefault()
      return;
    }

    let { nid, hub_id, actual_home_id, filetype } = w.model.toJSON();
    if (filetype == _a.hub && actual_home_id) nid = actual_home_id
    this._updatePath(nid, hub_id)
  }


  /**
   * 
   */
  _onBrowse(data) {
    let { nid, hub_id, actual_home_id, filetype } = data;
    this.debug("AAA:156 _onBrowse", data, { nid, hub_id, actual_home_id, filetype })
    if (filetype == _a.hub && actual_home_id) nid = actual_home_id
    this._updatePath(nid, hub_id)
  }

  /**
   * Called whenever an active window updates its navigation path.
   * @param {Array}  data   - Array of path items (same format as buildBreadcrumbs)
   * @param {Object} source - The window widget that triggered the broadcast
   */
  _updateContent(data = [], source) {
    this.debug("AAA:141 _updateContent", data, source)
    switch (data.event) {
      case _a.closed:
        return this._onWindowClosed()
      case _a.home:
        return this._loadDefault();
    }

    this._onBrowse(data)
  }

  /**
   * Remove unwanted attributes
   */
  _normalizeData(data) {
    let res = []
    let items = data;
    if (!_.isArray(data)) {
      items = [data]
    }
    for (let item of items) {
      let r = {}
      for (let key in item) {
        if (PROPERTIES.includes(key)) {
          r[key] = item[key]
        }
      }
      res.push(r)
    }
    return res;
  }

  /**
   * Called when "breadcrumb:context" is broadcast.
   * Updates the content of the "context" part.
   * @param {Object} context data 
   */
  _updateContext(data) {
    this._context = this._normalizeData(data)[0];
    this.debug("AAA:66 _updateContext", this._context)
    this._buildContent()
    this.ensurePart(_a.context).then((p) => {
      p.mset(this._context)
      p.set({ content: this._context.filename || this._context.name });
    })
  }

  /**
   * Navigate the active window to the breadcrumb item node.
   * @param {View} cmd - The breadcrumb item view (has nid, hub_id, filetype in model)
   */
  _loadActiveWindow(cmd) {
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
        return this._loadActiveWindow(cmd);
      case "load-home":
        this._loadDefault();
        return Wm.reload();
      case "change-workspace":
        this._loadActiveWindow(cmd);
        return this._updateContext(cmd.model.toJSON());
    }
  }

}

module.exports = __desk_breadcrumb;
