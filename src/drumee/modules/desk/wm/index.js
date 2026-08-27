require("./skin");
const { copyToClipboard } = require("@drumee/ui-essentials");
const { TweenLite, gsap } = require("@drumee/ui-core/vendor");
const push = require("./push");
// "Open this workspace once signed in" — armed by the welcome module from
// ?hub_id= (the workspace-invite CTA), consumed on boot below.
const hubDeepLink = require("libs/hub-deep-link");
// Shares one in-flight media.get_path with the breadcrumb / folder window when
// they ask for the same node in the same instant (a folder open does).
const { getPath } = require("libs/path-request");
// Reader for the compact "#/desk/wm/o/<nid>/<hub_id>/<filetype>" deep link. The
// long "open" form is unchanged and still resolved by the same openers.
const {
  COMPACT_SEGMENT,
  parseCompactPath,
} = require("libs/compact-deep-link");
// "Open this file once I am signed in" — armed at module scope in index.web.js
// from the original URL, consumed below once the desk has mounted after sign-in.
const fileDeepLink = require("libs/file-deep-link");
const {
  blocksGroupedArrange,
} = require("window/skeleton/toolkit/file-group");
// Same channel the websocket dispatcher triggers on Wm — windows and the
// sidebar workspace list subscribe to it (window/utils.js, workspace-list).
const WS_EVENT = "ws:event";

