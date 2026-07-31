/* ==================================================================== *
 * desk_workspace-item
 * A single workspace (hub) row in the sidebar workspace list.
 * Model data: hub_id, home_id, filename, area
 * Triggers "nav-workspace" on click, delegated up to desk_workspace-list.
 * ==================================================================== */

require('./skin');

class __workspace_item extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.mset({ flow: _a.y })
    this.declareHandlers();
    this._expanded = 0;
    this._childrenLoaded = 0;
    this._loadingChildren = 0;
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  getNodeId() {
    // Personal workspaces are home-root FOLDERS listed as workspace rows:
    // their own nid is the node id. home_id/actual_home_id on a folder row
    // point at the hub's home root, which would expand the wrong tree.
    if (this.mget(_a.filetype) === _a.folder) {
      return this.mget(_a.nid) || this.mget(_a.id);
    }
    const role = this.mget("nodeRole");
    if (role === "workspace") {
      return this.mget(_a.actual_home_id) || this.mget(_a.home_id) || this.mget(_a.nid);
    }
    return this.mget(_a.nid) || this.mget(_a.actual_home_id) || this.mget(_a.home_id);
  }

  getHubId() {
    return this.mget(_a.hub_id);
  }

  childOptions() {
    return {
      kind: "workspace_item",
      uiHandler: this.mget(_a.uiHandler),
      service: "load-folder",
      nodeRole: "folder",
      level: (this.mget("level") || 0) + 1,
      radio: "sidebar-radio",
      workspace_hub_id: this.mget("workspace_hub_id") || this.getHubId(),
      workspace_nid: this.mget("workspace_nid") || this.getNodeId(),
      workspace_area: this.mget("workspace_area") || this.mget(_a.area),
      workspace_name: this.mget("workspace_name") || this.mget(_a.filename),
    };
  }

  normalizeFolder(item = {}) {
    const nid = item.nid || item.actual_home_id || item.home_id || item.id;
    return {
      ...item,
      ...this.childOptions(),
      hub_id: item.hub_id || this.getHubId(),
      nid,
      nodeId: nid,
      filetype: item.filetype || _a.folder,
    };
  }

  fetchFolders() {
    return this.fetchService(SERVICE.media.show_node_by, {
      hub_id: this.getHubId(),
      nid: this.getNodeId(),
      type: _a.folder,
    }).then((data = []) => {
      const items = _.isArray(data) ? data : (data.list || data.rows || data.result || []);
      if (!_.isArray(items)) return [];
      return items.filter((item) => item.filetype === _a.folder || item.type === _a.folder);
    });
  }

  expandTree() {
    this._expanded = 1;
    this.el.dataset.expanded = 1;

    return this.ensurePart("children").then((p) => {
      p.el.dataset.open = 1;
      if (this._childrenLoaded) return;
      if (this._loadingChildren) return this._loadingChildren;
      this._loadingChildren = this.fetchFolders()
        .then((items) => {
          this._childrenLoaded = 1;
          p.feed(items.map((item) => this.normalizeFolder(item)));
        })
        .catch((e) => {
          if (this.warn) this.warn("Failed to load workspace folders", e);
          p.feed([]);
        })
        .finally(() => {
          this._loadingChildren = 0;
        });
      return this._loadingChildren;
    });
  }

  collapseTree() {
    this._expanded = 0;
    this.el.dataset.expanded = 0;
    return this.ensurePart("children").then((p) => p.el.dataset.open = 0);
  }

  toggleTree() {
    if (this._expanded) return this.collapseTree();
    return this.expandTree();
  }

  /**
   *
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    if (service === "toggle-tree") {
      return this.toggleTree();
    }
    this.triggerHandlers({ service: this.mget(_a.service) })
  }

  /**
   * Folder mutations under THIS node — re-fetch and re-feed children.
   * Strict gating: filetype === folder AND parent_id matches own id.
   * No model attribute mutation (a previous attempt listened to
   * change:filename and corrupted the label on click).
   * Skip when tree is collapsed or not yet loaded — next expand will
   * fetch fresh anyway.
   */
  /**
   * Incremental folder-tree updates — add/remove on the children
   * collection, single-item re-feed on rename. No listenTo on the
   * model itself (a prior attempt caused the workspace label to clear
   * on click). Each level subscribes for its own direct children only
   * (parent_id === own nodeId); deeper folders are handled by their
   * own listener.
   */
  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;
    if (!data) {
      if (super.onWsMessage) super.onWsMessage(svc, data, options);
      return;
    }
    if (
      service !== "media.new" &&
      service !== "media.workspace_move" &&
      service !== "media.remove" &&
      service !== "media.rename"
    ) {
      if (super.onWsMessage) super.onWsMessage(svc, data, options);
      return;
    }
    const args = (data.args && data.args.dest) || data;
    const filetype = args.filetype || data.filetype;
    if (filetype !== _a.folder) return;
    if (!this._expanded || !this._childrenLoaded) return;
    switch (service) {
      case "media.new":
      case "media.workspace_move":
        return this._addFolder(data);
      case "media.remove":
        return this._removeFolder(data);
      case "media.rename":
        return this._renameFolder(data);
    }
  }

  // Re-render this single item's skeleton — used by the parent
  // workspace-list when a hub is renamed, to refresh the label without
  // restarting the whole list.
  refresh() {
    if (!this.el) return;
    this.feed(require("./skeleton")(this));
  }

  _withChildrenPart(fn) {
    return this.ensurePart("children").then((p) => {
      if (!p) return;
      return fn(p);
    });
  }

  _findChildModel(part, nid) {
    if (!part || !nid || !part.collection) return null;
    return part.collection.find(
      (m) => m.get(_a.nid) === nid || m.get(_a.id) === nid,
    );
  }

  _addFolder(data) {
    const parentId = data.parent_id || data.pid;
    if (parentId !== this.getNodeId()) return;
    this._withChildrenPart((p) => {
      const nid = data.nid || data.id;
      if (this._findChildModel(p, nid)) return;
      p.append(this.normalizeFolder(data));
    });
  }

  _removeFolder(data) {
    const nid = data.nid || data.id;
    if (!nid) return;
    this._withChildrenPart((p) => {
      const model = this._findChildModel(p, nid);
      if (model) p.collection.remove(model);
    });
  }

  _renameFolder(data) {
    const args = (data && data.args && data.args.dest) || data;
    const nid = args.nid || args.id;
    if (!nid) return;
    const filename = args.filename || args.name;
    if (!filename) return;
    this._withChildrenPart((p) => {
      const model = this._findChildModel(p, nid);
      if (!model) return;
      model.set(_a.filename, filename);
      model.set(_a.name, filename);
      const itemView = p.children && p.children.find &&
        p.children.find((c) => c.model === model);
      if (itemView && typeof itemView.refresh === "function") itemView.refresh();
    });
  }
}

module.exports = __workspace_item;
