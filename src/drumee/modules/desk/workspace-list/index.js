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
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
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
      case "load-workspace":
        return Wm.loadWorkspace(trigger);

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
    if (!data || !this.__list) {
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

  _findHubModel(data) {
    const col = this.__list && this.__list.collection;
    if (!col) return null;
    const hubId = data.hub_id || data.nid || data.id;
    return col.find((m) => {
      return m.get(_a.hub_id) === hubId
        || m.get(_a.nid) === hubId
        || m.get(_a.id) === hubId;
    });
  }

  _addHub(data) {
    if (this._findHubModel(data)) return;
    this.__list.append(data);
  }

  _removeHub(data) {
    const model = this._findHubModel(data);
    if (model) this.__list.collection.remove(model);
  }

  _renameHub(data) {
    const args = (data && data.args && data.args.dest) || data;
    if (!args) return;
    const model = this._findHubModel(args);
    if (!model) return;
    if (args.filename) model.set(_a.filename, args.filename);
    if (args.name) model.set(_a.name, args.name);
  }
}

module.exports = __desk_workspace;
