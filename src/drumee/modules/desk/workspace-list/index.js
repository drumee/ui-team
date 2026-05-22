/* ==================================================================== *
 * desk_workspace-list
 * Lists workspaces (hubs) the current user belongs to.
 * Fetches from SERVICE.desk.home and renders each as a nav item.
 * Handles "nav-workspace" to open a hub in the window manager,
 * and "new-workspace" to create a new one.
 * ==================================================================== */

class __desk_workspace extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._openWorkspaceKey = null;
    this._openWorkspaceItem = null;
    RADIO_BROADCAST.on("workspace:refresh", this.refreshList, this);
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    RADIO_BROADCAST.off("workspace:refresh", this.refreshList, this);
    this.unbindEvent(_a.live);
  }

  refreshList() {
    this._openWorkspaceKey = null;
    this._openWorkspaceItem = null;
    return this.ensurePart(_a.list).then((list) => list.restart());
  }

  getWorkspaceKey(item) {
    return item.mget(_a.hub_id) || item.mget(_a.home_id) || item.mget(_a.actual_home_id) || item.mget(_a.nid);
  }

  openWorkspace(item) {
    const key = this.getWorkspaceKey(item);
    if (key === this._openWorkspaceKey) {
      item.el.dataset.currentWorkspace = 1;
      return item.expandTree();
    }

    const previous = this._openWorkspaceItem;
    this._openWorkspaceKey = key;
    this._openWorkspaceItem = item;

    if (previous && previous !== item) {
      previous.el.dataset.currentWorkspace = 0;
      if (previous.collapseTree) previous.collapseTree();
    }
    item.el.dataset.currentWorkspace = 1;
    return item.expandTree();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case "load-workspace": {
        const result = Wm.loadWorkspace(trigger);
        if (result && result.then) return result.then(() => this.openWorkspace(trigger));
        return this.openWorkspace(trigger);
      }

      case "load-folder":
        return Wm.openWorkspaceFolder(trigger);

      case "new-workspace":
        return Wm.launch(
          { kind: "window_manager", service: "new-hub" },
          { explicit: 1, singleton: 1 }
        );

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  /**
   * Live updates so the sidebar reflects hub adds / removes / renames
   * without a refetch (originated locally or from another device).
   */
  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;

    if (service === "hub.invite_received") {
      this.refreshList();
      return;
    }

    if (!data) {
      if (super.onWsMessage) super.onWsMessage(svc, data, options);
      return;
    }

    // Match literal service names rather than SERVICE.* lookups —
    // safer if a namespace happens to be missing (would otherwise
    // throw on the case expression itself before matching).
    switch (service) {
      case "media.new":
      case "desk.create_hub":
      case "hub.add_contributors":
        if (data.filetype === _a.hub) this._addHub(data);
        break;

      case "media.remove":
      case "hub.delete_hub":
      case "desk.leave_hub":
        this._removeHub(data);
        break;

      case "media.rename":
      case "hub.update_name":
        this._renameHub(data);
        break;

      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  // List.Smart accessor — the skeleton sets sys_pn: _a.list but no
  // partHandler, so we resolve via ensurePart on demand instead of
  // stashing on this.__list during onPartReady.
  _withList(fn) {
    return this.ensurePart(_a.list).then((list) => {
      if (!list) return;
      return fn(list);
    });
  }

  _findHubModel(list, data) {
    const col = list && list.collection;
    if (!col) return null;
    const hubId = data.hub_id || data.nid || data.id;
    return col.find((m) => {
      return m.get(_a.hub_id) === hubId
        || m.get(_a.nid) === hubId
        || m.get(_a.id) === hubId;
    });
  }

  _addHub(data) {
    // Mirror the skeleton's skip filter — `private` is the UX "restricted".
    const area = data && data.area;
    if (area !== _a.share && area !== _a.private && area !== _a.restricted) return;
    this._withList((list) => {
      if (this._findHubModel(list, data)) return;
      list.append(data);
    });
  }

  _removeHub(data) {
    this._withList((list) => {
      const model = this._findHubModel(list, data);
      if (model) list.collection.remove(model);
    });
  }

  _renameHub(data) {
    const args = (data && data.args && data.args.dest) || data;
    if (!args) return;
    this._withList((list) => {
      const model = this._findHubModel(list, args);
      if (!model) return;
      // Server emits the new name in either `filename` or `name`/`hubname`
      // (depending on hub.update_name vs media.rename path).
      const filename = args.filename || args.name || args.hubname;
      if (filename) {
        model.set(_a.filename, filename);
        model.set(_a.name, filename);
      }
    });
  }
}

module.exports = __desk_workspace;
