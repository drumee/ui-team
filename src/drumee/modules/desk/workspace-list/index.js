/* ==================================================================== *
 * desk_workspace-list
 * Lists workspaces (hubs) the current user belongs to.
 * Fetches from SERVICE.desk.home and renders each as a nav item.
 * Handles "nav-workspace" to open a hub in the window manager,
 * and "new-workspace" to create a new one.
 * ==================================================================== */
const WS_EVENT = "ws:event";

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
    this.handleWsEvent = this.handleWsEvent.bind(this);
    // this.bindEvent(_a.live);

  }

  onBeforeDestroy() {
    RADIO_BROADCAST.off("workspace:refresh", this.refreshList, this);
    RADIO_BROADCAST.off("workspace:focus", this._onWorkspaceFocus);
    Wm.off(WS_EVENT, this.handleWsEvent);

    // this.unbindEvent(_a.live);
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
    // Personal workspaces are home-root folders: they all share the user's
    // own hub_id, so the key must be the folder's nid or every personal
    // row would collapse into one highlight slot.
    if (item.mget(_a.filetype) === _a.folder) {
      return item.mget(_a.nid) || item.mget(_a.id);
    }
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
    Wm.on(WS_EVENT, this.handleWsEvent);
    this.feed(require("./skeleton")(this));
  }

  /**
   * Sidebar rows come from desk.home type=node (hubs + home-root folders
   * mixed) so Personal workspaces — personal-area FOLDERS at the home root —
   * can list alongside hub workspaces. Per-filetype rules the flat `skip`
   * regex can't express: hubs keep the collaborative-area gate (drops the
   * personal hub itself and the auto dmz/wicket), folders always pass and
   * get area=personal stamped (desk.home leaves it null) so the icon tint
   * and the Personal badge resolve.
   *
   * Ordering: hub workspaces (Internal/External) on top, Personal folders
   * always below. The payload is paginated and interleaves the two types by
   * rank, so sorting inside prepareData would only order within a page. A
   * Marionette viewComparator re-sorts the rendered rows on every collection
   * add/reset/update (including the second page and live appends), grouping
   * hubs above folders and keeping the server rank order within each group.
   */
  onPartReady(child, pn) {
    if (pn === _a.list && child && !child._workspaceMixFilterInstalled) {
      child._workspaceMixFilterInstalled = 1;
      const original = child.prepareData.bind(child);
      child.prepareData = function (data) {
        const prepared = original(data) || [];
        return prepared
          .filter((it) => {
            if (!it) return false;
            if (it.filetype === _a.folder) return true;
            if (it.filetype === _a.hub) {
              return /^(share|private|restricted|public)$/.test(it.area);
            }
            return false;
          })
          .map((it) =>
            it.filetype === _a.folder && !it.area
              ? { ...it, area: _a.personal }
              : it,
          );
      };

      // arity-1 comparator → Marionette runs a STABLE _.sortBy, so hubs and
      // folders each keep their server rank order; only the group rank (hub 0,
      // folder 1) moves Personal folders below the workspaces.
      child.setComparator((view) =>
        view.mget(_a.filetype) === _a.folder ? 1 : 0,
      );
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.mget(_a.service);
    switch (service) {
      case "load-workspace": {
        // Personal workspace rows are home-root folders. Pass an explicit
        // shape: a folder row's home_id/actual_home_id point at the hub's
        // home ROOT, which loadWorkspace would otherwise prefer over the
        // folder's own nid and open Home instead of the folder.
        const target =
          trigger.mget(_a.filetype) === _a.folder
            ? {
                hub_id: trigger.mget(_a.hub_id) || Visitor.id,
                nid: trigger.mget(_a.nid) || trigger.mget(_a.id),
                filename: trigger.mget(_a.filename),
                area: _a.personal,
              }
            : trigger;
        const result = Wm.loadWorkspace(target);
        // Same tour the icons-list tile raises: it is about folders, not about
        // how the user reached one, and a sidebar-first user would otherwise
        // never see it. Single-flight plus the seen-set make the overlap
        // harmless. Raised after the navigation is under way so the tour can
        // never swallow it.
        require("libs/tutorial-tours").fire("folder_task", this);
        if (result && result.then)
          return result.then(() => this.openWorkspace(trigger));
        return this.openWorkspace(trigger);
      }

      case "load-folder":
        // The sidebar's sub-folder rows open a folder WINDOW rather than a
        // workspace, so loadWorkspace above does not cover them.
        require("libs/tutorial-tours").fire("folder_task", this);
        return Wm.openWorkspaceFolder(trigger);

      case "new-workspace":
        if (require("libs/over-limit").guardWrite("write")) return;
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
  // onWsMessage(svc, data, options = {}) {
  handleWsEvent(args = {}) {
    let { data, options } = args || {};
    let { echoId, service: service } = options;
    let { src, dest } = data.args || {};
    this.verbose("onWsMessage[132]", src, dest , service, data, options)
    if (service === "hub.invite_received") {
      this.refreshList();
      return;
    }

    if (!data) {
      if (super.onWsMessage) super.onWsMessage(service, data, options);
      return;
    }

    // const args = (data.args && data.args.dest) || data;
    const filetype = args.filetype || data.filetype;
    // Home-root folders are Personal workspace rows — let their media.*
    // mutations through so the sidebar live-updates like it does for hubs.
    // Anything deeper (a folder inside a workspace) is not a sidebar row.
    const isHomeRootFolder =
      filetype === _a.folder &&
      `${data.pid || data.parent_id || ""}` === `${Visitor.get(_a.home_id)}`;
    if (/^media/.test(service) && filetype !== _a.hub && !isHomeRootFolder) {
      if (super.onWsMessage) super.onWsMessage(service, data, options);
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
        if (super.onWsMessage) super.onWsMessage(service, data, options);
    }
  }

  _withList(fn) {
    return this.ensurePart(_a.list).then((list) => {
      if (!list) return;
      return fn(list);
    });
  }

  // Hub rows match strictly by hub_id / home_id — files and folders share
  // `nid` with their parent hub which would cause false-positive matches
  // (a file delete inside a workspace would remove the workspace itself).
  // Personal-workspace rows are home-root folders: those match by their own
  // nid, and only against folder models so a hub whose ids collide is safe.
  _findHubModel(list, data) {
    const col = list && list.collection;
    if (!col) return null;
    if (data.filetype === _a.folder) {
      const nid = data.nid || data.id;
      if (!nid) return null;
      return col.find(
        (m) =>
          m.get(_a.filetype) === _a.folder &&
          (m.get(_a.nid) === nid || m.get(_a.id) === nid),
      );
    }
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
    const isHomeRootFolder =
      data &&
      data.filetype === _a.folder &&
      `${data.pid || data.parent_id || ""}` === `${Visitor.get(_a.home_id)}`;
    if (
      !isHomeRootFolder &&
      area !== _a.share &&
      area !== _a.private &&
      area !== _a.restricted
    )
      return;
    this._withList((list) => {
      if (this._findHubModel(list, data)) return;
      list.append(
        isHomeRootFolder ? { ...data, area: data.area || _a.personal } : data,
      );
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
