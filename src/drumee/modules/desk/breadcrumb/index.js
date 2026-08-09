/* ==================================================================== *
 * desk_breadcrumb — Desk-level breadcrumb widget
 * Listens to RADIO_BROADCAST "breadcrumb:content" emitted by window/core.js
 * whenever the active window navigates, and renders the path.
 * ==================================================================== */
const { getPath } = require("libs/path-request");

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
   */
  onPartReady(child, pn) {
    if (pn === _a.context) {
      this.__context = child;
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Always render as: Home › <path items>. The first crumb is the permanent
   * "Home" anchor (rendered in the __context slot). The rest are appended into
   * the __content slot from the supplied data.
   * @param {*} data
   */
  _buildContent(data) {
    this.ensurePart(_a.context).then((p) => {
      p.el.dataset.current = _.isEmpty(data) ? 1 : 0;
      p.el.style.display = "";
    });
    if (_.isEmpty(data)) {
      this._data = [];
      this.ensurePart(_a.content).then((p) => {
        p.clear();
      })
      return
    }
    this._data = data;
    this.ensurePart(_a.content).then((p) => {
      // mfs_get_path returns the workspace's root with filename "/" (or empty).
      // Substitute the workspace's display name (hub_name) so the breadcrumb
      // reads Home › <Workspace> › <Folder> instead of Home › / › <Folder>.
      const hubName = (data[0] && (data[0].hub_name || data[0].name)) || null;
      const normalized = this._normalizeData(data);
      const items = [];
      normalized.forEach((item, i) => {
        let filename = item && (item.filename || item.name);
        if ((!filename || filename === "/" || filename === "") && i === 0 && hubName) {
          filename = hubName;
          // Treat the workspace root as a hub so clicking it re-opens the
          // workspace via the hub branch of _loadActiveWindow.
          item.filetype = _a.hub;
        }
        if (filename) {
          items.push({
            ...item,
            filename,
            kind: "desk_breadcrumb_item",
            service: "breadcrum-jump",
            isCurrent: i === normalized.length - 1,
          });
        }
      });
      p.feed(items);
    })
  }


  /**
   * Reset to the Home anchor (no path items, context highlighted).
   */
  loadDefault(reload = 1) {
    this._buildContent();
    this.ensurePart(_a.context).then((p) => {
      p.mset({
        filename: LOCALE.HOME,
        hub_id: Wm.mget(_a.hub_id),
        nid: Wm.mget(_a.home_id),
        pid: Wm.mget(_a.home_id),
        filepath: "/",
        service: "load-home",
      });
      p.set({ content: LOCALE.HOME });
      p.el.dataset.current = 1;
    });
    if (reload) Desk.loadHome()
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this))
    this.loadDefault()
  }

  /**
   * Resolve a node's full path (workspace → folders) and render it after Home.
   * Home stays anchored as the leftmost crumb.
   */
  _updatePath(nid, hub_id) {
    if (!nid || !hub_id) {
      this.warn("Require node data")
      return;
    }
    // Shared in-flight request: Wm.loadWorkspace asks for this exact path in
    // the same instant on a folder open (libs/path-request).
    getPath(this, { nid, hub_id }).then((data) => {
      if (_.isEmpty(data)) return;
      this._buildContent(data)
    })
  }

  /**
   *
   */
  _onWindowClosed() {
    let w = Wm.getActiveWindow()
    if (w === Wm) {
      this.loadDefault()
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
    if (filetype == _a.hub && actual_home_id) nid = actual_home_id
    this._updatePath(nid, hub_id)
  }

  /**
   * Called whenever a window updates its navigation path.
   * The breadcrumb reflects the DESK CONTAINER's current node, not the
   * active folder window. So:
   *  - `event: _e.closed` (a folder window was closed): IGNORE — the desk
   *    container did not change.
   *  - `event: _e.home`: reset to Home.
   *  - any other navigation: only update if the source IS the desk container
   *    (Wm itself or its grid). Folder window navigation is private to that
   *    window and must not retitle the breadcrumb.
   * @param {Array}  data   - Array of path items
   * @param {Object} source - The widget that triggered the broadcast
   */
  _updateContent(data = [], source) {
    switch (data.event) {
      case _a.closed:
        return;
      case _a.home:
        return this.loadDefault();
    }
    // Only follow navigation broadcasts that came from the desk container
    // (Wm) or its in-place loadWorkspaceNode flow. Ignore broadcasts that
    // bubble up from open folder/share/etc. windows — those windows have
    // their own internal state and should not retitle the desk breadcrumb.
    if (source && source !== Wm) return;
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
   * Called when "breadcrumb:context" is broadcast (Apps / Settings / Contacts /
   * Trash labels). Render as a single section after the permanent Home anchor
   * so the user always sees Home › <Section>.
   * @param {Object} context data
   */
  _updateContext(data) {
    this._context = this._normalizeData(data)[0];
    const filename = this._context && (this._context.filename || this._context.name);
    if (!filename) return this.loadDefault();
    this._buildContent([{ ...this._context, filename }]);
  }

  /**
   * Navigate the desk's main container (Wm grid) to the breadcrumb item node.
   * The currently-open folder window is NOT touched. Clicking a folder/file
   * icon inside that window keeps its existing in-place / new-window behavior.
   * @param {View} cmd - The breadcrumb item view (has nid, hub_id, filetype)
   */
  _loadActiveWindow(cmd) {
    const filetype = cmd.mget(_a.filetype);
    if (filetype !== _a.hub && filetype !== _a.folder) return;

    // Crop breadcrumb path up to and including the clicked crumb.
    const nid = cmd.mget(_a.nid);
    const hub_id = cmd.mget(_a.hub_id);
    const data = [];
    for (const item of this._data) {
      data.push(item);
      if (item.nid == nid && item.hub_id == hub_id) break;
    }
    if (data.length) this._buildContent(data);

    // Drive Wm's main grid in-place. We bypass Wm.loadWorkspaceNode because
    // it clears the windowsLayer; the breadcrumb spec is to leave already-open
    // folder windows alone.
    if (!Wm) return;
    Wm._curWorkspace = { hub_id, nid, area: cmd.mget(_a.area) };
    Wm.mset({ hub_id, nid, nodeId: nid, area: cmd.mget(_a.area) });
    if (typeof Wm.ensurePart === "function") {
      Wm.ensurePart(_a.list).then((l) => {
        if (!l || (l.isDestroyed && l.isDestroyed())) return;
        l.setApi({ service: SERVICE.media.show_node_by, hub_id, nid });
        if (l.collection) l.collection.reset();
        l.el.style.visibility = "hidden";
        const scrollEl = l.el.querySelector(".smart-container");
        if (scrollEl) {
          scrollEl.dataset.partitioning = 1;
          scrollEl.style.visibility = "hidden";
        }
        l.restart();
        if (typeof Wm._prepareListPartition === "function") {
          Wm._prepareListPartition(l);
        }
      });
    }
  }

  /**
  * @param {*} cmd
  * @param {*} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case "breadcrum-jump":
        return this._loadActiveWindow(cmd);
      case "load-home":
        // In-place reset: reload Wm's main grid back to the user's home
        // workspace WITHOUT rebuilding the skeleton, so any open folder
        // windows are preserved per breadcrumb spec.
        this.loadDefault();
        if (Wm) {
          const hub_id = Visitor.id;
          const nid = Visitor.get(_a.home_id);
          Wm._curWorkspace = null;
          Wm.mset({ hub_id, nid, nodeId: nid, area: _a.personal });
          if (typeof Wm.ensurePart === "function") {
            Wm.ensurePart(_a.list).then((l) => {
              if (!l || (l.isDestroyed && l.isDestroyed())) return;
              l.setApi({ service: SERVICE.media.show_node_by, hub_id, nid });
              if (l.collection) l.collection.reset();
              l.el.style.visibility = "hidden";
              const scrollEl = l.el.querySelector(".smart-container");
              if (scrollEl) {
                scrollEl.dataset.partitioning = 1;
                scrollEl.style.visibility = "hidden";
              }
              l.restart();
              if (typeof Wm._prepareListPartition === "function") {
                Wm._prepareListPartition(l);
              }
            });
          }
        }
        return;
      case "change-workspace":
        this._loadActiveWindow(cmd);
        return this._updateContext(cmd.model.toJSON());
    }
  }

}

module.exports = __desk_breadcrumb;