class __window_manager extends push {
  constructor(...args) {
    super(...args);
    this.load = this.load.bind(this);
    this.clearShift = this.clearShift.bind(this);
    this.xorSelect = this.xorSelect.bind(this);
    this.resetSearch = this.resetSearch.bind(this);
  }

  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    this.isWm = 1;
    super.initialize(opt);
    this.__skel = require("./skeleton");
    _K.docViewer.width = Math.min(_K.docViewer.width, window.innerWidth - 5);
    _K.docViewer.height = Math.min(_K.docViewer.height, window.innerHeight);
    let exportMenu = [];
    if (Visitor.canServerImpExp()) {
      exportMenu = [_a.separator, _a.import];
    }
    // Desk-background context menu is resolved by contextmenuItems() below
    // so it can hide create/invite entries while the org is over-limit.
    this._handelKbdEvents = this._handelKbdEvents.bind(this);
    RADIO_KBD.on(_e.keyup, this._handelKbdEvents);
    /** Preload some most used widget. Do not use await to avoid blocking */
    Kind.waitFor("window_folder");
    // Post-Checkout return (?checkout=success|cancel) → payment result modal.
    // Deferred so the wrapper-modal slot exists before we feed it.
    setTimeout(() => this.checkCheckoutReturn(), 1200);
  }

  /**
   * Desk-background right-click. Mirrors the topbar actions while the
   * workspace can write; while over-limit / hard_lock the create + invite
   * entries are omitted entirely (handlers also call guardWrite — belt and
   * braces for any other entry that still lands on those services).
   */
  contextmenuItems() {
    if (require("libs/over-limit").isLocked()) return [];
    return [
      _a.createWorkspace,
      _a.addNew,
      _a.separator,
      _a.inviteMember,
    ];
  }

  /**
   *
   */
  // updateContextMenuItems() {
  //   if (document.fullscreenElement != null) {
  //     this.contextmenuItems.splice(3, 1, _a.fullscreen);
  //   } else {
  //     this.contextmenuItems.splice(3, 1, _a.exitFullScreen);
  //   }
  //   return;
  // }

  /**
   *
   */
  openSharedLink(opt) {
    const fileTypes = [_a.audio, _a.video, _a.image, _a.video, _a.document];
    // setTimeout(() => {
    //   Backbone.history.navigate(_K.module.desk);
    // }, 1000);
    if (opt.kind == _a.media || fileTypes.includes(opt.filetype)) {
      return this.fetchMediaAttributes(opt);
    }
    if (opt.filetype == _a.hub || opt.filetype == _a.folder) {
      return this.checkPrivilegeForHub(opt);
    }
    if (opt.kind) {
      this.launch(opt, { explicit: 1 });
    }
  }

  /**
   * Turn a stored desk hash — "#/desk/wm/o/<nid>/<hub_id>/<type>" or its long
   * "…/open/nid=…&hub_id=…" twin — into the payload the openers take.
   *
   * Shared by the two callers below so the parsing lives in one place; they
   * deliberately do NOT share an opener (see openDeepLinkHash).
   *
   * @param {String} hash a full location.hash
   */
  _deepLinkPayload(hash) {
    const savedPath = Visitor.parseModule(hash);
    const savedArgs = Visitor.parseModuleArgs(hash);
    // parseCompactPath supplies the recomputed `kind` the compact form omits and
    // returns null for any non-compact hash, leaving the long form on its args.
    return parseCompactPath(savedPath) || savedArgs;
  }

  /**
   * Open the file a signed-out visitor arrived on (libs/file-deep-link, replayed
   * from desk's _afterHomeSettled).
   *
   * `openFileLocation`, the SAME opener the warm path uses, so a link behaves
   * identically whether or not the visitor had a session. It is also the only
   * one that loads a note / markdown / text body: openSharedLink resolves those
   * through `if (opt.kind) launch(opt)` with no attributes fetch and no media, so
   * they would open blank. Files only, by construction — file-deep-link's
   * urlWantsFile matches nothing else.
   *
   * The legacy `locationOnStart` restore in route() deliberately stays on
   * openSharedLink: that path predates this one and is left exactly as it was.
   *
   * @param {String} hash a full location.hash
   */
  openDeepLinkHash(hash) {
    if (!hash) return;
    return this.openFileLocation(this._deepLinkPayload(hash));
  }

  /**
   *
   */
  changeModalState(s) {
    this.ensurePart("wrapper-modal").then((p) => {
      p.el.dataset.state = s;
    });
  }

  /**
   * Transient bottom-right "file created" card. Shown after a new
   * document / spreadsheet / presentation is created (newDocument in
   * window/core.js) — the file no longer opens automatically. Clicking
   * the card opens it; the × or the timer dismisses it.
   */
  notifyFileCreated(data = {}) {
    this._createdFile = data;
    clearTimeout(this._createdFileTimer);
    this._createdFileTimer = setTimeout(() => this.dismissFileCreated(), 12000);
    this.ensurePart("file-created-layer").then((p) => {
      p.feed(require("./skeleton/file-created")(this, data));
      p.el.dataset.state = "open";
    });
  }

  dismissFileCreated() {
    clearTimeout(this._createdFileTimer);
    this._createdFile = null;
    this.ensurePart("file-created-layer").then((p) => {
      p.feed([]);
      p.el.dataset.state = "closed";
    });
  }

  /**
   * Open the file announced by the card — the same route newDocument used
   * when it still auto-opened: prefer the grid tile (keeps its seen/spinner
   * wiring), fall back to a detached media widget built from node_info.
   */
  openCreatedFile() {
    const data = this._createdFile || {};
    this.dismissFileCreated();
    if (!data.nid) return;
    const aw = this.getActiveWindow() || this;
    for (let media of aw.getItemsByAttr(_a.nid, data.nid)) {
      if (/^media/.test(media.mget(_a.kind))) {
        media.wait(1);
        return this.openContent(media, { service: "open-node", mode: _a.edit });
      }
    }
    return this.fetchService(
      { service: SERVICE.media.node_info, nid: data.nid, hub_id: data.hub_id },
      { async: 1 },
    )
      .then(async (r) => {
        if (!r || !r.nid) return;
        const k = await Kind.waitFor(_a.media);
        const media = new k({ model: new Backbone.Model(r) });
        this.openContent(media, { service: "open-node", mode: _a.edit });
      })
      .catch((e) => this.warn("openCreatedFile failed", e));
  }

  /**
   *
   * @param {*} l
   * @returns
   */
  route(l) {
    let args = Visitor.parseModuleArgs() || {};
    let path = Visitor.parseModule() || [];

    /** Reset the url to its default value*/
    setTimeout(()=>{
      location.hash='#/desk/wm/home'
    }, Visitor.timeout(5000))

    switch (path[2]) {
      case _a.home:
        return;
      case _a.meeting:
        let media = this.getItemsByAttr(_a.nid, args.nid)[0];
        if (media && media.triggerHandlers) {
          media.triggerHandlers({ service: "open-node", start_meeting: 1 });
          return;
        }
      case _a.chat:
        Desk.openP2Pchat(args);
        return;
      case _a.contact:
        Desk.openContactPanel(args);
        return;
      case _a.teamchat:
      case _a.channel:
      case _a.hub:
        this.loadWorkspace(args);
        return;

      case _a.folder:
      case _a.file:
      case _a.edit:
      case _a.play:
      case _a.open:
        // Opening it now settles any intent armed for the same visit, so the
        // relay below cannot reopen this file later in the tab — the same reason
        // hubDeepLink.clear() is called where that intent is handled directly.
        fileDeepLink.clear();
        this.openFileLocation(args);
        return;

      // Compact twin of `open`: same payload, values carried as path segments
      // instead of a query string (libs/compact-deep-link). Purely additive —
      // the `open` case above is untouched, so every long link already sitting
      // in an inbox, a chat or a notification resolves exactly as before.
      // A malformed compact path `break`s instead of returning, so it lands on
      // the same fallback resolution an unrecognised path has always used
      // rather than dead-ending here.
      case COMPACT_SEGMENT: {
        const compact = parseCompactPath(path);
        if (compact) {
          fileDeepLink.clear();       // settled here — see the `open` case above
          this.openFileLocation(compact);
          return;
        }
        break;
      }
    }
    // Legacy resting-hash restore, unchanged. It cannot carry a link across a
    // sign-in: butler/index.js rewrites `locationOnStart` on every boot and
    // signing in reloads the document, so by then it holds "#/welcome/signin"
    // (measured — boot 1 stored an 83-char hash carrying `nid=`, boot 2 stored
    // 16 chars). That journey is served by libs/file-deep-link instead, armed at
    // module scope in index.web.js and consumed in desk's _afterHomeSettled
    // alongside the billing and workspace-invite intents — the only place proven
    // to run after a sign-in. Left exactly as it behaved before.
    const loc = JSON.parse(localStorage.getItem("locationOnStart")); //"locationOnStart";
    if (loc) {
      let { hash } = loc;
      if (hash) {
        // Stays on openSharedLink — this path predates the relay and keeps the
        // opener (and the checkPrivilegeForHub / _onShareAccessDenied handling)
        // it has always had. Only the parsing is now shared.
        this.openSharedLink(this._deepLinkPayload(hash));
      }
    }
    // Direct folder URL deep link: #@desk/folder?hub_id=HUB_ID[&nid=NID]
    const pathArgs = Visitor.parseModule();
    if (pathArgs[1] === "folder") {
      const params = Visitor.parseModuleArgs();
      if (params.hub_id) {
        Kind.waitFor("window_folder").then(() => {
          const existing = this._findWorkspaceWindow(params.hub_id);
          if (existing) {
            existing.raise();
            return;
          }
          this.launch(
            { kind: "window_folder", hub_id: params.hub_id, nid: params.nid },
            { explicit: 1 },
          );
        });
      }
    }
  }

  /**
   *
   */
  openAccountSettings() {
    this.ensurePart("wrapper-modal").then((p) => {
      p.feed({ kind: "settings_account" });
    });
  }

  /**
   * Show the quota-exceeded card in the shared modal.
   *
   * One helper so every limit reaches the user the same way. Before this each
   * site raised its own bare alert, which is why the product could tell someone
   * they were blocked in four different tones and never once offer the billing
   * screen sitting in the sidebar.
   *
   * The widget decides its own copy from `limit`, and whether to show the
   * upgrade button at all from canUpgradePlan() — callers pass what happened,
   * never what to render.
   *
   * @param {Object} opt
   * @param {String} opt.limit "storage" | "workspace" | "seat"
   * @param {Number} [opt.used] bytes, storage only
   * @param {Number} [opt.cap]  bytes, storage only
   */
  openQuotaExceeded(opt = {}) {
    // No owner gate here. The card already adapts to who is looking: for
    // anyone who cannot buy it drops the Upgrade button and closes with
    // "Ask your workspace owner…" (quota-exceeded/skeleton `closingLine`).
    // Suppressing it instead left a member clicking Invite / Add member and
    // getting nothing back at all, which reads as a broken button rather
    // than a plan limit.
    return this.ensurePart("wrapper-modal").then((p) => {
      if (!p) return;
      p.feed({
        kind: "quota_exceeded",
        limit: opt.limit || "storage",
        used: opt.used,
        cap: opt.cap,
        // Free has no seats at all, so the seat card must not talk about
        // reaching the Team limit. This list is a whitelist — a flag missing
        // from it is silently dropped, which is how the Free copy first went
        // unused.
        free: opt.free,
      });
      // data-state="open" is what makes the host a full-viewport centring flex
      // container (see wm/skin __wrapper-modal). feed() alone does not: without
      // it the card renders unpositioned in a plain block with the desk behind.
      //
      // NO BACKDROP. data-overlay is cleared to "none" rather than left unset,
      // because this host is SHARED — reward-flow and the create-folder dialog
      // both open it with data-overlay="blur", and an attribute one of them
      // left behind would dim the desk behind this card without anything here
      // asking for it. Explicitly off, not merely not-on.
      if (p.el) {
        p.el.dataset.state = "open";
        p.el.dataset.overlay = "none";
      }
    });
  }

  /**
   * Take the quota card down.
   *
   * Clearing the content is NOT enough: with the tree gone but
   * data-state="open" still set, the host stays a full-viewport invisible
   * blocker over the desk and nothing is clickable. reward-flow hit this and
   * documents it; the state has to come off with the content.
   */
  closeQuotaExceeded() {
    return this.ensurePart("wrapper-modal").then((p) => {
      if (!p) return;
      if (p.clear) p.clear();
      if (p.el) {
        p.el.dataset.state = "";
        p.el.dataset.overlay = "";
      }
    });
  }

  openCreateFolderDialog() {
    this.ensurePart("wrapper-modal").then((p) => {
      p.feed(
        require("builtins/window/folder/skeleton/create-folder-dialog")(this),
      );
      p.el.dataset.mode = "create-folder";
    });
    this.ensurePart("create-folder-name").then(
      (entry) => entry.focus && entry.focus(),
    );
  }

  closeCreateFolderDialog() {
    return this.ensurePart("wrapper-modal").then((p) => {
      p.el.dataset.mode = "";
      p.clear();
    });
  }

  createFolderFromDialog(cmd) {
    if (this._creatingFolder) return;
    this._creatingFolder = 1;
    const entry = this.getPart("create-folder-name");
    const value =
      (cmd.getValue && cmd.getValue()) ||
      (entry && entry.getValue && entry.getValue()) ||
      LOCALE.NEW_FOLDER;
    const filename = String(value).trim() || LOCALE.NEW_FOLDER;
    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(filename)) {
      this._creatingFolder = 0;
      return this.alert(LOCALE.INVALID_FILENAME);
    }

    const onHome = !this._curWorkspace;
    const hub_id = onHome ? Visitor.id : this._curWorkspace.hub_id;
    const nid = onHome ? Visitor.get(_a.home_id) : this._curWorkspace.nid;
    const area = onHome ? _a.personal : this._curWorkspace.area;
    if (!nid) {
      this._creatingFolder = 0;
      return this.alert(LOCALE.TRY_AGAIN);
    }
    return this.postService(SERVICE.media.make_dir, {
      hub_id,
      dirname: filename,
      filename,
      nid,
      notify: 1,
      socket_id: Visitor.get(_a.socket_id),
      seeding: 1,
      echoId: this.mget("echoId"),
      area,
    })
      .then((data) => {
        if (data && data.error) {
          return this.alert(LOCALE[data.error] || data.error);
        }
        this.closeCreateFolderDialog();
        this.ensurePart(_a.list).then((list) => {
          if (!list || (list.isDestroyed && list.isDestroyed()) || !data)
            return;
          const curHubId = this._curWorkspace
            ? this._curWorkspace.hub_id
            : Visitor.id;
          const curNid = this._curWorkspace
            ? this._curWorkspace.nid
            : Visitor.get(_a.home_id);
          if (curHubId != hub_id || curNid != nid) return;
          if (data.pid && data.pid != nid) return;
          data.kind = this._getKind();
          data.service = "open-node";
          data.uiHandler = [this];
          if (data.position >= 0) list.append(data, data.position);
          else list.append(data);
          if (this.getViewMode && this.getViewMode() !== _a.row) {
            this._partitionFoldersAndFiles(list);
          }
        });
        // Resolve to the created folder so callers can tell success from the
        // handled-failure paths (invalid name / server error) that resolve
        // undefined — the reward-flow Step 1 guide relies on this to avoid
        // advancing when nothing was actually created.
        return data;
      })
      .catch((e) => {
        this.warn("Failed to create folder", e);
        this.alert(e.reason || e.error || LOCALE.TRY_AGAIN);
      })
      .finally(() => {
        this._creatingFolder = 0;
      });
  }

  /**
   * Find a headless workspace window already open for the given hub_id.
   * Searches headlessLayer only — headless windows never live in windowsLayer.
   * Returns null if none is open or all are mid-destroy.
   */
  _findWorkspaceWindow(hub_id) {
    if (!hub_id || !this.headlessLayer || !this.headlessLayer.children)
      return null;
    for (const c of this.headlessLayer.children.toArray()) {
      if (!c || c.isDestroyed()) continue;
      if (c.mget(_a.kind) !== "window_folder") continue;
      if (!c.mget(_a.headless)) continue;
      if (c.mget(_a.hub_id) == hub_id) return c;
    }
    return null;
  }

  /**
   * Headless mode entry point — called when the user opens a workspace from
   * the sidebar. Mounts a headless window_folder into headlessLayer (replacing
   * any previous one) so that all subsequent windows open within that context.
   * Accepts any of actual_home_id / home_id / nid / id as the root directory
   * id; falls back to a media.attributes fetch when none is set.
   * No-ops when the same hub_id+nid is already active.
   *
   * A caller that knows only the hub (a deep link, a message hit) must reach the
   * fetch below with nid ZERO, not with nid unset — see _rootNid.
   */
  loadWorkspace(workspace) {
    const data = workspace.model ? workspace.model.toJSON() : workspace || {};
    const hub_id = data.hub_id || data.id;
    let nid = data.actual_home_id || data.home_id || data.nid;
    data.nid = nid;
    // Capture the workspace name from the clicked item now: inside `apply` the
    // `data` param shadows this one with media.attributes (empty root filename),
    // so seeding it lets the window open already named instead of waiting on the
    // async get_path.
    const workspaceName =
      data.filename || data.name || data.hub_name || data.workspace_name;

    if (!hub_id) {
      this.warn("loadWorkspace: missing hub_id", data);
      return;
    }

    if (
      this._curWorkspace &&
      this._curWorkspace.hub_id == hub_id &&
      this._curWorkspace.nid == nid
    ) {
      // Already the current workspace — but its pane may be covered by a
      // popup folder window (the active window fully occludes the rest).
      // Raise it so re-clicking the sidebar item always brings it back.
      const pane = this._findWorkspaceWindow(hub_id);
      if (pane && pane.el.dataset.state !== "1") pane.raise();
      return;
    }
    Desk.closeAllPanels();
    // The call survives a workspace switch now (it lives in the call layer, not
    // in the headlessLayer this method re-feeds) — park it in its corner tile so
    // it doesn't cover the workspace the user just opened. No-op without a call.
    this.parkLiveCall();
    // Close any settings/admin/apps panel that would occlude the workspace
    // grid. Sidebar workspace items dispatch directly to Wm.loadWorkspace
    // (not through desk.onUiEvent), so cleanup must live here too. Only
    // close when actually opening a NEW workspace (not when raising an
    // existing tab) — otherwise switching tabs would close shared panels.
    if (window.Desk && _.isFunction(window.Desk._closeMainPanels)) {
      window.Desk._closeMainPanels();
    }

    // Set the context synchronously with whatever we have. The sidebar's
    // desk.home payload only carries hub_id (no actual_home_id), so the
    // nid often arrives later via the get_attributes fetch below.
    this._wsGeneration = (this._wsGeneration || 0) + 1;
    const gen = this._wsGeneration;
    const apply = (data) => {
      if (gen !== this._wsGeneration) return;
      this._curWorkspace = { hub_id, nid: data.nid, area: data.area };
      this.mset(data);
      this.headlessLayer.feed({
        kind: "window_folder",
        hub_id,
        ...data,
        headless: 1,
        filename: data.filename || data.name,
        // Seed the name synchronously so the title and root crumb are correct
        // from first paint, without waiting on get_path.
        hub_name: data.hub_name || workspaceName,
        // Headless workspace lives in its own singleton pool, which is headlessLayer.
        // subfolders or players open from the workspace shall go to this pool.
        // docs/superpowers/specs/2026-05-22-multi-folder-windows-design.md.
        wm_unique_id: `window_folder-${hub_id}`,
      });
      this.ensurePart("wrapper-modal").then((p) => p.clear());
      // By KIND, not by position: headlessLayer also receives every explicitly
      // launched window (a player, the Drive popup...), so children.last() is
      // whatever the user opened most recently — see Wm.folderWindowIn.
      let cur = this.folderWindowIn(this.headlessLayer);
      if (cur) {
        cur.once(_a.destroy, () => {
          // On a workspace switch the OLD pane's destroy fires after the new
          // context is already applied — only clear when this pane still owns it,
          // else rapid switching leaves _curWorkspace null for the live pane.
          // hub_id-only match is enough here: headlessLayer is a singleton pool
          // and a hub's workspace root nid never changes.
          if (this._curWorkspace && this._curWorkspace.hub_id == hub_id) {
            this._curWorkspace = null;
          }
        });
      }
      // Drive the VISIBLE desk topbar breadcrumb (desk_breadcrumb) on the
      // workspace switch. The get_path → refreshBreadcrumbsUI call below also
      // mirrors into the topbar, but only once it resolves AND only while the
      // headless window is focused (state==1); firing here gives the breadcrumb
      // an immediate, unconditional update. The topbar listens to the
      // "breadcrumb:content" broadcast (source must be Wm) — same path
      // loadWorkspaceNode uses. Without this, switching workspace can leave the
      // topbar breadcrumb stale (e.g. stuck on a Settings/Contacts section).
      this.updateBreadcrumb({ ...data, service: "change-workspace" }, this);
      // data.nid (what media.attributes RESOLVED), not the outer nid: a caller that
      // knew only the hub left that undefined, and get_path would be asked for the
      // path of "undefined" — the same defect as the fetch above, and it left the
      // breadcrumb stuck on the previous screen. openWorkspaceFolder already does
      // it this way (attrs.nid || nid).
      // Deferred so it cannot outrun the window's OWN content request. feed()
      // above mounts window_folder, whose list issues media.show_node_by a
      // microtask later; this call used to run synchronously right here and so
      // reached the endpoint first. That ordering is expensive: libs/path-request
      // documents that mfs_get_path builds a temporary table per call (173ms, and
      // 404ms-3013ms for a concurrent twin) and delays whatever is queued behind
      // it — which was the file grid, the one thing the user is waiting for.
      // The breadcrumb is cosmetic and already got its immediate local update
      // from updateBreadcrumb() above, so it can afford to go last.
      _.defer(() => {
        getPath(this, { nid: data.nid || nid, hub_id })
          .then((path) => {
            if (_.isEmpty(path)) return;
            // Resolved again HERE, not reused from above: feed() may not have
            // mounted the new pane yet when this callback was set up, and a
            // second switch may have replaced it while the path was in flight.
            const w = this.folderWindowIn(this.headlessLayer);
            if (w && _.isFunction(w.refreshBreadcrumbsUI)) w.refreshBreadcrumbsUI(path);
          })
          // Without this the throw above escaped as an unhandledrejection —
          // which is exactly how it reached production unnoticed.
          .catch((e) => this.warn?.("loadWorkspace: breadcrumb refresh failed", e));
      });
    };

    // nid often arrives later via the media.attributes fetch below. The
    // topbar's "+ Add new" check only needs hub_id to flip to folder
    // creation mode — nid can fill in asynchronously.
    this._curWorkspace = { hub_id, nid, area: data.area };
    this.mset({
      hub_id,
      nid,
      nodeId: nid,
      area: data.area,
      ownpath: data.ownpath, // "/",
      home_id: nid,
    });

    // Data provided by the trigger may not be reliable enough. Get fresh one.
    // _rootNid, not the raw nid: a caller that knows only the hub leaves nid unset,
    // and fetchService would put the literal string "undefined" on the query.
    this.fetchService(SERVICE.media.attributes, { hub_id, nid: this._rootNid(nid) })
      .then((attrs) => {
        const resolved =
          attrs && (attrs.actual_home_id || attrs.home_id || attrs.nid);
        if (!resolved) {
          this.warn("loadWorkspace: cannot resolve workspace root", {
            hub_id,
            attrs,
          });
          // The pane never mounted but _curWorkspace was already set above —
          // release it so re-clicking the sidebar item can retry the mount
          // instead of hitting the same-workspace early-return.
          this._releaseWorkspaceContext(hub_id, nid);
          return;
        }
        try {
          workspace.model && workspace.model.set(attrs);
        } catch (e) { }
        apply(attrs);
      })
      .catch((e) => {
        this.warn("loadWorkspace: get_attributes failed", e);
        this._releaseWorkspaceContext(hub_id, nid);
      });
  }

  /**
   * The nid to ASK media.attributes for when the caller may not know one.
   *
   * Zero is not a cosmetic default, it is the server's own "give me this hub's
   * root" value: the ACL maps nid ''/0/-1/-2/-3 onto the hub's home_id before
   * resolving the node (server-core lib/acl.js check_env), which is also why every
   * workspace deep link in this app is written `nid=0` (desk/index.js, activity
   * rows).
   *
   * Leaving nid unset is NOT equivalent, and that is the bug this exists to stop:
   * fetchService builds a GET query with `encodeURI(v)` per key, so an undefined
   * nid arrives as the four-character string "undefined". That matches no root
   * shortcut and no node — mfs_access_node returns zero rows — so the request
   * resolves nothing and the workspace silently never opens ("loadWorkspace:
   * cannot resolve workspace root"). A caller with only a hub_id, such as the
   * workspace-invite deep link or a message hit, hits exactly that.
   *
   * @param {String|Number} [nid]
   * @returns {String|Number} nid, or 0 when there is none to send
   */
  _rootNid(nid) {
    return nid == null || nid === "" ? 0 : nid;
  }

  // Clear _curWorkspace only if it still points at the given workspace —
  // used by loadWorkspace's failure paths so a failed mount never blocks
  // re-opening, without clobbering a newer workspace's context.
  _releaseWorkspaceContext(hub_id, nid) {
    if (
      this._curWorkspace &&
      this._curWorkspace.hub_id == hub_id &&
      this._curWorkspace.nid == nid
    ) {
      this._curWorkspace = null;
    }
  }

  /**
   * Called by a headless `window_folder` when it gains focus (state→1).
   * Mirrors the window's stored context into the globals every other
   * subsystem reads from (`_curWorkspace`, `Wm.mset`, sidebar highlight,
   * breadcrumb) so all existing consumers keep working as today — they
   * just now reflect whichever workspace tab is on top.
   */
  onWorkspaceRaised(win) {
    if (!win || win.isDestroyed()) return;
    if (win.mget(_a.kind) !== "window_folder" || !win.mget(_a.headless)) return;

    const hub_id = win.mget(_a.hub_id);
    if (!hub_id) return;

    const nid =
      win.mget(_a.nid) || win.mget(_a.actual_home_id) || win.mget(_a.home_id);
    const area = win.mget(_a.area);
    const ownpath = win.mget(_a.ownpath) || "/";
    const home_id = win.mget(_a.actual_home_id) || win.mget(_a.home_id) || nid;

    // Idempotent: skip the broadcast if globals already reflect this window.
    const cur = this._curWorkspace;
    const sameContext =
      cur && cur.hub_id == hub_id && cur.nid == nid && cur.area == area;

    this._curWorkspace = { hub_id, nid, area };
    this.mset({ hub_id, nid, nodeId: nid, area, ownpath, home_id });

    // Clicking/raising a workspace marks its chat as read.
    RADIO_BROADCAST.trigger("chat:read", { hub_id, nid, area });

    if (!sameContext) {
      RADIO_BROADCAST.trigger("workspace:focus", { hub_id, nid, area });
      this.updateBreadcrumb(
        {
          hub_id,
          nid,
          area,
          filename: win.mget(_a.filename) || win.mget(_a.name),
          service: "change-workspace",
        },
        this,
      );
    }
  }

  /**
   * Navigate into a child node (folder/file) within a workspace.
   * Used by `load-folder` UI events from the sidebar subtree.
   */
  loadWorkspaceNode(node) {
    const data = node.model ? node.model.toJSON() : node || {};
    const hub_id = data.hub_id || data.id;
    const isWorkspace = data.nodeRole === "workspace";
    const nid = isWorkspace
      ? data.actual_home_id || data.home_id || data.nid
      : data.nid || data.actual_home_id || data.home_id;
    // Workspace root → '/'; folder → its own ownpath/filepath as reported by
    // show_node_by. Without this, uploads dropped here inherit a stale path
    // and the server stores them at the previous parent.
    const ownpath = isWorkspace ? "/" : data.ownpath || data.filepath || "/";
    // home_id stays at the workspace root nid even when navigating into a
    // subfolder, so cross-window drops keep classifying as MOVE.
    const home_id = isWorkspace
      ? nid
      : data.actual_home_id ||
      data.home_id ||
      data.workspace_nid ||
      this.mget(_a.home_id) ||
      nid;
    this._curWorkspace = { hub_id, nid, area: data.area };
    this.mset({ hub_id, nid, nodeId: nid, area: data.area, ownpath, home_id });
    // Clicking into a folder marks the workspace chat as read.
    RADIO_BROADCAST.trigger("chat:read", { hub_id, nid, area: data.area });
    this.ensurePart(_a.list).then((l) => {
      l.setApi({ service: SERVICE.media.show_node_by, hub_id, nid });
      if (l.collection) l.collection.reset();
      l.el.style.visibility = "hidden";
      const scrollEl = l.el.querySelector(".smart-container");
      if (scrollEl) {
        scrollEl.dataset.partitioning = 1;
        scrollEl.style.visibility = "hidden";
      }
      l.restart();
      this._prepareListPartition(l);
    });
    this.ensurePart("wrapper-modal").then((p) => p.clear());
    // Sidebar nav reloads the desk container in-place; preserve open windows.
    this.updateBreadcrumb({ ...data, service: "change-workspace" }, this);
  }

  /**
   * Sidebar sub-folder click: load the folder's contents into the desk
   * container's grid in-place. Does NOT launch a folder window and does
   * NOT touch already-open folder windows. Breadcrumb resolves the full
   * Home › Workspace › Folder path via the change-workspace broadcast.
   */
  openWorkspaceFolder(node) {
    const data = node.model ? node.model.toJSON() : node || {};
    // Close any settings/admin/apps/chat panel occluding the desk grid before
    // navigating into a folder. Done up front so it runs on every branch —
    // including the early return below when the target folder window is already
    // open. (Method is `closeMainPanels`, not `_closeMainPanels`.)
    if (window.Desk && _.isFunction(window.Desk.closeMainPanels)) {
      window.Desk.closeMainPanels();
    }
    let media = Wm.getItemsByAttr(_a.nid, data.nid)[0];
    if (media) {
      return media.triggerHandlers({ service: "open-node" });
    }
    const hub_id = data.hub_id || data.workspace_hub_id || data.id;
    // Use the sub-folder's own nid; fall back to workspace root only when
    // the node carries no nid (e.g. the row clicked is the workspace root).
    const nid =
      data.nid || data.actual_home_id || data.home_id || data.workspace_nid;

    if (!hub_id || !nid) return this.loadWorkspaceNode(node);

    // Data provided by the trigger may not be reliable enough. Get fresh one
    this.fetchService(SERVICE.media.attributes, { hub_id, nid })
      .then((attrs) => {
        const resolved =
          attrs && (attrs.actual_home_id || attrs.home_id || attrs.nid);
        if (!resolved) {
          this.warn("loadWorkspace: cannot resolve workspace root", {
            hub_id,
            attrs,
          });
          return;
        }
        // Same trap as loadWorkspace above: the pool's last child is whatever
        // was launched most recently, not necessarily the folder window, and
        // refreshContent below is a folder-only method (Wm.folderWindowIn).
        let currentFolder = this.folderWindowIn();
        if (!currentFolder || !_.isFunction(currentFolder.refreshContent)) return;
        currentFolder.refreshContent(attrs);
        // refreshContent can't infer the ancestor chain for a deep jump, so the
        // breadcrumb would keep the previous folder's crumbs. Rebuild it from
        // get_path, as loadWorkspace does.
        const deepNid = attrs.nid || nid;
        // Deferred for the same reason as in loadWorkspace: refreshContent()
        // above kicks off this folder's media.show_node_by, and get_path issued
        // in the same tick would reach the endpoint first and hold the listing
        // behind its temporary-table build (see libs/path-request).
        _.defer(() => {
          getPath(this, { nid: deepNid, hub_id })
            .then((path) => {
              if (_.isEmpty(path)) return;
              if (_.isFunction(currentFolder.refreshBreadcrumbsUI))
                currentFolder.refreshBreadcrumbsUI(path);
              // Drive the visible desk topbar breadcrumb (desk_breadcrumb) for the
              // folder navigation. refreshBreadcrumbsUI above also mirrors into the
              // topbar, but only when `currentFolder` is the focused headless
              // workspace window; this explicit broadcast covers the case where it
              // isn't. The topbar listens to "breadcrumb:content" (source must be Wm).
              this.updateBreadcrumb({ ...attrs, service: "change-workspace" }, this);
            })
            .catch((e) => this.warn("openWorkspaceFolder: get_path failed", e));
        });
      })
      .catch((e) => this.warn("loadWorkspace: get_attributes failed", e));

  }

  openContent(media, args) {
    if (
      media &&
      media.mget &&
      media.mget(_a.filetype) === _a.hub &&
      media.mget(_a.status) !== _a.deleted
    ) {
      const item = this.getWindowPreset(media);
      item.kind = "window_folder";
      item.service = 'raise' /** To prevent re-entering openContent  */
      const existingHeadless = this._findWorkspaceWindow(item.hub_id);
      if (existingHeadless) {
        existingHeadless.raise();
        return false;
      }
      /** It is important to be abale to open more than one window, uers may need to move files between folders */
      /** Use option sigleton to ensure one single window */
      return this.launch(item, { explicit: 1 });
    }
    return super.openContent(media, args);
  }

  getCurrentNid() {
    if (this._curWorkspace?.nid != null) return this._curWorkspace.nid;
    return super.getCurrentNid();
  }

  actualNode() {
    if (this._curWorkspace?.hub_id && this._curWorkspace?.nid != null) {
      return {
        ...super.actualNode(),
        hub_id: this._curWorkspace.hub_id,
        nid: this._curWorkspace.nid,
      };
    }
    return super.actualNode();
  }

  /**
   *
   */
  // Kept for the admin-console plugin (cross-plugin caller) + any legacy
  // reference. Billing is now a FULL PAGE in the desk settings-main-slot, not a
  // popup — delegate to the desk module via RADIO so we don't need a direct
  // module reference from the window manager.
  upgradePlage() {
    RADIO_BROADCAST.trigger("desk:open-billing-page");
  }

  /**
   * Stripe Checkout lands back on the app with ?checkout=success&session_id=…
   * or ?checkout=cancel (callback.check_out_*). Surface the payment result
   * modal (design: "Payment Success!" / "Payment Failure!") and scrub the
   * query string so a reload doesn't replay it.
   */
  checkCheckoutReturn() {
    let params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    const flag = params.get("checkout");
    if (!flag) return;
    const session_id = params.get("session_id") || "";
    try {
      params.delete("checkout"); params.delete("session_id");
      const qs = params.toString();
      history.replaceState(null, "", `${location.pathname}${qs ? "?" + qs : ""}${location.hash}`);
    } catch (e) { /* cosmetic */ }
    Kind.waitFor("settings_billing_result").then(() => {
      this.ensurePart("wrapper-modal").then((p) => {
        p.feed({
          kind: "settings_billing_result",
          result: flag === "success" ? "success" : "cancel",
          session_id,
          uiHandler: [this],
        });
      });
    });
  }

  /**
   *
   */
  fetchMediaAttributes(opt) {
    return this.fetchService(
      {
        service: SERVICE.media.node_info,
        nid: opt.nid,
        hub_id: opt.hub_id,
      },
      { async: 1 },
    )
      .then((r) => {
        if (r && r.status == 403) {
          return this._onShareAccessDenied(opt);
        }
        let m = new Backbone.Model(r);
        opt = _.merge(opt, r);
        Kind.waitFor(_a.media).then((k) => {
          opt.media = new k({ model: m });
          this.launch(opt, { explicit: 1 });
        });
      })
      .catch((e) => {
        //this.warn("EEE:108", e);
        this.alert(LOCALE.ERROR_SERVER);
      });
  }

  /**
   * Open chat-p2p panel and start chat with the given user.
   * Used by user-mention click handler.
   */
  _openChatWithUser(drumate_id) {
    if (!drumate_id) return;

    Desk.ensurePart("chat-panel").then((panel) => {
      if (panel.isEmpty()) {
        Desk.togglePanel("chat_p2p", "chat-panel");
      }

      const tryOpen = (retries = 20) => {
        const widget =
          panel.children && panel.children.last && panel.children.last();
        if (widget && _.isFunction(widget.openChatByPeerId)) {
          try {
            widget.openChatByPeerId(drumate_id);
          } catch (e) {
            this.warn("Failed to open chat with user", e);
          }
          return;
        }
        if (retries > 0) {
          setTimeout(() => tryOpen(retries - 1), 200);
        }
      };

      setTimeout(tryOpen, 300);
    });
  }

  /**
   *
   */
  checkUserInteraction() {
    if (localStorage.skipUiCheck || localStorage.developerMode == _a.enable) {
      return;
    }

    setTimeout(() => {
      if (this._userHasInteracted) return;
      this._userHasInteracted = 1;
      Visitor.playSound(_K.notifications.std, 0);
    }, Visitor.timeout(10000));

    RADIO_POINTER.once(_e.mousedown, () => {
      this._userHasInteracted = 1;
      this.alert();
    });
  }

  // /**
  //  *
  //  */
  // loadReminders() {
  //   this.postService(
  //     {
  //       hub_id: Visitor.id,
  //       nid: Visitor.get(_a.home_id),
  //       service: SERVICE.reminder.list,
  //     },
  //     { async: 1 },
  //   ).then((data) => {
  //     if (!data || !data.length) return;
  //     for (let c of data) {
  //       if (_.isString(c.task)) c.task = JSON.parse(c.task);
  //       if (c.task && c.task.kind) {
  //         c.kind = c.task.kind;
  //         delete c.task.kind;
  //         if (c.task.style) c.pin = c.task.style;
  //         c.task.filename = c.filename || LOCALE.NOTE;
  //         if (c.task.repeat == "onload") {
  //           this.getWindowsPool().append(c);
  //         } else if (c.task.stime && c.task.stime > Dayjs().valueOf()) {
  //           setTimeout(() => {
  //             this.getWindowsPool().append(c);
  //           }, c.task.stime - Dayjs().valueOf());
  //         }
  //       }
  //     }
  //   });
  // }

  /**
   * @param {Object} opt
   */
  checkPrivilegeForHub(opt) {
    return this.fetchService(
      {
        service: SERVICE.media.node_info,
        nid: opt.nid,
        hub_id: opt.hub_id,
      },
      { async: 1 },
    )
      .then((data) => {
        if (data.status == 403) {
          return this._onShareAccessDenied(opt);
        }
        Kind.waitFor(_a.media).then((k) => {
          data.role = _a.url;
          let m = new Backbone.Model(data);
          opt.media = new k({ model: m });
          return this.openFileLocation(opt.media);
        });
      })
      .catch(() => {
        this.alert(LOCALE.WEAK_PRIVILEGE);
      });
  }

  /**
   * Permission denied while a signed-in user opens a secure-shared node.
   * When a secure-share token is in scope (the user reached the desk through a
   * share link) show the "You don't have permission" → Request access modal
   * (secure-share v2, Figma 1961:115796). With no token, fall back to the plain
   * alert so ordinary member 403s behave exactly as before.
   */
  _onShareAccessDenied(opt = {}) {
    const token =
      Visitor.get(_a.token) || localStorage.getItem("token") || "";
    // Only treat a 403 as a secure-share access request when it's for the SAME
    // workspace the share token belongs to (stored at share login). Otherwise an
    // unrelated desk 403 after a share visit would wrongly pop the Request Access
    // modal — fall back to the normal privilege alert. When no share hub is known
    // (older/public-share sessions) keep the prior best-effort behaviour.
    const shareHub = localStorage.getItem("share_hub_id") || "";
    if (!token || (shareHub && opt.hub_id && opt.hub_id !== shareHub)) {
      return this.alert(LOCALE.WEAK_PRIVILEGE);
    }
    return this.openRequestAccessModal({
      token,
      hub_id: opt.hub_id,
      nid: opt.nid,
    });
  }

  /**
   * Feed the request-access modal into the centred, blurred wrapper-modal slot.
   */
  openRequestAccessModal(opt = {}) {
    return this.ensurePart("wrapper-modal").then((p) => {
      p.clear();
      p.el.dataset.state = "open";
      p.el.dataset.overlay = "blur";
      p.feed({
        kind: "request_access_modal",
        token: opt.token,
        hub_id: opt.hub_id,
        nid: opt.nid,
      });
    });
  }

  /**
   *
   */
  bindWsEvents() {
    let expected = [
      SERVICE.signaling.dial,
      SERVICE.signaling.notify,
      "live",
      "adminpanel",
    ];
    uiRouter.ensureWebsocket().then(() => {
      let timer = setInterval(() => {
        let activeEvents = wsRouter.hasListener(this);
        if (activeEvents && _.isArray(activeEvents)) {
          let missing = activeEvents.filter((p) => {
            if (!expected.includes(p)) {
              return 1;
            }
            return 0;
          });
          if (!missing.length) {
            clearInterval(timer);
          }
        } else {
          this.bindEvent(
            SERVICE.signaling.dial,
            SERVICE.signaling.notify,
            "live",
            "adminpanel",
          );
          this.updatePeersState();
        }
      }, 2000);
    });
  }

  /**
   * To do : allow copy/paste/supp through keyboard short cut
   */
  _handelKbdEvents(e) { }

  /**
   * Home-grid filter — drop hub-symlinks for non-collaborative areas
   * (personal, dmz/wicket, public, …). Folders/files at home root must
   * pass through unchanged: mfs_show_node_by's IFNULL(area, _hub_area)
   * stamps them with the home hub's area='personal', so a flat area
   * filter would erase them. Hence the filetype guard.
   * Collaborative set is {share, private, restricted, public} — `private` here
   * is the UX "restricted" workspace, not the personal hub.
   * No-op once the user has navigated into a sub-workspace.
   */
  onPartReady(child, pn) {
    if (pn === _a.list) {
      // Warm BOTH of folder_task's steps while the grid that triggers it
      // renders, so neither the first tile click nor the step boundary inside
      // the tour pays a round trip.
      if (typeof Kind !== "undefined" && _.isFunction(Kind.waitFor)) {
        Promise.resolve(Kind.waitFor("tutorial_folder")).catch(() => {});
        Promise.resolve(Kind.waitFor("tutorial_task")).catch(() => {});
      }
    }
    if (pn === _a.list && child && !child._homeGridFilterInstalled) {
      child._homeGridFilterInstalled = 1;
      const original = child.prepareData.bind(child);
      const wm = this;
      child.prepareData = function (data) {
        const prepared = original(data) || [];
        const atHome =
          !wm._curWorkspace || wm._curWorkspace.hub_id === Visitor.id;
        if (!atHome) return prepared;
        return prepared.filter((it) => {
          if (!it || it.filetype !== _a.hub) return true;
          return /^(share|private|restricted|public)$/.test(it.area);
        });
      };
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  onDomRefresh() {
    // Secure-share recipients who signed in from a share link return to that link
    // now — the desk has booted and the tab is authenticated. welcome persists the
    // target in sessionStorage because login does a full page reload that wipes any
    // in-memory flag. Takes precedence over the hub deep-link (the recipient is
    // usually not a member of the share's hub). One-shot; only set during a secure-
    // share login, so a normal desk load is unaffected.
    const _ssReturn = sessionStorage.getItem('drumee_secure_share_return');
    if (_ssReturn) {
      sessionStorage.removeItem('drumee_secure_share_return');
      // clear(), not a single removeItem: the intent now lives on two shelves
      // (libs/hub-deep-link) and a secure-share return must beat both.
      hubDeepLink.clear();
      location.href = _ssReturn;
      return;
    }
    this.feed(require("./skeleton")(this));
    // Capture hub_id synchronously before any async ops so hash changes cannot lose it.
    //
    // ONLY the explicit hash form opens immediately: #/desk/wm/hub?hub_id=… is an
    // in-app navigation the user just made (accept_invite lands here), so asking
    // them to confirm would be asking twice. An intent ARMED by the welcome module
    // is deliberately left alone for desk's _maybeOfferInvitedWorkspace to consume
    // once Home has settled — it prompts "Open Workspace / Cancel" first, and it
    // waits out the full-screen reward / LAUNCH30 popups that this boot path
    // cannot see.
    const _path = Visitor.parseModule() || [];
    const _args = Visitor.parseModuleArgs() || {};
    const _hubId = (_path[2] === _a.hub && _args.hub_id) ? _args.hub_id : '';
    if (_hubId) {
      // Opening it now settles any armed intent for the same visit, so the prompt
      // does not follow up about a workspace already on screen.
      hubDeepLink.clear();
      this.ensurePart('headless-layer').then(() => {
        this.loadWorkspace({ hub_id: _hubId });
      });
    }
    this.fetchService(
      SERVICE.desk.get_env,
      { hub_id: Visitor.id },
      { async: 1 },
    ).then((data) => {
      if (_.isEmpty(data)) return;
      if (data.home_id) this.mset(data);
      if (data.wicket_id) {
        Visitor.set({ wicket_id: data.wicket_id });
      }
      this.trigger(_e.ready);
      Visitor.set({ disk: data.disk });
      this.bindWsEvents();
    });
    this.visible = !document.hidden;
    document.onvisibilitychange = async (e) => {
      if (!this.visible) {
        ActivityHandler && ActivityHandler.resync();
        await uiRouter.ensureWebsocket();
        this.updatePeersState();
      }
      this.visible = !document.hidden;
    };
    // this.loadReminders();

    window.addEventListener("online", () => {
      ActivityHandler && ActivityHandler.resync();
    });
  }

  /**
   *
   */
  showDiskUsage() {
    this.alert(require("./skeleton/disk-usage")(this));
  }

  /**
   *
   */
  async playTutorial(name) {
    let data = await this.fetchService(
      SERVICE.yp.tutorial,
      { name },
      { async: 1 },
    );
    if (!data || !data.src) return null;
    const { protocol } = bootstrap();
    if (!/^(http|file)/.test(data.src)) data.src = `${protocol}://${data.src}`;
    await Kind.waitFor("video_viewer");

    let items = this.getItemsByKind("video_viewer");
    if (items && items.length) {
      for (var item of items) {
        if (item.mget(_a.type) == "tutorial") {
          item.mould(data);
          return item;
        }
      }
    }
    let c = this.getWindowsPool().append({
      kind: "video_viewer",
      type: "tutorial",
      src: data.src,
    });
    return c;
  }

  /**
   *
   */
  _openDefault() { }

  /**
   *
   */
  make_default_dirs() {
    this.postService({
      service: SERVICE.media.make_root_dirs,
      folders: [LOCALE.DOCUMENTS, LOCALE.PHOTOS, LOCALE.VIDEOS, LOCALE.MUSICS],
    });
  }

  /**
   * Capture the moving media
   * When several browsers are open and overlapping, the most highest z-index is the target
   * Selecting insertion point is locked then on children of that target
   * @param {*} moving
   * @returns
   */
  capture(moving) {
    if (!moving) return;
    this._target = null;
    const t = this.selectWindow(moving);

    if (!t) {
      return;
    }
    if (t.isWallpaperSettings) {
      t.seek_insertion(moving);
      return t;
    }
    this._target = t.seek_insertion(moving);
    if (!this._target) {
      if (this._prevOver) {
        this._prevOver.overed(_a.off, moving);
      }
      return;
    }
    if (this._lastTaget && this._lastTaget != this._target) {
      // _lastTaget is a window widget, so the old _.isFunction guard never
      // passed and tiles in the previous window stayed pushed aside when the
      // drag crossed into another window. resetShift is the per-window
      // release (interact/index.js).
      if (_.isFunction(this._lastTaget.resetShift)) {
        this._lastTaget.resetShift();
      }
    }
    this._lastTaget = this._target;
    this.moveAllowed(moving);

    const targetPOS =
      (this._target.bbox.y || 0) + (this._target.bbox.h || 0) - 10;
    const movingPOS = (moving.bbox.y || 0) + (moving.bbox.h || 0);
    if (targetPOS < movingPOS) {
      this._target.scrollToBottom();
    }
  }

  /**
   *
   * @param {*} moving
   * @returns
   */
  insert(moving) {
    const selected = this.getGlobalSelection();
    let files = [moving];

    if (selected.length > 0) {
      files = selected;
    }

    _.delay(this.clearShift.bind(this), 1000);

    if (this._target == null) {
      const t = this.selectWindow(moving);
      moving.mset({ logicalParent: t });
      return false;
    }

    const dest = this._target;
    const c = this._target.captured;
    let position = 0;
    this._target.el.dataset.over = _a.off; //to show the fileDragDrop is over
    if (c.over) {
      for (let file of Array.from(files)) {
        c.over.moveIn(file);
      }
      return true;
    }

    // Slot positions are collection indexes (insertMedia hands them to
    // collection.add {at:...}), so they must be read with listIndex() —
    // index() returns the stored rank, which only tracks the display order
    // while the window is sorted by rank.
    //
    // Rearranging means moving a tile WITHIN its own window. Dragging one in
    // from elsewhere is a move: it lands in the slot, but it must not flip
    // the destination to rank order behind the user's back.
    // getLogicalParent() rather than the raw property: the latter is only
    // populated lazily by that getter, so it is often still undefined here.
    const rearranging =
      _.isFunction(moving.getLogicalParent) &&
      moving.getLogicalParent() === this._target;
    // Group view is a classified presentation, not a hand-arranged order.
    // Consume same-window slot drops before any insert branch can mutate rank;
    // folder drop-in already returned through c.over above, while cross-window
    // moves keep rearranging=false and continue through the normal path.
    if (blocksGroupedArrange(this._target, c, rearranging)) {
      if (this._target._releaseShifted) this._target._releaseShifted();
      this._target.el.dataset.over = _a.off;
      return true;
    }
    if (c.left) {
      this.verbose("insert:after", c.left);
      if (this._target.mget(_a.privilege) & _K.permission.modify) {
        // Dropping a tile that sits BEFORE the slot shifts everything after
        // it one step left once it is pulled out, so the target index is the
        // left neighbour's own index rather than the one past it.
        if (moving.listIndex() < c.left.listIndex()) {
          position = c.left.listIndex();
        } else {
          position = c.left.listIndex() + 1;
        }
        if (rearranging) this._target._manualArrange = 1;
      } else {
        this._target.warning(LOCALE.WEAK_PRIVILEGE);
        return false;
      }
    } else if (c.right) {
      this.verbose("insert:before", c.right, c.right.listIndex());
      position = c.right.listIndex();
      if (position === 0) {
        position = -1;
      }
      if (rearranging) this._target._manualArrange = 1;
    } else if (c.self && c.self.intersect(this._target)) {
      if (this._target.cid !== this.cid) {
        this.verbose("insert:another window", c, this._target, this);
        if (
          this._target.mget(_a.privilege) & _K.permission.modify ||
          (this._target.mget(_a.actual_home_id) !=
            moving.mget(_a.actual_home_id) &&
            this._target.mget(_a.privilege) & _K.permission.write)
        ) {
          this._target.insertMedia(files, 0);
        } else {
          this._target.warning(LOCALE.WEAK_PRIVILEGE);
          return false;
        }
        return true;
      }

      if (moving.bbox.x < 50 && moving.bbox.y < 110) {
        if (moving.cid === this.iconsList.children.first().cid) {
          this.verbose("insert:self[NOP]");
          return false;
        }
        this.verbose("insert:start[445]");
        this._target.insertMedia(files, -1);
      } else if (
        moving.bbox.y > this.iconsList.children.last().$el.offset().top
      ) {
        if (moving.cid === this.iconsList.children.last().cid) {
          this.verbose("insert:self[NOP]");
          return false;
        }
        this.verbose("insert:end[454]");
        this._target.insertMedia(files, 0);
      } else {
        if (c.self && c.self.pos === _e.end) {
          this.verbose("insert:end[458]");
          this._target.insertMedia(files, 0);
        }
      }
      return true;
    } else {
      this.verbose("insert:start[465]");
      if (this._target.insertMedia(files, 0)) {
        this._target.scrollToBottom();
      }
      return true;
    }
    this.verbose(`insert:at[p=${position}]`, moving, this._target);
    dest.insertMedia(files, position);
    return true;
  }

  /**
   *
   * @returns
   */
  load() {
    return this.searchBar != null ? this.searchBar.setValue("") : undefined;
  }

  /**
   *
   */
  clearShift() {
    this.resetShift();
    this.getWindowsPool().children.each(function (c) {
      if (c.acceptMedia) {
        return c.resetShift();
      }
    });
  }

  /**
   *
   * @param {*} view
   */
  reloadAll(view) {
    this.getWindowsPool().children.each(function (c) {
      try {
        return c.reload();
      } catch (error) { }
    });
  }

  /**
   *
   * @param {*} view
   */
  reload() {
    this._cleanupPartition();
    // Clear the per-workspace context so the topbar's + Add new button
    // reverts to the workspace creation flow on the home view.
    this._curWorkspace = null;
    this.mset({
      hub_id: Visitor.id,
      nid: Visitor.get(_a.home_id),
      nodeId: Visitor.get(_a.home_id),
      area: _a.personal,
    });
    // Re-feeding the skeleton rebuilds EVERY layer, so it destroys every
    // window in them — including a live call, which released the room and
    // dropped the user out of the meeting the moment they clicked Home. With a
    // call up, reset the home view in place instead.
    if (this.hasLiveCall && this.hasLiveCall()) {
      this.parkLiveCall();
      return this._resetHomeInPlace();
    }
    this.feed(require("./skeleton")(this));
  }

  /**
   * Ask a live call to shrink into its corner tile (window/meeting setCallTile).
   * Broadcast rather than a direct call so this stays a no-op when nothing is
   * live and Wm keeps no reference to the call window.
   */
  parkLiveCall() {
    try {
      if (!this.hasLiveCall()) return;
      RADIO_BROADCAST.trigger("call:minimize");
    } catch (e) { /* non-fatal */ }
  }

  /**
   * Home, without rebuilding the skeleton: close the workspace pane and the
   * floating windows (what the re-feed did anyway) and point the grid back at
   * the user's home, leaving the layers themselves — and the live call inside
   * the call layer — standing.
   *
   * The grid reset is the same sequence the breadcrumb's "load-home" uses
   * (desk/breadcrumb/index.js), which exists for the same reason: navigate the
   * main container without taking the open windows down with it. The upload
   * floater is spared too; it lives in its own layer and an upload in flight is
   * no more disposable than a call.
   */
  _resetHomeInPlace() {
    for (const layer of [this.headlessLayer, this.windowsLayer]) {
      if (!layer || (layer.isDestroyed && layer.isDestroyed())) continue;
      if (_.isFunction(layer.clear)) layer.clear();
    }
    this.ensurePart("wrapper-modal").then((p) => {
      if (p && _.isFunction(p.clear)) p.clear();
    });
    return this.ensurePart(_a.list).then((l) => {
      if (!l || (l.isDestroyed && l.isDestroyed())) return;
      // SERVICE.desk.home, not media.show_node_by: this is the API the
      // skeleton's own grid is built with (wm/skeleton/index.js _icons_list),
      // so the in-place path lands on exactly the view the re-feed produced.
      l.setApi({ service: SERVICE.desk.home, hub_id: Visitor.id });
      if (l.collection) l.collection.reset();
      l.el.style.visibility = "hidden";
      const scrollEl = l.el.querySelector(".smart-container");
      if (scrollEl) {
        scrollEl.dataset.partitioning = 1;
        scrollEl.style.visibility = "hidden";
      }
      l.restart();
      this._prepareListPartition(l);
    });
  }

  /**
   *
   * @returns
   */
  lock() {
    const selectionList = this.getGlobalSelection();
    let lockList = selectionList;
    const activeList = selectionList.filter((row) => {
      return (
        row.mget(_a.status) === _a.active && row.mget(_a.filetype) !== _a.hub
      );
    });
    if (activeList.length) {
      lockList = activeList;
    }

    return Array.from(lockList).map((i) => i.lock());
  }

  /**
   *
   * @param {*} cmd
   */
  onConfirmRemove(cmd) {
    if (this._popups.length) {
      const p = this._popups.shift();
      uiRouter.getPart(_a.context).feed(p);
    }
  }

  /**
   *
   * @param {*} list  -- List of nodes
   */
  putIntoTrash(list) {
    let nodes = [];
    if (list.length == 1) {
      list[0].delete(1, this.__trashBin.$el);
      return;
    }
    for (var n of list) {
      if (n.mget(_a.filetype) == _a.hub) {
        n.unselect();
        n.moveForbiden(LOCALE.ACTION_NOT_PERMITTED);
        continue;
      }
      nodes.push({
        nid: n.mget(_a.nodeId),
        hub_id: n.mget(_a.hub_id),
        parent_id: n.mget(_a.parent_id),
      });
    }
    if (_.isEmpty(nodes)) return;
    this.postService({
      service: SERVICE.media.trash,
      nodes,
      hub_id: nodes[0].hub_id,
    })
      .then((data) => { })
      .catch((e) => {
        this.warn("Failed to delete nodes", nodes, e);
      });
  }

  /**
   *
   * @param {*} cmd
   */
  /**
   * NO media.select() HERE, and it must not come back.
   *
   * It used to select the workspace before raising the dialog, as a visual cue
   * for "this is the one being asked about" — and nothing unselected it when the
   * user declined. Selection is `_a.state` on a list child, and "Move to trash"
   * acts on the whole selection (getMediaSelection → getGlobalSelection), so
   * every cancelled delete left an item armed for the NEXT trash. Cancel twice,
   * trash a third item, and three workspaces go — plus any file caught in the
   * same selection, silently, since files never had a confirmation of their own.
   *
   * Removed rather than paired with an unselect on the cancel path: the cancel
   * `.catch` is only one of the ways out (ESC, navigating away, any other
   * rejection), and `...media.getAttr()` below spreads the attributes into the
   * broadcast echo, so a selected item was shipping `state: 1` into it too.
   * confirmLeaveHub and confirmRemoveHubsInside never called select() and have
   * always been fine without it, which is what makes this safe: nothing in the
   * success branch reads selection state — it works from the `media` argument's
   * own attributes and methods throughout.
   *
   * Note for anyone reaching for the smaller patch: `media.select(false)` does
   * NOT unselect. select() is `setState(1)` followed by `mset(opt)`, so it sets
   * state to 1 whatever it is passed. The scoped undo is `media.unselect()`.
   */
  confirmRemoveHub(media) {
    return new Promise((resolve, reject) => {
      this.ensurePart("wrapper-modal").then(async (p) => {
        await Kind.waitFor("window_confirm");
        p.feed({
          kind: "window_confirm",
          maxsize: 2,
          title: LOCALE.DELETE,
          message: LOCALE.MSG_DELETE_HUB.format(media.mget(_a.filename)),
          confirm: LOCALE.DELETE,
        })
          .ask()
          .then(() => {
            // Optimistic delete: fire the request in PARALLEL with the trash
            // animation (it used to wait for it), and remove the tile + the
            // sidebar entry when the animation ends instead of after the
            // server round-trip — deleting a big workspace holds the response
            // for seconds+ (DB drop) and the UI used to sit frozen for all of
            // it. The later WS echo finds nothing left to remove (idempotent).
            const hub_id = media.mget(_a.hub_id);
            // Full node attrs, like the server's `...old_node` broadcast —
            // windows' removeContent matches on `filepath`, so a bare
            // {hub_id} echo would leave an open window of this hub alive.
            const echoData = {
              ...media.getAttr(),
              hub_id,
              home_id: hub_id,
              nid: hub_id,
              filetype: _a.hub,
            };
            const request = this.postService({
              service: SERVICE.hub.delete_hub,
              hub_id,
            });
            const animation = this.animateMediaToTrash(media).catch(() => { });
            animation.then(() => {
              media.suppress();
              // Locally echo the event shape the websocket dispatcher emits —
              // the sidebar workspace list and any open window of this hub
              // already subscribe to it.
              this.trigger(WS_EVENT, {
                data: echoData,
                options: { service: "hub.delete_hub" },
              });
            });
            request
              .then((data) => {
                // A failed request resolves UNDEFINED (doRequest swallows the
                // throw via onServerComplain) — treat no-data as failure too,
                // not only an explicit {error}.
                if (!data || data.error) {
                  return Promise.reject((data && data.error) || "no response");
                }
                resolve(data);
              })
              .catch(async (e) => {
                // Rare (owner-only, validated upfront): restore the listing
                // and say why instead of leaving a silently missing tile.
                await animation;
                this.warn("delete_hub failed — restoring listing", e);
                Butler.say(LOCALE.DELETE_WORKSPACE_FAILED);
                this.reload();
                resolve({ error: e });
              });
            p.clear();
          })
          .catch((e) => {
            resolve({});
          });
      });
    });
  }

  /**
   *
   * @param {*} cmd
   */
  confirmLeaveHub(media) {
    // Returns a Promise that settles once the request settles (or the user
    // cancels) — removeMediaSelection awaits this for multi-select.
    return new Promise((resolve) => {
      this.ensurePart("wrapper-modal").then(async (p) => {
        await Kind.waitFor("window_confirm");
        p.feed({
          kind: "window_confirm",
          maxsize: 2,
          title: LOCALE.LEAVE,
          message: LOCALE.MSG_LEAVE_HUB.format(media.mget(_a.filename)),
          confirm: LOCALE.LEAVE,
        })
          .ask()
          .then(() => {
            // Same optimistic treatment as confirmRemoveHub. This path was
            // even worse before: it never suppress()ed — the tile only
            // vanished when the WS echo arrived.
            const hub_id = media.mget(_a.hub_id);
            const echoData = {
              ...media.getAttr(),
              hub_id,
              home_id: hub_id,
              nid: hub_id,
              filetype: _a.hub,
            };
            const request = this.postService({
              service: SERVICE.desk.leave_hub,
              nid: hub_id,
              hub_id: Visitor.id,
            });
            const animation = this.animateMediaToTrash(media).catch(() => { });
            animation.then(() => {
              media.suppress();
              this.trigger(WS_EVENT, {
                data: echoData,
                options: { service: "desk.leave_hub" },
              });
            });
            request
              .then((data) => {
                if (!data || data.error) {
                  return Promise.reject((data && data.error) || "no response");
                }
                resolve(data);
              })
              .catch(async (e) => {
                // Wait the animation out so the reload doesn't race the
                // deferred local echo (restore-then-remove flicker).
                await animation;
                this.warn("leave_hub failed — restoring listing", e);
                Butler.say(LOCALE.LEAVE_WORKSPACE_FAILED);
                this.reload();
                resolve({ error: e });
              });
            p.clear();
          })
          .catch(() => {
            resolve({});
          });
      });
    });
  }

  /**
   *
   * @param {*} cmd
   */
  confirmRemoveHubsInside(media) {
    this.ensurePart("wrapper-modal").then(async (p) => {
      await Kind.waitFor("window_confirm");
      let msg = `The directory {0} contains one or more shares folders. Deleting it shall remove all the content within them`;
      p.feed({
        kind: "window_confirm",
        maxsize: 2,
        title: "Caution! Shared folders inside.",
        message: msg.format(media.mget(_a.filename)),
        confirm: LOCALE.REMOVE,
      })
        .ask()
        .then(async () => {
          let ids = media.mget(_a.hubs).split(/,/g);
          for (let hub_id of ids) {
            /** Get attr from desk */
            let data = await this.fetchService(SERVICE.media.get_node_attr, {
              nid: hub_id,
              hub_id: Visitor.id,
            });
            if (!_.isArray(data)) data = [data];
            for (let item of data) {
              if (item.privilege & _K.permission.owner) {
                await this.postService({
                  service: SERVICE.hub.delete_hub,
                  hub_id: item.actual_hub_id,
                  nid: item.actual_home_id,
                });
              } else if (item.privilege & _K.permission.read) {
                await this.postService({
                  service: SERVICE.desk.leave_hub,
                  nid: item.actual_hub_id,
                  hub_id: Visitor.id,
                });
              }
            }
            this.animateMediaToTrash(media)
              .then(() => {
                media.logicalParent.syncGeometry();
                media.putIntoTrash(1);
              })
              .catch(() => {
                media.putIntoTrash(1);
              });
          }
          p.clear();
        })
        .catch(() => { });
    });
  }

  /**
   * Ask once, for the whole trash action.
   *
   * Same `window_confirm` shape the per-item dialogs use, so it reads as part of
   * the same family. It names the COUNT rather than the items: the selection that
   * produced it may be larger than what the user has in mind, and a number is
   * what tells them that — "Move 6 items to trash?" when they meant one is the
   * signal that something is selected they had forgotten about.
   *
   * Resolves false on every way out that is not an explicit confirm — cancel,
   * ESC, a modal host that never appears — because the safe answer to "should I
   * trash six things" is no.
   *
   * @param {Number} count actionable items
   * @returns {Promise<Boolean>}
   */
  confirmBulkTrash(count) {
    return new Promise((resolve) => {
      this.ensurePart("wrapper-modal")
        .then(async (p) => {
          await Kind.waitFor("window_confirm");
          p.feed({
            kind: "window_confirm",
            maxsize: 2,
            title: LOCALE.MOVE_TO_TRASH,
            message: (LOCALE.MSG_TRASH_SELECTION
              || "Move {0} selected items to trash?").format(count),
            confirm: LOCALE.MOVE_TO_TRASH,
          })
            .ask()
            .then(() => {
              p.clear();
              resolve(true);
            })
            .catch(() => {
              resolve(false);
            });
        })
        .catch(() => resolve(false));
    });
  }

  /**
   * Read one live media item into the plain row libs/media-selection classifies.
   *
   * Every impure part of the old inline split is concentrated here: the model
   * lookup, the privilege check, and the two predicates that are methods rather
   * than attributes. `canRemove` is called for every item even though a hub's is
   * never consulted — one shape, evaluated the same way each time, is worth more
   * than skipping a cheap call.
   *
   * @param {Object} m a media view
   * @returns {Object} the row shape bucketFor expects
   */
  _describeMedia(m) {
    return {
      locked: m.mget(_a.status) === _a.locked,
      isHub: !!m.isHub,
      isOwner: !!m.isGranted(_K.permission.owner),
      isFolder: !!m.isFolder,
      containsHub: !!m.containsHub,
      canRemove: !!m.canRemove(),
    };
  }

  /**
   *
   * @param {*} media
   */
  getMediaSelection(media) {
    let selection = Wm.getGlobalSelection();
    if (media && media.isMfs && media.mget(_a.nid)) {
      let duplicated = 0;
      for (let m of selection) {
        if (m.mget(_a.nid) == media.mget(_a.nid)) {
          duplicated = 1;
          break;
        }
      }
      if (!duplicated) {
        selection.push(media);
      }
    }
    // The classification itself is pure and lives in libs/media-selection, where
    // it can be tested — this file cannot be required outside webpack. Here we
    // only read each live item into a plain row and file it where that says.
    const { bucketFor, emptyBuckets } = require("libs/media-selection");
    const buckets = emptyBuckets();
    for (let m of selection) {
      buckets[bucketFor(this._describeMedia(m))].push(m);
    }
    const { own_hubs, other_hubs, hubs_inside, allowed, rejected, locked } =
      buckets;
    return {
      own_hubs,
      other_hubs,
      hubs_inside,
      allowed,
      rejected,
      locked,
    };
  }

  /**
   *
   */
  async removeMediaSelection(media) {
    const buckets = this.getMediaSelection(media);
    let { own_hubs, other_hubs, hubs_inside, allowed, rejected, locked } =
      buckets;

    // ONE QUESTION BEFORE ANYTHING HAPPENS, when the action would trash more
    // than one thing and at least one of them has no dialog of its own.
    //
    // The `allowed` bucket below is carried out immediately and silently, and
    // the selection that fills it is not necessarily anything the user chose:
    // it is whatever was left with `_a.state` set. A stale selection was enough
    // to take a file with no question asked, and confirmRemoveHub used to leak
    // exactly that (see its docblock). Fixing the leak closes the case we found;
    // this closes the class.
    //
    // Deliberately not a per-item dialog: the point is to gate the action, not
    // to make deleting five files five questions. A single deliberate trash is
    // untouched — see needsBulkConfirm for why both halves of its test matter.
    const { needsBulkConfirm, actionableCount } = require("libs/media-selection");
    if (needsBulkConfirm(buckets)) {
      const ok = await this.confirmBulkTrash(actionableCount(buckets));
      if (!ok) return;
    }

    for (let r of rejected) {
      r.actionDenied();
    }

    for (let r of allowed) {
      this.animateMediaToTrash(r)
        .then(() => {
          r.logicalParent.syncGeometry();
          if (r.mget(_a.status) === "seeding") {
            r.suppress();
            return;
          }
          r.putIntoTrash(1);
        })
        .catch(() => {
          r.putIntoTrash(1);
        });
    }

    for (let r of own_hubs) {
      await this.confirmRemoveHub(r);
    }

    for (let r of other_hubs) {
      await this.confirmLeaveHub(r);
    }

    for (let r of hubs_inside) {
      await this.confirmRemoveHubsInside(r);
    }

    for (let r of locked) {
      r.actionDenied(LOCALE.FILE_NOT_DISPOSABLE);
    }
  }

  /**
   *
   */
  animateMediaToTrash(media) {
    return new Promise((resolve, reject) => {
      const helper = media.$el.clone();
      helper.removeAttr("class");
      helper.addClass(`deleting ${media.fig.family}__helper-wrapper`);
      const pos = media.$el.offset();
      helper.css({
        position: _a.absolute,
        left: pos.left,
        top: pos.top - media.$el.height(),
        zIndex: 200002, // Must be hight than modal popup
      });
      let trash = this.getTrashBin();
      if (!trash) {
        return reject();
      }
      let trashbin = trash.$el;
      this.$el.append(helper);
      const f = () => {
        // GSAP3: vendor exports gsap (default+named) but not the TimelineMax shim,
        // so build the timeline directly. Unwrap the jQuery target to a DOM node
        // (mirrors the shim's getTarget) and use the v3 .to(target, {duration,...}) signature.
        const node = trashbin.get ? trashbin.get(0) : trashbin;
        const tl = gsap.timeline();
        tl.to(node, { duration: 0.3, scale: 1.2 }).to(node, { duration: 0.3, scale: 1 });
        trashbin.parent().children(".temp-anim").remove();
        helper.remove();
        resolve();
      };

      const dest_x = trashbin.offset().left;
      const dest_y = trashbin.offset().top;
      TweenLite.to(helper, 1.4, {
        left: dest_x,
        top: dest_y,
        scale: 0,
        alpha: 0,
        onComplete: f,
      });
    });
  }

  /**
   *
   */
  getTrashBin() {
    let dock = Wm.getPart("dock");
    if (dock) {
      return dock.getPart("trash-bin");
    }
    return null;
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  async onUiEvent(cmd, args = {}) {
    const service =
      args.service || cmd.service || cmd.status || cmd.mget(_a.service);
    this.verbose("Wm.onUiEvent[1471]", service);

    switch (service) {
      case "open-manager":
        return this.openManager(cmd, args);

      case "manage-access":
        return this.openAccessManager(cmd, args);

      case "confirm-removal":
        if (cmd.isGranted(_K.permission.owner)) {
          this.confirmRemoveHub(cmd, args);
        } else {
          this.confirmLeaveHub(cmd, args);
        }
        return;

      case "remove-selection":
        return this.removeMediaSelection(args.media);

      case "confirm-remove-selection":
        for (let hub of args.selection) {
          if (!hub.isHub) continue;
          if (hub.isGranted(_K.permission.owner)) {
            await this.confirmRemoveHub(hub, args);
          } else {
            await this.confirmLeaveHub(hub, args);
          }
        }
        return;

      case "open-node": {
        // Debounce per NODE, not globally: a double-click on the same tile
        // must not spawn twice, but rapid clicks on DIFFERENT tiles must all
        // open. A global timestamp here silently swallowed every other tile
        // clicked within 1s — after the tile had already lit its spinner
        // (media defaultTrigger fires wait(1) before this handler runs), so
        // the tile looked stuck loading and its window never opened.
        const now = new Date().getTime();
        const nodeKey =
          (cmd.mget && (cmd.mget(_a.nid) || cmd.mget(_a.hub_id))) || "";
        if (
          this._lastOpenNode &&
          this._lastOpenNode.key === nodeKey &&
          now - this._lastOpenNode.at < 1000
        ) {
          // Swallowed duplicate — release the tile's spinner latch so the
          // tile doesn't look stuck and stays clickable.
          if (cmd.wait) cmd.wait(0);
          return;
        }
        this._lastOpenNode = { key: nodeKey, at: now };
        this.openContent(cmd, args);
        // Contextual tour: the first workspace or folder a user opens explains
        // what a folder is. Raised AFTER openContent so the navigation the user
        // asked for always happens — the tour never swallows the action — and
        // after the per-node debounce above, so a swallowed double click cannot
        // fire it. The model's filetype is the discriminator, never the section
        // <div> the tile sits in: _doPartition re-appends tiles into those under
        // a live MutationObserver, so the DOM says nothing reliable about what a
        // tile IS.
        const _ft = cmd.mget && cmd.mget(_a.filetype);
        if (_ft === _a.hub || _ft === _a.folder) {
          require("libs/tutorial-tours").fire("folder_task", this);
        }
        return this.unselect();
      }

      case "upgrade-plan":
        return this.upgradePlage(cmd);

      // Billing popup close (settings_billing popup:1 bubbles billing-close)
      // and the post-Checkout result modal actions.
      case "billing-close":
      case "billing-result-close":
        return this.ensurePart("wrapper-modal").then((p) => p.clear());

      case "billing-result-retry":
        this.ensurePart("wrapper-modal").then((p) => p.clear());
        return this.upgradePlage(cmd);

      case "workspace-access-revoked-ack":
        return this.acknowledgeWorkspaceAccessRevoked(cmd);

      case _e.launch:
        return this.launch(args, { explicit: 1, singleton: 1 });

      case "new-workspace":
        // UI gate before media_form / folder_form — create_hub is clamped
        // server-side, but the modal itself is already a write affordance.
        if (require("libs/over-limit").guardWrite("write")) return;
        return this.ensurePart("wrapper-modal").then((p) => {
          p.clear();
          p.el.dataset.state = "open";
          p.el.dataset.overlay = "none";
          const skel =
            this._curWorkspace && this._curWorkspace.hub_id
              ? {
                kind: "folder_form",
                hub_id: this._curWorkspace.hub_id,
                nid: this._curWorkspace.nid,
              }
              : {
                kind: "media_form",
                // Forwarded, not decided here: the desk sets this when a guided
                // onboarding flow needs the create form's follow-up surface to
                // be the members panel rather than the type's default (see
                // media/form's `post_override`). Omitted entirely when absent,
                // so the form's own defaults are untouched for every other
                // caller.
                ...(args.post_override
                  ? { post_override: args.post_override }
                  : {}),
              };
          p.feed(skel);
          // Reset the wrapper only when the whole dialog chain is gone.
          // media_form chains to permission_* via parent.feed(); collection
          // "update" fires once after the swap so length reflects the final
          // state — using per-child destroy would close the wrapper mid-swap.
          if (!p._closeWhenEmpty) {
            p._closeWhenEmpty = () => {
              if (p.collection && p.collection.length === 0) {
                p.el.dataset.state = "closed";
                delete p.el.dataset.overlay;
              }
            };
            p.collection.on("update reset", p._closeWhenEmpty);
          }
        });

      case "new-sub-folder":
        if (require("libs/over-limit").guardWrite("write")) return;
        return this.addFolder({
          position: 0,
          area: _a.personal,
          filename: LOCALE.NEW_FOLDER,
        });

      // "File created" card (see notifyFileCreated above).
      case "open-created-file":
        return this.openCreatedFile();

      case "dismiss-created-file":
        return this.dismissFileCreated();

      // Desk-background context menu (+ New submenu / Invite): these are
      // Desk-owned flows — same handlers the topbar buttons hit — so
      // delegate up instead of duplicating them here. Desk.onUiEvent owns
      // the over-limit guardWrite for each of these services.
      case "new-note":
      case "new-document":
      case "new-spreadsheet":
      case "new-presentation":
      case "invite-member":
        return window.Desk
          ? Desk.onUiEvent(cmd, { ...args, service })
          : null;

      case _a.helpdesk:
        return this.launch(
          { kind: "window_helpdesk" },
          { explicit: 1, singleton: 1 },
        );

      case _a.account:
        return this.launch(
          { kind: "window_account", start: _a.profile },
          { explicit: 1, singleton: 1 },
        );

      case "pricing":
        return this.__wrapperModal.feed({ kind: "organization_form" });
      case _a.preferences:
        return this.__wrapperModal.feed({ kind: "settings_account" });

      case "open-player":
        return this.openPlayer(cmd);

      case "open-kind":
        return this.openKind(cmd);

      case _e.open:
        return this.open(cmd, cmd._args);

      case _e.upload:
        if (require("libs/over-limit").guardWrite("write")) return;
        return this.handleUpload();

      case "export-to-server":
      case "import-from-server":
        this.launch(
          {
            kind: "window_server_explorer",
            type: cmd.mget(_a.type),
            source: this,
          },
          { explicit: 1, singleton: 1 },
        );
        return this.verbose("import export", cmd, this);

      case _e.rename:
      case _a.idle:
        return noOperation();

      // case "launch-support-ticket":
      //   Kind.waitFor("support_ticket_item").then(() => {
      //     this.launchSupportTicket(cmd);
      //   });
      //   return;

      case SERVICE.desk.create_hub:
        args.data.kind = this._getKind();
        args.data.isalink = 1;
        this.getWindowsPool().append(args.data);
        this.syncOrder();
        return;

      case "new-media":
      case "new-messages":
      case "channel":
        var o = _.merge(cmd._args, args);
        return this.launch(o);

      case "no-trash-hubs":
        return this.alert(LOCALE.CONTAINS_NON_DELETABLE);

      case _a.bubble:
        if (cmd.acceptMedia && !cmd.getState()) {
          return cmd.raise();
        }
        break;

      case "hub-settings":
        this.openSettings(cmd);
        break;

      case "copy-media":
        this.storeClipboard(_e.copy, cmd);
        break;

      case _a.paste:
        this.paste(this);
        break;

      case _a.properties:
        this._launchApp(cmd);
        break;

      case "close-alert":
        this.__wrapperModal.clear();
        break;

      case "close-dialog":
        return this.closeDialog();

      case "add-folder":
        return this.openCreateFolderDialog();

      case "create-folder-submit":
        return this.createFolderFromDialog(cmd);

      case "close-folder-dialog":
        return this.closeCreateFolderDialog();

      default:
        // Internal search/contact events that bubble from invitation_searchbox – do not warn
        const ignoredServices = [
          _a.interactive,
          _a.results,
          _e.found,
          "items-found",
          "search",
          "Backspace",
          _e.update,
          // `end:of:data` is emitted by every list when its data load finishes.
          // It bubbles all the way up to the window manager; without this guard,
          // the default branch's `unselect(1)` collapses every open window —
          // visible to the user as "clicking a chat closes the conversation."
          _e.eod,
        ];
        if (ignoredServices.includes(service)) {
          return;
        }
        this.unselect(1);
        return this.warn("AAA:471", WARNING.method.unprocessed.format(service));
    }
  }

  /**
   *
   * @param {*} cmd
   * @returns
   */
  paste(cmd) {
    let target = this.getActiveWindow();
    if (cmd && cmd.append) {
      target = cmd;
    }
    if (target != null && _.isFunction(target.append)) {
      target.pasteMedia();
      target.scrollToBottom();
    } else {
      this.pasteMedia();
      this.scrollToBottom();
    }
  }

  /**
   *
   */
  launchSupportTicket(cmd) {
    const type = cmd.mget(_a.type);
    const source = this.__dock.__bigchatLauncher;
    const route = { page: type };
    const w = Wm.getItemsByKind("window_supportticket")[0];

    if (w && !w.isDestroyed()) {
      const f = () => {
        if (_.isFunction(w.wake) && w.mget(_a.minimize)) {
          w.wake(source);
        }
        w.raise();
        w.reload(route);
      };

      _.delay(f, 100);
      return false;
    }

    route.initialLoad = true;

    Wm.launch(
      { kind: "window_supportticket", args: route },
      { explicit: 1, singleton: 1 },
    );
    return;
  }

  /**
   *
   */
  // async toggleFullscreen() {
  //   if (document.fullscreenElement != null) {
  //     if (document.fullscreen) document.exitFullscreen();
  //   } else {
  //     await document.body.requestFullscreen();
  //   }
  //   this.updateContextMenuItems();
  // }

  /**
   *
   */
  closeDialog() {
    if (this.overlayWrapper) {
      this.overlayWrapper.softClear();
    }
    if (this.dialogWrapper) {
      return this.dialogWrapper.softClear();
    }
  }

  /**
   *
   * @param {*} t
   * @returns
   */
  xorSelect(t) {
    if (this._isMoving || pointerDragged) {
      return;
    }
    if (t !== this) {
      this.iconsList.children.each((c) => {
        try {
          return c.unselect();
        } catch (error) { }
      });
    }

    this.getWindowsPool().children.each((c) => {
      if (t !== c) {
        try {
          return c.unselect();
        } catch (error) { }
      }
    });
  }

  /**
   * storeClipboard
   * @param { copy | string } name
   * @param { __media_grid } item
   * @returns
   */
  storeClipboard(name, item) {
    if (name == null) {
      this.clipboard = {};
      return;
    }
    let files = this.getGlobalSelection() || [];

    // removed the hub while copy
    if (name == _e.copy) {
      files = files.filter((file) => file.mget(_a.type) != _a.hub);
    }

    for (let f of Array.from(files)) {
      f.el.dataset.phase = name;
    }

    if (item && item.el && (item.mget(_a.type) != _a.hub || name == _e.copy)) {
      item.el.dataset.phase = name;
      files = [item];
    }
    this.clipboard = {
      command: name,
      files,
    };
  }

  /**
   *
   */
  clearClipboard() {
    this.clipboard = {};
  }

  /**
   *
   * @returns
   */
  copyLink() {
    let cur = null;
    for (let c of Array.from(this.__windowsLayer.children.toArray())) {
      if (c.mget(_a.state)) {
        cur = c;
        break;
      }
    }
    const s = this.getGlobalSelection()[0] || cur;
    if (!s) {
      return;
    }
    s.viewerLink(_a.orig).then((url) => {
      setTimeout(async () => {
        await copyToClipboard(url);
        Wm.acknowledge();
      }, 0);
    });
  }

  /**
   *
   * @param {*} e
   */
  onAnchorClick(e) {
    // Find the <a> tag — could be e.target or a parent of e.target
    let anchor = e.target;
    if (anchor.tagName !== "A") {
      anchor = anchor.closest("a");
    }
    if (anchor && anchor.tagName == "A") {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();

      // Handle user-mention clicks → open bigchat with that user
      if (anchor.classList.contains("user-mention")) {
        const drumate_id = anchor.dataset.drumate_id;
        if (drumate_id) {
          this._openChatWithUser(drumate_id);
          return;
        }
      }

      // Handle file-mention clicks
      if (anchor.classList.contains("file-mention")) {
        const nid = anchor.dataset.nid;
        const hub_id = anchor.dataset.hub_id;
        if (nid && hub_id) {
          // Fetch file info then launch via same path as folder thumbnail click
          this.fetchService(
            {
              service: SERVICE.media.node_info,
              nid,
              hub_id,
            },
            { async: 1 },
          )
            .then((r) => {
              if (!r || !r.filetype) return;
              const m = new Backbone.Model(r);
              const fType = r.filetype;
              const application = require("builtins/window/configs/application");

              Kind.waitFor(_a.media).then((k) => {
                const media = new k({ model: m });
                const preset = {
                  nid: r.nid || nid,
                  hub_id: r.hub_id || hub_id,
                  filename: r.filename,
                  filetype: fType,
                  vhost: r.vhost,
                  home_id: r.home_id,
                  holder_id: r.holder_id,
                  area: r.area,
                  privilege: r.privilege,
                  useKeyEvent: 1,
                  service: "open-node",
                  state: _a.on,
                  uiHandler: [this],
                  media,
                  trigger: media,
                  radio: _a.on,
                };

                let app = application(fType, preset);
                if (_.isEmpty(app) || !app.kind) {
                  app = { ...app, kind: "props_viewer", media };
                }
                app.style = this.getWindowPosition(media);

                const launchTag = _.uniqueId();
                Kind.waitFor(app.kind).then(() => {
                  try {
                    app.launchTag = launchTag;
                    this.getWindowsPool().append(app);
                  } catch (err) {
                    this.warn("Failed to open mentioned file", err);
                  }
                });
              });
            })
            .catch((err) => {
              this.warn("Failed to fetch mentioned file info", err);
            });
          return;
        }
      }

      let re = new RegExp(_K.module.desk + "/wm/");
      let text = anchor.innerText;
      let href;
      if (/^http/.test(text)) {
        href = text;
      } else {
        const { protocol } = bootstrap();
        href = `${protocol}://${text}`;
      }
      let opt = Visitor.parseModuleArgs(text);
      const url = new URL(href);
      let host = new RegExp(`${bootstrap().main_domain}$`)
      this.debug("AAA:1933", host.test(url.host), url.host, bootstrap().main_domain)
      if (!host.test(url.host) || /\#\/plugins/.test(url.hash)) {
        window.open(href, "_blank");
        return;
      }
      if (opt.kind) {
        this.openSharedLink(opt);
        return true;
      }
    }
  }

  /**
   *
   * @param {*} media
   * @param {*} start
   */
  openHubManager(media, start) {
    let item = this.getWindowPreset(media);
    if (start) item.start = start;
    switch (media.mget(_a.area)) {
      case _a.public:
        item.kind = "window_website";
        break;
      case _a.private:
        item.kind = "window_team";
        break;
      case _a.share:
      case "dmz":
        item.kind = "window_sharebox";
        break;
      case "electron":
        item.kind = "electron_update";
        break;
      default:
        this.alert(LOCALE.FILE_TYPE_NOT_SUPPORTED);
      // this._openShareBox(item, c, moving);
    }
    item.trigger = media;
    item.media = media;
    this.getWindowsPool().append(item);
  }

  /**
   *
   */
  openAccessManager(cmd) {
    const invitation = {
      kind: "invitation",
      topLabel: LOCALE.DOCUMENTS_ACCESS,
      media: cmd,
      uiHandler: [this],
    };
    this.__wrapperModal.feed(invitation);
  }

  /**
   *
   * @param {*} media
   * @param {*} start
   */
  openSettings(media) {
    let item = media.model.toJSON();
    // Toggle settings popup (same behavior as sharebox switchShowShareboxSettings)
    if (this.isShowSettings) {
      this.isShowSettings = false;
      return this.__wrapperModal.clear();
    }
    this.isShowSettings = true;

    switch (media.mget(_a.area)) {
      case _a.personal:
      case _a.public:
      case _a.private:
      case _a.share:
      case "dmz":
        item.kind = "settings_hub";
        break;
      case "electron":
        item.kind = "electron_update";
        break;
      default:
        this.alert(LOCALE.FILE_TYPE_NOT_SUPPORTED);
      // this._openShareBox(item, c, moving);
    }
    item.uiHandler = [media];
    item.source = media;
    item.media = media;
    item.hub_id = media.mget(_a.hub_id);
    item.persistence = _a.once;
    this.__wrapperModal.feed(item);

    const c =
      this.__wrapperModal.children && this.__wrapperModal.children.last
        ? this.__wrapperModal.children.last()
        : null;
    if (!c) return;

    c.once(_e.destroy, () => {
      this.isShowSettings = false;
      if (media && typeof media.unselect === "function") {
        return media.unselect();
      }
    });
    return c.on(_e.show, () => {
      if (media && typeof media.on === "function") {
        return media.on(_e.unselect, () => {
          this.isShowSettings = false;
          return this.__wrapperModal.clear();
        });
      }
    });
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  async search(cmd, args) {
    this.searchBar = cmd;
    const str = cmd.getValue(1);
    let kind = "window_search";
    await Kind.waitFor(kind);

    const w = this.getItemByKind(kind);
    if (!str.length) {
      if (args.type === _e.click) {
        return;
      }
      if (w != null && !w.isDestroyed()) {
        w.suppress();
      }
      return;
    }
    if (w != null && !w.isDestroyed()) {
      w.mset(_a.string, str);
      w.loadContent();
    } else {
      const item = {
        kind,
        string: str,
        trigger: cmd,
        uiHandler: [this],
      };
      this.getWindowsPool().append(item);
      //cmd.setValue(str);
    }
  }

  // /**
  //  *
  //  * @param {*} cmd
  //  * @param {*} args
  //  */
  // showProperties(cmd, args) {
  //   let content = "<br>";
  //   let widget = cmd;
  //   if (args?.trigger) {
  //     widget = args.trigger;
  //   }
  //   let data = widget.actualNode();
  //   for (var k in data) {
  //     if (data[k] != null && _.isString(data[k])) {
  //       content = content + `${k}:<b>${data[k]}</b><br>`;
  //     }
  //   }
  //   this.alert(require("./skeleton/properties")(this, data));
  // }

  /**
   *
   * @param {*} opt
   * @param {*} cb
   * @returns
   */
  openFilter(opt, cb) {
    const w = this.getItemByKind("window_filter");
    if (w != null && !w.isDestroyed()) {
      return;
    }
    const item = {
      kind: "window_filter",
      styleOpt: {
        left: window.innerWidth / 2 - _K.docViewer.width / 2,
      },
    };
    if (opt != null) {
      _.merge(item, opt);
    }
    const f = () => {
      this.getWindowsPool().append(item);
      if (_.isFunction(cb)) {
        const last = this.getWindowsPool().children.last();
        cb(last);
      }
    };
    this.waitElement(this.getWindowsPool().el, f);
  }

  /**
   *
   * @returns
   */
  resetSearch() {
    this.searchBar && this.searchBar.setValue("");
  }

  /**
   *
   * @param {*} method
   * @param {*} data
   * @param {*} socket
   * @returns
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.media.reorder:
        return this.syncAll();

      case SERVICE.media.make_root_dirs:
        return this.iconsList.restart();

      // default:
      //   return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
}

module.exports = __window_manager;
