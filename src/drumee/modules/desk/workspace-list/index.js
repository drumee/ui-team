/* ==================================================================== *
 * desk_workspace-list
 * Lists workspaces (hubs) the current user belongs to.
 * Fetches from SERVICE.desk.home and renders each as a nav item.
 * Handles "nav-workspace" to open a hub in the window manager,
 * and "new-workspace" to create a new one.
 * ==================================================================== */

class __desk_workspace extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._openWorkspaceKey = null;
    this._openWorkspaceItem = null;
    this._onWorkspaceFocus = this._onWorkspaceFocus.bind(this);
    RADIO_BROADCAST.on("workspace:refresh", this.refreshList, this);
    RADIO_BROADCAST.on("workspace:focus", this._onWorkspaceFocus);
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    RADIO_BROADCAST.off("workspace:refresh", this.refreshList, this);
    RADIO_BROADCAST.off("workspace:focus", this._onWorkspaceFocus);
    this.unbindEvent(_a.live);
  }

  /**
   * Multi-tab: a different workspace tab gained focus (via tab click, drag
   * start, programmatic raise, …). Sync the sidebar highlight to match so
   * the user always sees which tab is on top. Same one-source-of-truth
   * principle as the sidebar-driven flow — `_openWorkspaceItem` stays the
   * single highlight, we just move it.
   */
  _onWorkspaceFocus({ hub_id } = {}) {
    if (!hub_id || hub_id == this._openWorkspaceKey) return;
    this.ensurePart(_a.list).then((list) => {
      if (!list || !list.children) return;
      const item = list.children.find((c) => this.getWorkspaceKey(c) == hub_id);
      if (!item) return;
      this.openWorkspace(item);
    });
  }

  /**
   *
   */
  collapseTree() {
    if (!this._openWorkspaceItem || this._openWorkspaceItem.isDestroyed())
      return;
    this._openWorkspaceItem.collapseTree();
  }

  refreshList() {
    this._openWorkspaceKey = null;
    this._openWorkspaceItem = null;
    return this.ensurePart(_a.list).then((list) => list.restart());
  }

  getWorkspaceKey(item) {
    return (
      item.mget(_a.hub_id) ||
      item.mget(_a.home_id) ||
      item.mget(_a.actual_home_id) ||
      item.mget(_a.nid)
    );
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
    this.feed(require("./skeleton")(this));
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
        if (result && result.then)
          return result.then(() => this.openWorkspace(trigger));
        return this.openWorkspace(trigger);
      }

      case "load-folder":
        return Wm.openWorkspaceFolder(trigger);

      case "new-workspace":
        return Wm.launch(
          { kind: "window_manager", service: "new-hub" },
          { explicit: 1, singleton: 1 },
        );

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  /**
   * Incremental sidebar updates — append/remove on the live collection,
   * single-item re-feed on rename. media.* fires for every node type;
   * gate strictly by `filetype === hub` so a file mutation inside a
   * workspace can't churn the sidebar. NO listenTo on model attribute
   * change (a prior attempt did and the workspace label cleared on click).
   * list.restart() is reserved for hub.invite_received where we don't
   * know the precise delta.
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

    const args = (data.args && data.args.dest) || data;
    const filetype = args.filetype || data.filetype;
    const isMediaEvent =
      service === "media.new" ||
      service === "media.remove" ||
      service === "media.rename";
    if (isMediaEvent && filetype !== _a.hub) {
      if (super.onWsMessage) super.onWsMessage(svc, data, options);
      return;
    }

    switch (service) {
      case "media.new":
      case "desk.create_hub":
      case "hub.add_contributors":
        this._addHub(data);
        return;
      case "media.remove":
      case "hub.delete_hub":
      case "desk.leave_hub":
        this._removeHub(data);
        return;
      case "media.rename":
      case "hub.update_name":
        this._renameHub(data);
        return;
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  _withList(fn) {
    return this.ensurePart(_a.list).then((list) => {
      if (!list) return;
      return fn(list);
    });
  }

  // Match strictly by hub_id / home_id only — files and folders share
  // `nid` with their parent hub which would cause false-positive matches
  // (a file delete inside workspace would remove the workspace itself).
  _findHubModel(list, data) {
    const col = list && list.collection;
    if (!col) return null;
    const hubId = data.hub_id || data.home_id;
    if (!hubId) return null;
    return col.find(
      (m) =>
        m.get(_a.hub_id) === hubId ||
        m.get(_a.home_id) === hubId ||
        m.get(_a.actual_home_id) === hubId,
    );
  }

  _addHub(data) {
    const area = data && data.area;
    if (area !== _a.share && area !== _a.private && area !== _a.restricted)
      return;
    this._withList((list) => {
      if (this._findHubModel(list, data)) return;
      list.append(data);
    });
  }

  _removeHub(data) {
    this._withList((list) => {
      const model = this._findHubModel(list, data);
      if (model && list.collection) list.collection.remove(model);
    });
  }

  _renameHub(data) {
    const args = (data && data.args && data.args.dest) || data;
    const filename = args && (args.filename || args.name || args.hubname);
    if (!filename) return;
    this._withList((list) => {
      const model = this._findHubModel(list, args);
      if (!model) return;
      model.set(_a.filename, filename);
      model.set(_a.name, filename);
      const item =
        list.children &&
        list.children.find &&
        list.children.find((c) => c.model === model);
      if (item && typeof item.refresh === "function") item.refresh();
    });
  }
}

module.exports = __desk_workspace;
