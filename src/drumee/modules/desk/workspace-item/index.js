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
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  getNodeId() {
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
}

module.exports = __workspace_item;
