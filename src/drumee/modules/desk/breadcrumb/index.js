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
    this.debug("AAA:45 _buildContent", data)
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
  _loadDefault() {
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
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this))
    this._loadDefault()
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
    this.fetchService(SERVICE.media.get_path, { nid, hub_id }).then((data) => {
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
    this.debug("AAA:141 _updateContent", data, source)
    switch (data.event) {
      case _a.closed:
        return;
      case _a.home:
        return this._loadDefault();
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
    this.debug("AAA:66 _updateContext", this._context)
    const filename = this._context && (this._context.filename || this._context.name);
    if (!filename) return this._loadDefault();
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
    lỗi khi close folder windows 
    vudangnt/:100 Loading app bundles bundles-runtime
    vudangnt/:100 Loading app bundles bundles-locale
    vudangnt/:100 Loading app bundles bundles-main
    vudangnt/:100 Loading app bundles bundles-sprite
    vudangnt/:100 Loading app bundles bundles-vendor
    vudangnt/:100 Loading app bundles bundles-core
    index.js:18 Loading Locale... complete
    index.js:24 Loading Drumee Core... complete
    sprite.js:35 Loading Sprite...
    vendor.js:24 Loading Vendor...
    index.web.js:27 Staring Drumee Web...
    index.web.js:28 Build commit=3c922f547, mode=development
    index.web.js:29 UI version=3.2.32
    index.js:67 __list_smart: Failed to ensure element id=1859-container undefined
    Backbone.View.warn @ warn.js:42
    eval @ index.js:279
    Promise.catch
    onDomRefresh @ index.js:278
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    append @ index.js:351
    eval @ index.js:67
    setTimeout
    eval @ index.js:51
    Promise.then
    View.waitElement @ letc.js:1145
    buildContent @ index.js:47
    eval @ index.js:105
    Promise.then
    View.waitElement @ letc.js:1145
    onPartReady @ index.js:104
    triggerMethod @ backbone.marionette.js:320
    View.registerPart @ letc.js:232
    View.onBeforeRender @ letc.js:296
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2299
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    feed @ index.js:313
    onDomRefresh @ index.js:156
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    View.renew @ letc.js:782
    ok @ loader.js:20
    Promise.then
    onBeforeRender @ loader.js:27
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2299
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    Backbone.Collection.cleanSet @ collection.js:8
    renderData @ index.js:719
    handleResponse @ index.js:661
    Promise.then
    fetch @ index.js:440
    start @ index.js:159
    initContent @ index.js:260
    Promise.then
    onDomRefresh @ index.js:277
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    feed @ index.js:313
    eval @ index.js:345
    Promise.then
    onDomRefresh @ index.js:338
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    View.renew @ letc.js:782
    ok @ loader.js:20
    Promise.then
    onBeforeRender @ loader.js:27
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2299
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    render @ backbone.marionette.js:2319
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    render @ backbone.marionette.js:2319
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    render @ backbone.marionette.js:2319
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    feed @ index.js:313
    eval @ letc.js:601
    Promise.then
    View.waitElement @ letc.js:1145
    View.onRender @ letc.js:597
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2321
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    append @ index.js:351
    eval @ manager.js:880
    Promise.then
    _launchApp @ manager.js:877
    openContent @ manager.js:965
    openContent @ index.js:341
    onUiEvent @ index.js:1194
    triggerMethod @ backbone.marionette.js:320
    View.triggerHandlers @ letc.js:882
    defaultTrigger @ interact.js:272
    dispatchUiEvent @ interact.js:356
    dispatchUiEvent @ index.js:128
    index.js:67 __list_smart: Failed to ensure element id=1863-container undefined
    Backbone.View.warn @ warn.js:42
    eval @ index.js:279
    Promise.catch
    onDomRefresh @ index.js:278
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    append @ index.js:351
    eval @ index.js:67
    setTimeout
    eval @ index.js:51
    Promise.then
    View.waitElement @ letc.js:1145
    buildContent @ index.js:47
    eval @ index.js:105
    Promise.then
    View.waitElement @ letc.js:1145
    onPartReady @ index.js:104
    triggerMethod @ backbone.marionette.js:320
    View.registerPart @ letc.js:232
    View.onBeforeRender @ letc.js:296
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2299
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    feed @ index.js:313
    onDomRefresh @ index.js:156
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    View.renew @ letc.js:782
    ok @ loader.js:20
    Promise.then
    onBeforeRender @ loader.js:27
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2299
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    Backbone.Collection.cleanSet @ collection.js:8
    renderData @ index.js:719
    handleResponse @ index.js:661
    Promise.then
    fetch @ index.js:440
    start @ index.js:159
    initContent @ index.js:260
    Promise.then
    onDomRefresh @ index.js:277
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:204
    each @ each.js:21
    triggerMethodChildren @ backbone.marionette.js:199
    handleAttach @ backbone.marionette.js:247
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    feed @ index.js:313
    eval @ index.js:345
    Promise.then
    onDomRefresh @ index.js:338
    triggerMethod @ backbone.marionette.js:320
    triggerDOMRefresh @ backbone.marionette.js:232
    handleAttach @ backbone.marionette.js:248
    triggerEvents @ backbone.js:329
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    triggerMethod @ backbone.marionette.js:324
    eval @ backbone.marionette.js:2593
    each @ each.js:21
    _attachChildren @ backbone.marionette.js:2587
    _renderChildren @ backbone.marionette.js:2549
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    View.renew @ letc.js:782
    ok @ loader.js:20
    Promise.then
    onBeforeRender @ loader.js:27
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2299
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    render @ backbone.marionette.js:2319
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    render @ backbone.marionette.js:2319
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    render @ backbone.marionette.js:2319
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    feed @ index.js:313
    eval @ letc.js:601
    Promise.then
    View.waitElement @ letc.js:1145
    View.onRender @ letc.js:597
    triggerMethod @ backbone.marionette.js:320
    render @ backbone.marionette.js:2321
    renderView @ backbone.marionette.js:1172
    eval @ backbone.marionette.js:2562
    each @ each.js:21
    _getBuffer @ backbone.marionette.js:2561
    _renderChildren @ backbone.marionette.js:2547
    filter @ backbone.marionette.js:2412
    sort @ backbone.marionette.js:2342
    _onCollectionUpdate @ backbone.marionette.js:2154
    triggerEvents @ backbone.js:330
    triggerApi @ backbone.js:316
    eventsApi @ backbone.js:104
    Events.trigger @ backbone.js:306
    set @ backbone.js:945
    add @ backbone.js:818
    append @ index.js:351
    eval @ manager.js:880
    Promise.then
    _launchApp @ manager.js:877
    openContent @ manager.js:965
    openContent @ index.js:341
    onUiEvent @ index.js:1194
    triggerMethod @ backbone.marionette.js:320
    View.triggerHandlers @ letc.js:882
    defaultTrigger @ interact.js:272
    dispatchUiEvent @ interact.js:356
    dispatchUiEvent @ index.js:128
    warn.js:42 __drumee_svg: UI_SERVICE_ERROR TypeError: Cannot read properties of undefined (reading 'dataset')
        at __window_folder.onUiEvent (core.js:825:34)
        at __window_folder.onUiEvent (index.js:408:15)
        at __window_folder.triggerMethod (backbone.marionette.js:320:23)
        at View.triggerHandlers (letc.js:882:12)
        at View.__handleClick (letc.js:325:8)
    Backbone.View.warn @ warn.js:42
    View.triggerHandlers @ letc.js:890
    View.__handleClick @ letc.js:325
    letc.js:891 console.trace
    View.triggerHandlers @ letc.js:891
    View.__handleClick @ letc.js:325
    warn.js:42 __drumee_svg: UI_SERVICE_ERROR TypeError: Cannot read properties of undefined (reading 'dataset')
        at __window_folder.onUiEvent (core.js:825:34)
        at __window_folder.onUiEvent (index.js:408:15)
        at __window_folder.triggerMethod (backbone.marionette.js:320:23)
        at View.triggerHandlers (letc.js:882:12)
        at View.__handleClick (letc.js:325:8)
    Backbone.View.warn @ warn.js:42
    View.triggerHandlers @ letc.js:890
    View.__handleClick @ letc.js:325
    letc.js:891 console.trace
    View.triggerHandlers @ letc.js:891
    View.__handleClick @ letc.js:325
lỗi khi close folder windows 
vudangnt/:100 Loading app bundles bundles-runtime
vudangnt/:100 Loading app bundles bundles-locale
vudangnt/:100 Loading app bundles bundles-main
vudangnt/:100 Loading app bundles bundles-sprite
vudangnt/:100 Loading app bundles bundles-vendor
vudangnt/:100 Loading app bundles bundles-core
index.js:18 Loading Locale... complete
index.js:24 Loading Drumee Core... complete
sprite.js:35 Loading Sprite...
vendor.js:24 Loading Vendor...
index.web.js:27 Staring Drumee Web...
index.web.js:28 Build commit=3c922f547, mode=development
index.web.js:29 UI version=3.2.32
index.js:67 __list_smart: Failed to ensure element id=1859-container undefined
Backbone.View.warn @ warn.js:42
eval @ index.js:279
Promise.catch
onDomRefresh @ index.js:278
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
append @ index.js:351
eval @ index.js:67
setTimeout
eval @ index.js:51
Promise.then
View.waitElement @ letc.js:1145
buildContent @ index.js:47
eval @ index.js:105
Promise.then
View.waitElement @ letc.js:1145
onPartReady @ index.js:104
triggerMethod @ backbone.marionette.js:320
View.registerPart @ letc.js:232
View.onBeforeRender @ letc.js:296
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2299
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
feed @ index.js:313
onDomRefresh @ index.js:156
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
View.renew @ letc.js:782
ok @ loader.js:20
Promise.then
onBeforeRender @ loader.js:27
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2299
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
Backbone.Collection.cleanSet @ collection.js:8
renderData @ index.js:719
handleResponse @ index.js:661
Promise.then
fetch @ index.js:440
start @ index.js:159
initContent @ index.js:260
Promise.then
onDomRefresh @ index.js:277
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
feed @ index.js:313
eval @ index.js:345
Promise.then
onDomRefresh @ index.js:338
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
View.renew @ letc.js:782
ok @ loader.js:20
Promise.then
onBeforeRender @ loader.js:27
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2299
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
render @ backbone.marionette.js:2319
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
render @ backbone.marionette.js:2319
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
render @ backbone.marionette.js:2319
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
feed @ index.js:313
eval @ letc.js:601
Promise.then
View.waitElement @ letc.js:1145
View.onRender @ letc.js:597
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2321
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
append @ index.js:351
eval @ manager.js:880
Promise.then
_launchApp @ manager.js:877
openContent @ manager.js:965
openContent @ index.js:341
onUiEvent @ index.js:1194
triggerMethod @ backbone.marionette.js:320
View.triggerHandlers @ letc.js:882
defaultTrigger @ interact.js:272
dispatchUiEvent @ interact.js:356
dispatchUiEvent @ index.js:128
index.js:67 __list_smart: Failed to ensure element id=1863-container undefined
Backbone.View.warn @ warn.js:42
eval @ index.js:279
Promise.catch
onDomRefresh @ index.js:278
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
append @ index.js:351
eval @ index.js:67
setTimeout
eval @ index.js:51
Promise.then
View.waitElement @ letc.js:1145
buildContent @ index.js:47
eval @ index.js:105
Promise.then
View.waitElement @ letc.js:1145
onPartReady @ index.js:104
triggerMethod @ backbone.marionette.js:320
View.registerPart @ letc.js:232
View.onBeforeRender @ letc.js:296
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2299
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
feed @ index.js:313
onDomRefresh @ index.js:156
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
View.renew @ letc.js:782
ok @ loader.js:20
Promise.then
onBeforeRender @ loader.js:27
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2299
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
Backbone.Collection.cleanSet @ collection.js:8
renderData @ index.js:719
handleResponse @ index.js:661
Promise.then
fetch @ index.js:440
start @ index.js:159
initContent @ index.js:260
Promise.then
onDomRefresh @ index.js:277
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:204
each @ each.js:21
triggerMethodChildren @ backbone.marionette.js:199
handleAttach @ backbone.marionette.js:247
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
feed @ index.js:313
eval @ index.js:345
Promise.then
onDomRefresh @ index.js:338
triggerMethod @ backbone.marionette.js:320
triggerDOMRefresh @ backbone.marionette.js:232
handleAttach @ backbone.marionette.js:248
triggerEvents @ backbone.js:329
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
triggerMethod @ backbone.marionette.js:324
eval @ backbone.marionette.js:2593
each @ each.js:21
_attachChildren @ backbone.marionette.js:2587
_renderChildren @ backbone.marionette.js:2549
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
View.renew @ letc.js:782
ok @ loader.js:20
Promise.then
onBeforeRender @ loader.js:27
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2299
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
render @ backbone.marionette.js:2319
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
render @ backbone.marionette.js:2319
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
render @ backbone.marionette.js:2319
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
feed @ index.js:313
eval @ letc.js:601
Promise.then
View.waitElement @ letc.js:1145
View.onRender @ letc.js:597
triggerMethod @ backbone.marionette.js:320
render @ backbone.marionette.js:2321
renderView @ backbone.marionette.js:1172
eval @ backbone.marionette.js:2562
each @ each.js:21
_getBuffer @ backbone.marionette.js:2561
_renderChildren @ backbone.marionette.js:2547
filter @ backbone.marionette.js:2412
sort @ backbone.marionette.js:2342
_onCollectionUpdate @ backbone.marionette.js:2154
triggerEvents @ backbone.js:330
triggerApi @ backbone.js:316
eventsApi @ backbone.js:104
Events.trigger @ backbone.js:306
set @ backbone.js:945
add @ backbone.js:818
append @ index.js:351
eval @ manager.js:880
Promise.then
_launchApp @ manager.js:877
openContent @ manager.js:965
openContent @ index.js:341
onUiEvent @ index.js:1194
triggerMethod @ backbone.marionette.js:320
View.triggerHandlers @ letc.js:882
defaultTrigger @ interact.js:272
dispatchUiEvent @ interact.js:356
dispatchUiEvent @ index.js:128
warn.js:42 __drumee_svg: UI_SERVICE_ERROR TypeError: Cannot read properties of undefined (reading 'dataset')
    at __window_folder.onUiEvent (core.js:825:34)
    at __window_folder.onUiEvent (index.js:408:15)
    at __window_folder.triggerMethod (backbone.marionette.js:320:23)
    at View.triggerHandlers (letc.js:882:12)
    at View.__handleClick (letc.js:325:8)
Backbone.View.warn @ warn.js:42
View.triggerHandlers @ letc.js:890
View.__handleClick @ letc.js:325
letc.js:891 console.trace
View.triggerHandlers @ letc.js:891
View.__handleClick @ letc.js:325
warn.js:42 __drumee_svg: UI_SERVICE_ERROR TypeError: Cannot read properties of undefined (reading 'dataset')
    at __window_folder.onUiEvent (core.js:825:34)
    at __window_folder.onUiEvent (index.js:408:15)
    at __window_folder.triggerMethod (backbone.marionette.js:320:23)
    at View.triggerHandlers (letc.js:882:12)
    at View.__handleClick (letc.js:325:8)
Backbone.View.warn @ warn.js:42
View.triggerHandlers @ letc.js:890
View.__handleClick @ letc.js:325
letc.js:891 console.trace
View.triggerHandlers @ letc.js:891
View.__handleClick @ letc.js:325
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
        // In-place reset: reload Wm's main grid back to the user's home
        // workspace WITHOUT rebuilding the skeleton, so any open folder
        // windows are preserved per breadcrumb spec.
        this._loadDefault();
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
