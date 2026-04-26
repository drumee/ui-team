/* ==================================================================== *
 * desk_workspace-list
 * Lists workspaces (hubs) the current user belongs to.
 * Fetches from SERVICE.desk.home and renders each as a nav item.
 * Handles "nav-workspace" to open a hub in the window manager,
 * and "new-workspace" to create a new one.
 * ==================================================================== */

class __desk_workspace extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._openWorkspaceKey = null;
    this._openWorkspaceItem = null;
    RADIO_BROADCAST.on("workspace:refresh", this.refreshList, this);
  }

  onBeforeDestroy() {
    RADIO_BROADCAST.off("workspace:refresh", this.refreshList, this);
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

  /**
   *
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   *
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
        return Wm.loadWorkspaceNode(trigger);

      case "new-workspace":
        return Wm.launch(
          { kind: "window_manager", service: "new-hub" },
          { explicit: 1, singleton: 1 }
        );

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __desk_workspace;
