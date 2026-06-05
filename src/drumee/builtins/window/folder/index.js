const mfsInteract = require("../interact");

const {
  folderFilesView,
  fileTypeFilterBar,
  gridFilesBrowser,
} = require("../skeleton/toolkit");

require("./skin");

class __window_folder extends mfsInteract {
  constructor(...args) {
    super(...args);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.onSearchEvent = this.onSearchEvent.bind(this);
  }

  _defaultBounds() {
    const workspace =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    const rect = workspace ? workspace.getBoundingClientRect() : {};
    const workspaceWidth = rect.width || window.innerWidth;
    const workspaceHeight = rect.height || window.innerHeight;
    const width = Math.min(
      Math.max(900, workspaceWidth - 180),
      workspaceWidth - 96,
    );
    const height = Math.min(
      Math.max(580, workspaceHeight - 150),
      workspaceHeight - 96,
    );

    if (this.mget(_a.headless)) {
      return {
        left: 0,
        top: -49,
        width: workspaceWidth,
        height: workspaceHeight + 49,
      };
    }
    // Cascade: shift each new popup 30px down-right per existing
    // non-headless sibling so back-to-back "Open in Window" actions don't
    // stack popups on top of each other. Headless workspace pane is
    // excluded (it's full-area, not a sibling popup). Sibling count is
    // computed at mount time — already-open popups don't move.
    const siblings =
      window.Wm && typeof window.Wm.getItemsByKind === "function"
        ? window.Wm.getItemsByKind("window_folder").filter(
            (w) => w !== this && !w.isDestroyed() && !w.mget(_a.headless),
          ).length
        : 0;
    const cascadeStep = 30;
    const maxSteps = Math.max(
      0,
      Math.floor((workspaceWidth - width - 48) / cascadeStep),
    );
    const cascade = (siblings % (maxSteps + 1)) * cascadeStep;

    let left = Math.round((workspaceWidth - width) / 2) + cascade;
    let top =
      Math.max(24, Math.round((workspaceHeight - height) / 2)) + cascade;
    left = Math.min(left, Math.max(0, workspaceWidth - width - 24));
    top = Math.min(top, Math.max(24, workspaceHeight - height - 24));

    return {
      left,
      top,
      width,
      height,
      minWidth: 760,
      minHeight: 480,
    };
  }

  toggleZoom() {
    const inFs = document.fullscreenElement === this.el;
    // While the window is in browser fullscreen, the WM's resize handler
    // has already overwritten this.style with viewport-sized values (via
    // syncGeometry → $el.width()). A fresh snapshot here would cache that
    // viewport size as the zoom-restore target. Fall back to _preFsBounds,
    // which was captured before fullscreen entry.
    const preFsSafe = inFs ? this._preFsBounds : null;

    let target;
    if (this._zoomed && this._preZoomBounds) {
      target = this._preZoomBounds;
      this._zoomed = false;
      this._preZoomBounds = null;
    } else {
      this._preZoomBounds = preFsSafe || this._snapshotBounds();
      const ws = this._workspaceRect();
      target = { left: 0, top: 0, width: ws.width, height: ws.height };
      this._zoomed = true;
    }
    // Defer the resize until after fullscreen actually exits (see helper).
    this._applyBoundsAfterFs(target);
  }

  // Override the inherited utils.js minimize/wake. The inherited version
  // captures bounds via $el.offset() (document-relative) and writes them
  // as inline top/left (parent-relative), so when the window's offset
  // parent is not at (0,0) the restored window lands off-screen — the
  // list inside never gets a visible viewport and looks "stuck loading".
  // Also, the original 1.5s TweenMax animations make the tab-click →
  // restore round-trip feel laggy; a short opacity fade + bounds snap is
  // enough.
  minimize(cmd) {
    if (this.mget(_a.minimize)) return;
    this._minimizedBounds = this._snapshotBounds();
    this.mset(_a.minimize, 1);
    if (this.el) {
      this.el.dataset.minimize = 1;
      this.el.dataset.state = 0;
    }
    // Fire the event first so the tab appears in the header immediately.
    if (window.Wm && Wm.$el) Wm.$el.trigger(_e.minimize, this);
    this.$el.stop(true, false).animate(
      { opacity: 0 },
      {
        duration: 150,
        complete: () => {
          if (this.isDestroyed && this.isDestroyed()) return;
          this.$el.css({ display: "none", opacity: 1 });
        },
      },
    );
  }

  wake(cmd, callback) {
    if (!this.mget(_a.minimize)) return;
    this.mset(_a.minimize, 0);
    if (this.el) {
      this.el.dataset.minimize = 0;
      this.el.dataset.state = 1;
    }
    this.$el.css({ display: "" });
    const b = this._minimizedBounds;
    this._minimizedBounds = null;
    if (b) {
      this.size = { ...this.size, width: b.width, height: b.height };
      this.style.set(b);
      this.$el.css(b);
      if (this.syncBounds) this.syncBounds(true);
    }
    this.$el.stop(true, false).css({ opacity: 0 }).animate(
      { opacity: 1 },
      {
        duration: 150,
        complete: () => {
          if (this.isDestroyed && this.isDestroyed()) return;
          if (typeof callback === "function") callback();
        },
      },
    );
    if (this.raise) this.raise();
    if (window.Wm && Wm.$el) Wm.$el.trigger(_e.wake, this);
  }

  toggleFullscreen() {
    if (document.fullscreenElement === this.el) {
      document.exitFullscreen();
      return;
    }
    this._preFsBounds = this._snapshotBounds();
    // One-shot listener handles both menu "Exit Full Screen" and ESC.
    const onChange = () => {
      if (document.fullscreenElement === this.el) return;
      document.removeEventListener("fullscreenchange", onChange);
      const restore = this._preFsBounds;
      this._preFsBounds = null;
      if (restore) _.delay(() => this._applyBounds(restore), 50);
    };
    document.addEventListener("fullscreenchange", onChange);
    const req = this.el.requestFullscreen && this.el.requestFullscreen();
    if (req && req.catch) {
      req.catch(() => document.removeEventListener("fullscreenchange", onChange));
    }
  }

  tileToSide(side) {
    const ws = this._workspaceRect();
    const halfW = Math.floor(ws.width / 2);
    const bounds = side === "right"
      ? { left: halfW, top: 0, width: ws.width - halfW, height: ws.height }
      : { left: 0, top: 0, width: halfW, height: ws.height };
    this._zoomed = false;
    this._preZoomBounds = null;
    this._applyBoundsAfterFs(bounds);
  }

  reframeToDefault() {
    const b = this._defaultBounds();
    this._zoomed = false;
    this._preZoomBounds = null;
    this._applyBoundsAfterFs({ left: b.left, top: b.top, width: b.width, height: b.height });
  }

  _snapshotBounds() {
    const m = this.style.toJSON() || {};
    const el = this.el;
    const pos = this.$el.position() || { left: 0, top: 0 };
    const px = (v, fallback) => {
      if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
      const n = parseFloat(v);
      return Number.isFinite(n) ? Math.round(n) : fallback;
    };
    return {
      left: px(m.left, px(el.style.left, Math.round(pos.left))),
      top: px(m.top, px(el.style.top, Math.round(pos.top))),
      width: px(m.width, px(el.style.width, this.$el.outerWidth())),
      height: px(m.height, px(el.style.height, this.$el.outerHeight())),
    };
  }

  _workspaceRect() {
    const el =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    const r = el ? el.getBoundingClientRect() : {};
    return {
      width: Math.round(r.width || window.innerWidth),
      height: Math.round(r.height || window.innerHeight),
    };
  }

  /**
   * Apply bounds, but if this window is currently in browser fullscreen, exit
   * first and defer the resize to the `fullscreenchange` event. Resizing while
   * still fullscreen animates against the fullscreen overlay (the browser
   * ignores inline geometry until exit), so the animation is invisible and the
   * final geometry can be wrong. Mirrors the deferred pattern in
   * toggleFullscreen().
   */
  _applyBoundsAfterFs(bounds) {
    if (document.fullscreenElement === this.el) {
      this._preFsBounds = null;
      const onChange = () => {
        if (document.fullscreenElement === this.el) return;
        document.removeEventListener("fullscreenchange", onChange);
        _.delay(() => this._applyBounds(bounds), 50);
      };
      document.addEventListener("fullscreenchange", onChange);
      document.exitFullscreen();
      return;
    }
    this._applyBounds(bounds);
  }

  _applyBounds(bounds) {
    const ws = this._workspaceRect();
    const minW = (this.size && this.size.minWidth) || 760;
    const minH = (this.size && this.size.minHeight) || 480;
    const width = Math.max(minW, Math.min(bounds.width, ws.width));
    const height = Math.max(minH, Math.min(bounds.height, ws.height));
    const next = {
      left: Math.max(0, Math.min(bounds.left, Math.max(0, ws.width - width))),
      top: Math.max(0, Math.min(bounds.top, Math.max(0, ws.height - height))),
      width,
      height,
    };
    this.size = { ...this.size, width: next.width, height: next.height };
    this.style.set(next);
    this.$el.stop(true, false).animate(next, {
      duration: 220,
      queue: false,
      complete: () => {
        this.$el.css(next);
        if (this.syncBounds) this.syncBounds(true);
      },
    });
  }

  /**
   * @param {*} opt
   */
  initialize(opt) {
    this.isFolder = 1;
    super.initialize(opt);
    this._path = [];
    this._navStack = [];

    this._flow = _a.horizontal;
    this.model.atLeast({
      value: _a.normal,
    });

    if (this.model.get(_a.hub_id) !== Visitor.id) {
      this.model.set({
        filetype: _a.hub,
      });
    }
    if (this.model.get(_a.filetype) === _a.hub) {
      this.isHub = 1;
    }
    this.skeleton = require("./skeleton")(this);
    if (this.mget(_a.trigger) && this.mget(_a.privilege) == null) {
      this.mset({
        privilege: this.mget(_a.trigger).mget(_a.privilege),
      });
    }
    if (!Visitor.isMobile()) {
      const bounds = this._defaultBounds();
      this.size = {
        ...this.size,
        width: bounds.width,
        height: bounds.height,
        minWidth: bounds.minWidth,
        minHeight: bounds.minHeight,
      };
      // The window's parent (.window-manager__layer) starts at sidebar's
      // right edge; `left` is relative to that parent, so don't add
      // sidebarRight here — only the leftover gap inside the workspace.
      this.style.set({
        left: bounds.left,
        top: bounds.top,
        minWidth: bounds.minWidth,
        minHeight: bounds.minHeight,
      });
    }
    this.style.set({
      width: this.size.width,
      height: this.size.height,
    });

    if (this.mget(_a.headless)) {
      this.listenTo(this.model, `change:${_a.state}`, this._syncWorkspaceFocus);
    }

    // A workspace root's name (hub_name) can resolve after the title element
    // has mounted; re-apply it whenever it changes.
    this.listenTo(this.model, "change:hub_name", this._syncWindowTitle);

    // Tell the desk to render a tab in the home header. `headless` folders
    // ARE the workspace pane itself, not a popup, so they don't get a tab.
    // Deferred so the desk's listener and the folder's $el are both ready.
    if (!this.mget(_a.headless) && window.Wm && Wm.$el) {
      _.defer(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        Wm.$el.trigger("folder:open", this);
      });
    }
  }

  onBeforeDestroy(opt) {
    if (!this.mget(_a.headless) && window.Wm && Wm.$el) {
      Wm.$el.trigger("folder:close", this);
    }
    if (super.onBeforeDestroy) return super.onBeforeDestroy(opt);
  }

  // Apply filename — or hub_name for an empty-filename root — to the title.
  // Uses the bound ref directly (NOT ensurePart): calling ensurePart for a part
  // from within its own onPartReady replays onPartReady and loops forever.
  _syncWindowTitle() {
    const name = this.mget(_a.filename) || this.model.get("hub_name");
    if (!name) return;
    const t = this.__refWindowName || this.name;
    if (t && _.isFunction(t.set)) t.set({ content: name });
  }

  _syncWorkspaceFocus() {
    if (!this.mget(_a.headless)) return;
    if (this.isDestroyed && this.isDestroyed()) return;
    if (this.mget(_a.state) != 1) return;
    if (!window.Wm || !_.isFunction(window.Wm.onWorkspaceRaised)) return;
    window.Wm.onWorkspaceRaised(this);
  }

  buildContent(child) {
    this.__content = child;
    this.setupInteract();
    this.applyDefaultBounds();
    if (!this._raised) this.raise();
    if (this.media && this.media.wait) this.media.wait(0);
    // Honor the launch-time `activeTab` option (e.g. opened from the,
    // sidebar live-meeting badge with activeTab: "meeting"). A meeting request
    // now opens a standalone call window rather than an embedded folder tab.
    const initialTab = this.mget("activeTab");
    if (initialTab === "meeting" || this.mget(_a.start_meeting)) {
      this._launchMeetingStandalone();
    } else if (initialTab && initialTab !== "files") {
      this.ensurePart("folder-view").then(() => this.showFolderTab(initialTab));
    }
    // "Get info" launches the window with this flag to pre-select settings.
    if (this.mget("showSettings")) {
      this.openSettingsPanel();
    }
    if (this.mget(_a.headless)) {
      this.el.dataset.headless = "1";
    }
  }

  applyDefaultBounds() {
    if (this._defaultBoundsApplied || Visitor.isMobile()) return;
    this._defaultBoundsApplied = 1;
    const bounds = this._defaultBounds();
    this.size = { ...this.size, ...bounds };
    this.style.set(bounds);
    this.$el.css(bounds);
    try {
      this.$el.resizable(_a.option, "disabled", false);
      this.$el.resizable(_a.option, "minWidth", bounds.minWidth);
      this.$el.resizable(_a.option, "minHeight", bounds.minHeight);
      this.$el.resizable(_a.option, "handles", this.handles || "all");
    } catch (e) {}
    this.syncBounds();
  }

  getChatScrollElement() {
    return this.el.querySelector(
      ".window__chat-panel .widget-chat__messages .smart-container",
    );
  }

  captureChatScroll() {
    const scroller = this.getChatScrollElement();
    if (!scroller) return;
    this._chatScrollState = {
      bottom:
        scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
    };
  }

  restoreChatScroll() {
    const scroller = this.getChatScrollElement();
    const state = this._chatScrollState;
    if (!scroller || !state) return;
    scroller.scrollTop = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight - state.bottom,
    );
  }

  _resizeStart(e, ui) {
    this.captureChatScroll();
    if (super._resizeStart) return super._resizeStart(e, ui);
  }

  _resize(e, ui, anim) {
    if (super._resize) super._resize(e, ui, anim);
    window.requestAnimationFrame(() => this.restoreChatScroll());
  }

  _resizeStop(e, ui) {
    if (super._resizeStop) super._resizeStop(e, ui);
    this.restoreChatScroll();
    this._chatScrollState = null;
    return false;
  }

  loadContent() {
    this.ensurePart(_a.list).then((l) => {
      if (!l || (l.isDestroyed && l.isDestroyed())) return;
      l.restart();
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._prepareListPartition(l);
      }
    });
  }

  /**
   * Folder window renders one smart list, then partitions its DOM into
   * workspace/folder/file sections. Base _insertMedia is kept except it must
   * target this list and re-run partitioning after pseudo/live inserts.
   */
  _insertMedia(m, position) {
    let opt;
    if (position == null || _.isNaN(position)) position = 0;
    if (m.model != null) {
      opt = this.makeOptions(m);
      if (opt == null) return false;
    } else {
      opt = m;
    }
    if (_.isEmpty(opt)) return;
    if (opt.isAttachment) delete opt.isAttachment;
    opt.logicalParent = this;
    if (this.captured && this.captured.over && opt.phase === _a.upload) {
      return;
    }

    if (
      opt.phase === _a.upload &&
      opt.file &&
      typeof RADIO_MEDIA !== "undefined"
    ) {
      let destination = opt.destination;
      if (!destination && typeof this._getDestination === "function") {
        destination = this._getDestination();
      }
      RADIO_MEDIA.trigger("upload:start", {
        file: opt.file,
        fileName: opt.file.name || opt.filename,
        fileSize: opt.file.size || opt.size || 0,
        destination,
        position,
        opt,
      });
    }

    this.ensurePart(_a.list).then((list) => {
      if (!list || (list.isDestroyed && list.isDestroyed())) return;
      switch (position) {
        case -1:
          list.prepend(opt);
          break;
        case 0:
          list.append(opt);
          break;
        default:
          if (list.collection) list.collection.add(opt, { at: position });
          else list.append(opt);
      }
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._partitionFoldersAndFiles(list);
      }
    });
  }

  /**
   * Live-append handler. Base `__window_mfs.newContent` writes into
   * `this.iconsList`, which is never set in partition mode. Dispatch by
   * filetype into the matching partition list so peer WS events render.
   */
  newContent(xhr, options = {}) {
    const { data } = xhr || {};
    if (!data) return;
    const { nid, pid, args, src } = data;
    const { echoId } = options || {};
    if (this.updateInnerHubsPreview) this.updateInnerHubsPreview(data);
    if (echoId === this.mget("echoId")) return;
    if (this.mget(_a.nid) != pid) return;

    // Skip WS update if nid matches the source folder (prevents overwriting
    // the original folder when copying/duplicating). Check both data.src.nid
    // and data.args.src.nid formats.
    if (src?.nid && nid === src.nid) return;
    if (args?.src?.nid && nid === args.src.nid) return;

    // Dedup: if the item is already rendered, refresh in place.
    const existing = this.getItemsByAttr(_a.nid, nid).filter((c) => {
      if (!c) return false;
      c.mset(data);
      if (c.restart) setTimeout(() => c.restart(), 500);
      return true;
    });
    if (existing.length) return;

    data.format = this.mget(_a.format) || _a.card;
    data.kind = this._getKind();
    data.service = "open-node";
    this.ensurePart(_a.list).then((l) => {
      if (!l || (l.isDestroyed && l.isDestroyed())) return;
      if (data.position >= 0) l.append(data, data.position);
      else l.append(data);
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._partitionFoldersAndFiles(l);
      }
    });
    if (this.syncBounds) this.syncBounds();
  }

  onPartReady(child, pn) {
    if (pn === "folder-view") {
      this.__folderView = child;
      return;
    }
    if (pn === "folder-task-panel") {
      this._taskPanel = child;
      return;
    }
    if (pn === "task-filter-btn") {
      this._taskFilterBtn = child;
      // Reflect current tab + filter state on (re)mount of the button.
      if (child && child.el) {
        child.el.dataset.visible = this.activeTab === _a.task ? "1" : "0";
        const active =
          this._taskPanel &&
          typeof this._taskPanel.isFilterActive === "function" &&
          this._taskPanel.isFilterActive();
        child.el.dataset.active = active ? "1" : "0";
      }
      return;
    }
    if (pn === _a.list) {
      this.iconsList = child;
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._prepareListPartition(child);
      }
      return;
    }
    if (pn == "meeting-panel" && this.mget(_a.start_meeting)) {
      this._launchMeetingInPanel();
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
    if (pn === "ref-window-name") {
      // core's handler clears the title; restore it from the model (an empty-
      // filename workspace root takes its name from hub_name). Set `child`
      // DIRECTLY — calling ensurePart for this part here would replay
      // onPartReady and loop forever.
      const name = this.mget(_a.filename) || this.model.get("hub_name");
      if (name && _.isFunction(child.set)) child.set({ content: name });
    }
  }

  onChildBubble(c) {
    if (c != null && c.logicalParent === this && c.service === _e.select) {
      return;
    }
    super.onChildBubble(c);
    if (_.isEmpty(Wm.clipboard)) {
      return this.unselect();
    }
  }

  _captureNavState() {
    return {
      area: this.mget(_a.area),
      ext: this.mget(_a.ext),
      filename: this.mget(_a.filename),
      filepath: this.mget(_a.filepath),
      filetype: this.mget(_a.filetype),
      home_id: this.mget(_a.home_id),
      hub_id: this.mget(_a.hub_id),
      md5Hash: this.mget(_a.md5Hash),
      nid: this.mget(_a.nid),
      ownpath: this.mget(_a.ownpath),
      pid: this.mget(_a.pid),
      privilege: this.mget(_a.privilege),
      // Full fetch context — without it, mset() on restore keeps the deeper
      // folder's nid / parent-mode / token and refetches the wrong (or empty)
      // listing, notably in restricted shares.
      actual_home_id: this.mget(_a.actual_home_id),
      usePid: this.model.get("usePid"),
      token: this.mget(_a.token),
      vhost: this.mget(_a.vhost),
      // Workspace name, so an empty-filename root can label its title/crumb.
      hub_name: this.model.get("hub_name"),
    };
  }

  _navigateToStackIndex(idx) {
    const i = Number(idx);
    if (!Number.isFinite(i) || i < 0 || i >= this._navStack.length) return;
    const target = this._navStack[i];
    this._navStack = this._navStack.slice(0, i);
    this._restoreNavState(target);
  }

  // Do NOT call l.setApi() here — the list was built with a dynamic
  // `() => ui.getCurrentApi()` api function; replacing it with a static
  // object would freeze the fetch at the restored nid and break every
  // subsequent forward navigation (loadContent → restart would keep
  // replaying the static api instead of reading the new child's nid).
  _restoreNavState(state) {
    if (!state) return;
    this._navRestoring = 1;
    try {
      this.mset(state);
      if (this.__refWindowName) {
        // Empty-filename root falls back to hub_name (avoids a blank title).
        this.__refWindowName.set({ content: state.filename || state.hub_name || "" });
      }
      this.scopeChatToFolder(state.nid);
      this.scopeTasksToFolder();
      this.loadContent();
      this.updateBreadcrumb({ ...state, event: _a.browse }, this);
    } finally {
      this._navRestoring = 0;
    }
    this.refreshBreadcrumbsUI();
  }

  refreshBreadcrumbsUI(stack) {
    if (stack && _.isArray(stack)) {
      // get_path returns the full root→current chain INCLUDING the current node.
      // Convention: the current location is the title, only ancestors are
      // crumbs. Drop the current node so the root isn't rendered as a crumb (nor
      // duplicated when the first forward navigation re-pushes it). A
      // hub/workspace ROOT window's active directory is its actual_home_id, not
      // the model nid (mirrors desk/breadcrumb's hub normalization); without it
      // the root entry isn't matched and renders as a crumb beside the title.
      let curNid = this.mget(_a.nid);
      if (this.mget(_a.filetype) === _a.hub && this.mget(_a.actual_home_id)) {
        curNid = this.mget(_a.actual_home_id);
      }
      // Persist the workspace name — hub_name/name ONLY. get_path gives the root
      // a "/" filename, which must not overwrite the name seeded in
      // loadWorkspace (that would revert the title/root label back to "/").
      const here = stack.find((s) => s && s.nid != null && s.nid == curNid);
      const hereName = here && (here.hub_name || here.name);
      if (hereName && hereName !== "/") this.mset({ hub_name: hereName });
      // get_path ancestors carry identity only, not the hub-wide fetch context
      // (token/usePid/actual_home_id/vhost) which is identical across the hub.
      // Stamp the current window's values so a crumb click can reload a
      // restricted/share listing. Spread `s` last so real get_path fields win.
      const ctx = {
        hub_id: this.mget(_a.hub_id),
        token: this.mget(_a.token),
        usePid: this.model.get("usePid"),
        actual_home_id: this.mget(_a.actual_home_id),
        vhost: this.mget(_a.vhost),
      };
      this._navStack = stack
        .filter((s) => s && s.nid != null && s.nid != curNid)
        .map((s) => Object.assign({}, ctx, s));
    }
    const depth = this._navStack.length;
    this.ensurePart("folder-breadcrumb-path").then((box) => {
      if (!box || (box.isDestroyed && box.isDestroyed())) return;
      box.el.dataset.state = depth ? 1 : 0;
      if (!depth) {
        box.feed([]);
        return;
      }
      const cnFolder = `${this.fig.family}-topbar`;
      const crumbs = [];
      this._navStack.forEach((state, i) => {
        if (i > 0) {
          crumbs.push(
            Skeletons.Note({
              className: `${cnFolder}__breadcrumb-sep`,
              content: "›",
            }),
          );
        }
        crumbs.push(
          Skeletons.Note({
            className: `${cnFolder}__breadcrumb-crumb`,
            // Empty-filename root falls back to hub_name so it keeps its name
            // (not "/") once you navigate into a child.
            content: state.filename || state.hub_name || "/",
            service: "breadcrumb-jump",
            stackIndex: i,
            uiHandler: [this],
          }),
        );
      });
      crumbs.push(
        Skeletons.Note({
          className: `${cnFolder}__breadcrumb-sep`,
          content: "›",
        }),
      );
      box.feed(crumbs);
    });

    // Mirror the ACTIVE workspace window's navigation into the visible desk
    // topbar breadcrumb (desk_breadcrumb). refreshBreadcrumbsUI is the single
    // chokepoint for every in-place navigation (workspace switch, sidebar
    // folder open, and in-grid forward/backward), so driving it here keeps the
    // topbar breadcrumb in sync for all of them — not just section toggles.
    // Gate on headless + focused so standalone/background folder windows never
    // retitle the topbar. desk_breadcrumb._updateContent only accepts
    // broadcasts whose source IS Wm, so pass Wm explicitly; it resolves the
    // full Home › Workspace › … path itself via get_path.
    if (
      window.Wm &&
      this.mget(_a.headless) &&
      this.mget(_a.state) == 1 &&
      _.isFunction(this.updateBreadcrumb)
    ) {
      let curNid = this.mget(_a.nid);
      if (this.mget(_a.filetype) === _a.hub && this.mget(_a.actual_home_id)) {
        curNid = this.mget(_a.actual_home_id);
      }
      this.updateBreadcrumb(
        {
          nid: curNid,
          hub_id: this.mget(_a.hub_id),
          actual_home_id: this.mget(_a.actual_home_id),
          filetype: this.mget(_a.filetype),
          service: "change-workspace",
        },
        window.Wm,
      );
    }
  }

  toggleFilesLayout(cmd) {
    const mode =
      this.getViewMode && this.getViewMode() === _a.row ? _a.icon : _a.row;
    this.setViewMode(mode);
    this.ensurePart(_a.content).then((content) => {
      if (!content || (content.isDestroyed && content.isDestroyed())) return;
      // setState (Backbone.View) flips data-state on the toggle box; the CSS
      // swaps the visible glyph. (The old splitBtn used changeState, which only
      // exists on the svg widget — the box needs setState.)
      if (mode === _a.row) {
        content.feed(require("../skeleton/content/row")(this));
        cmd?.setState?.(1);
        return;
      }
      content.feed([fileTypeFilterBar(this), gridFilesBrowser(this)]);
      cmd?.setState?.(0);
    });
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case _a.info:
        return this.showInfo();

      case _e.download:
        return this.runFolderMediaAction(_e.download);

      case _e.settings:
        return this.switchShowFolderSettings(cmd);

      case "add-folder":
        return this.openCreateFolderDialog();

      case "add-note":
        return Wm.windowsLayer.append({
          kind: "editor_markdown",
          uiHandler: [this],
        });

      case "new-document":
        return this.newDocument(cmd);

      case "create-folder-submit":
        return this.createFolderFromDialog(cmd);

      case "close-folder-dialog":
        this.isShowSettings = false;
        return this.dialogWrapper.clear();

      case "open-advanced-settings":
        return this.openAdvancedSettings(cmd);

      case "folder-manage-access":
        return this.openManageAccess();

      case "folder-rename":
        return this.openFolderRenameDialog();

      case "folder-organize":
        return this.runFolderMediaAction("organize");

      case "folder-duplicate":
        return this.runFolderMediaAction(_a.duplicate);

      case "folder-delete":
        return this.confirmFolderDelete();

      case "folder-invite-role":
        return this.setFolderInviteRole(cmd);

      case "folder-member-role":
        return this.setFolderMemberRole(cmd);

      case "folder-send-invitation":
        return this.sendFolderInvitation(cmd);

      case "folder-remove-member":
        return this.removeFolderMember(cmd);

      case "folder-rename-change":
        this._renameFolderValue = cmd.getValue
          ? cmd.getValue()
          : cmd.mget(_a.value);
        return;

      case "folder-rename-submit":
        return this.renameFolderTarget(this._renameFolderTarget);

      case "breadcrumb-jump":
        return this._navigateToStackIndex(cmd.mget("stackIndex"));

      case "tab-files":
        return this.showFolderTab("files");

      case "tab-chat":
        this.scopeChatToFile(null);
        this.scopeChatToFolder(this.mget(_a.nid));
        return this.showFolderTab(_a.chat);

      case _a.chat: {
        const fileNid =
          (cmd && cmd._args && cmd._args.nid) ||
          (cmd && cmd.mget && cmd.mget(_a.nid));
        if (!fileNid) return;
        const fileLabel =
          (cmd && cmd._args && (cmd._args.filename || cmd._args.name)) ||
          (cmd && cmd.mget && (cmd.mget(_a.filename) || cmd.mget(_a.name))) ||
          (cmd && _.isFunction(cmd.fullname) && cmd.fullname()) ||
          "";
        this.showFolderTab(_a.chat);
        return this.scopeChatToFile(fileNid, fileLabel);
      }

      case "tab-task":
        return this.showFolderTab(_a.task);

      case "toggle-task-filter":
        // Tab-bar filter button → open/close the task panel's member dropdown.
        if (this._taskPanel && _.isFunction(this._taskPanel.toggleFilter)) {
          this._taskPanel.toggleFilter();
        }
        return;

      case "task-filter-state":
        // The task panel reports whether a filter is applied; reflect it on
        // the tab-bar button so the user sees the active state.
        if (this._taskFilterBtn && this._taskFilterBtn.el) {
          this._taskFilterBtn.el.dataset.active = args && args.active ? "1" : "0";
        }
        return;

      case "tab-meeting":
        // The meeting opens as its own window now, not an embedded folder tab.
        return this._launchMeetingStandalone();

      case "toggle-files-layout":
        return this.toggleFilesLayout(cmd);

      case "leave-meeting":
      case "close-call-panel":
        this.mset("activeTab", "files");
        return this.showFolderTab("files");

      case "start-meeting":
        return this._launchMeetingInPanel();

      case "meeting":
      case "webinar":
      case "channel":
        return Wm.launch(
          {
            kind: `window_${service}`,
            hub_id: this.mget(_a.hub_id),
            filename: this.mget(_a.filename),
            nid: this.mget(_a.actual_home_id) || this.mget(_a.nid),
            trigger: this.mget(_a.media) || this,
            media: this.mget(_a.media) || this,
            service,
            wm_unique_id: `window_${service}-${this.mget(_a.hub_id)}`,
          },
          { explicit: 1, singleton: 1 },
        );

      case "remove-selection":
        return Wm.removeMediaSelection(cmd);

      case "forward-message":
        return this.openForwardDialog();

      case "close-overlay":
        return this.closeForwardDialog();

      case "close":
        if (this.mget(_a.headless)) {
          // Multi-tab: only fall back to the "no workspace open" UI when
          // this is the last open workspace tab. With other tabs still
          // alive, the generic destroy handler in window/manager.js raises
          // the next-topmost window and our _syncWorkspaceFocus rewires
          // globals; resetting workspace-main would clear the sidebar
          // highlight that the surviving tab is about to claim.
          // Headless workspace windows live in headlessLayer, never
          // windowsLayer (see wm/index.js _findWorkspaceWindow) — count
          // surviving sibling tabs there.
          let remaining = 0;
          if (Wm && Wm.headlessLayer && Wm.headlessLayer.children) {
            for (const c of Wm.headlessLayer.children.toArray()) {
              if (!c || c === this || c.isDestroyed()) continue;
              if (c.mget(_a.kind) !== "window_folder") continue;
              if (!c.mget(_a.headless)) continue;
              remaining++;
              break;
            }
          }
          if (!remaining) {
            Desk.onWorkspaceClosed();
          }
        }
        return super.onUiEvent(cmd, args);

      case "window-zoom":
        return this.toggleZoom();

      case "window-reframe":
        return this.reframeToDefault();

      case "window-tile-left":
        return this.tileToSide("left");

      case "window-tile-right":
        return this.tileToSide("right");

      case "fullscreen":
        return this.toggleFullscreen();

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * Open forward picker dialog. Reuses widget_chat_item_forward from bigchat.
   * Pulls selected messages + hub from the folder chat widget.
   */
  openForwardDialog() {
    const chat = this.getPart && this.getPart("folder-chat");
    if (!chat || _.isEmpty(chat._selectedMessages)) return;
    this.ensurePart("wrapper-dialog").then((wrapper) => {
      this.dialogWrapper = wrapper;
      wrapper.clear();
      // chat-item-forward's closeOverlay does source.getItemsByKind('widget_chat'),
      // so source must be a container holding the chat widget — this window-folder.
      wrapper.feed({
        kind: "widget_chat_item_forward",
        source: this,
        messages: chat._selectedMessages,
        msghubID: chat.hubId,
        uiHandler: [this],
      });
    });
  }

  /**
   * Close the forward picker overlay and reset chat selection state.
   */
  closeForwardDialog() {
    if (this.dialogWrapper) this.dialogWrapper.clear();
    const chat = this.getPart && this.getPart("folder-chat");
    if (chat && _.isFunction(chat.disableMessageSelection)) {
      chat.disableMessageSelection();
    }
  }

  openCreateFolderDialog() {
    return this.ensurePart("wrapper-dialog").then((wrapper) => {
      this.dialogWrapper = wrapper;
      wrapper.feed(require("./skeleton/create-folder-dialog")(this));
      return this.ensurePart("create-folder-name").then(
        (entry) => entry.focus && entry.focus(),
      );
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
      return Wm.alert(LOCALE.INVALID_FILENAME);
    }

    const { nid, hub_id } = this.actualNode();
    const args = {
      hub_id,
      dirname: filename,
      filename,
      nid,
      notify: 1,
      socket_id: Visitor.get(_a.socket_id),
      seeding: 1,
      area: this.mget(_a.area),
    };

    // The user is INSIDE a folder window — "Add new → Folder" means create a
    // sub-folder, not a new top-level hub. `desk.create_hub` is restricted to
    // admin-level callers and was returning 403 for ordinary members. Only
    // route to `desk.create_hub` when we are still at the hub root (nid ==
    // hub_id) AND the area is one of the desk-managed areas; otherwise use
    // the regular `media.make_dir` sub-folder path.
    const atHubRoot = String(nid) === String(hub_id);
    const isDeskArea = [_a.public, _a.share, _a.private].includes(
      this.mget(_a.area),
    );
    const service =
      atHubRoot && isDeskArea
        ? SERVICE.desk.create_hub
        : SERVICE.media.make_dir;

    if (service === SERVICE.desk.create_hub) {
      args.pid = args.nid;
    }

    return this.postService(service, args)
      .then((data) => {
        if (data && data.error) {
          Wm.alert(LOCALE[data.error] || data.error);
          return;
        }
        this.dialogWrapper.clear();
        if (data) {
          data.kind = this._getKind();
          data.service = "open-node";
          data.uiHandler = [this];
          this.addMedia(data);
        }
      })
      .catch((e) => {
        this.warn("Failed to create folder", e);
        Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN);
      })
      .finally(() => {
        this._creatingFolder = 0;
      });
  }

  // Kept for backward-compat with existing callers (start-meeting service,
  // onPartReady start_meeting flag). The meeting no longer embeds in a folder
  // panel — it opens as its own free-floating window. See _launchMeetingStandalone.
  _launchMeetingInPanel() {
    return this._launchMeetingStandalone();
  }

  /**
   * Open the folder/workspace meeting as its own top-level window (Wm pool),
   * centered and resizable — never embedded in the folder body. Mirrors the
   * team window's startTeamCall. Singleton-guarded so a second click refocuses
   * the running call instead of launching a duplicate.
   */
  _launchMeetingStandalone() {
    if (this._launchingMeeting) return;
    this._launchingMeeting = true;
    try {
      const existing =
        Wm.getItemByKind("window_meeting") || Wm.getItemByKind("window_connect");
      if (existing && !existing.isDestroyed()) {
        if (typeof existing.raise === "function") existing.raise();
        Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
        return;
      }
      const switchcall = Wm.getItemByKind("window_switchcall");
      if (switchcall && !switchcall.isDestroyed()) switchcall.goodbye();

      const room_id = this.mget(_a.actual_home_id) || this.mget(_a.nid);
      let width = Math.min(1200, window.innerWidth - 80);
      let height = Math.min(720, window.innerHeight - 120);
      if (width < 480) width = window.innerWidth;
      if (height < 360) height = window.innerHeight;
      const left = Math.max(0, (window.innerWidth - width) / 2);
      const top = Math.max(40, (window.innerHeight - height) / 2);

      return Wm.launch(
        {
          kind: "window_meeting",
          hub_id: this.mget(_a.hub_id),
          nid: room_id,
          room_id,
          filename: this.mget(_a.filename) || this.mget(_a.name),
          area: this.mget(_a.area),
          trigger: this.mget(_a.media) || this,
          media: this.mget(_a.media) || this,
          service: "meeting",
          audio: 1,
          video: 1,
          standalone: 1,
          wm_unique_id: `window_meeting-${this.mget(_a.hub_id)}`,
          style: { top, left, width, height, minWidth: 480, minHeight: 420, margin: 0 },
        },
        { explicit: 1, singleton: 1 },
      );
    } finally {
      this._launchingMeeting = false;
    }
  }

  scopeChatToFile(fileNid, fileLabel) {
    return this.ensurePart("folder-chat").then((chat) => {
      if (chat && _.isFunction(chat.setScopedFileNid))
        chat.setScopedFileNid(fileNid, fileLabel);
    });
  }

  scopeChatToFolder(folderNid) {
    return this.ensurePart("folder-chat").then((chat) => {
      if (chat && _.isFunction(chat.setScopedFolderNid))
        chat.setScopedFolderNid(folderNid);
    });
  }

  // Canonical task-scoping args for the *current* folder. A hub/workspace ROOT
  // window's active dir is actual_home_id (hub-wide, so `actual_home_id || nid`
  // would wrongly collapse every subfolder onto the root); a subfolder window
  // uses its own nid. `isRoot` also lets the panel surface legacy (nid-less)
  // tasks at the root only. Mirrors the breadcrumb's curNid resolution.
  _taskScopeArgs() {
    const isRoot =
      this.mget(_a.filetype) === _a.hub && this.mget(_a.actual_home_id);
    return {
      scopeNid: isRoot ? this.mget(_a.actual_home_id) : this.mget(_a.nid),
      isRoot: isRoot ? 1 : 0,
      destNid: this.mget(_a.actual_home_id) || this.mget(_a.nid),
    };
  }

  // Keep the embedded task panel scoped to the navigated folder, mirroring
  // scopeChatToFolder. No-op until the Task tab has been opened once.
  scopeTasksToFolder() {
    if (!this._taskPanelMounted) return;
    const apply = (p) => {
      if (p && !(p.isDestroyed && p.isDestroyed()) && _.isFunction(p.setScope))
        p.setScope(this._taskScopeArgs());
    };
    if (this._taskPanel) return apply(this._taskPanel);
    return this.ensurePart("folder-task-panel").then((p) => {
      this._taskPanel = p;
      apply(p);
    });
  }

  // Keep folder-chat scope in sync with the navigated folder so the right-side
  // chat panel reflects the current folder's messages even on the Files tab.
  // Snapshot must run before super (which overwrites the model via
  // copyPropertiesFrom), otherwise the stack would record the destination
  // instead of the ancestor we just left.
  updateTopbar(m) {
    if (!this._navRestoring) {
      const prev = this._captureNavState();
      const nextNid = m && m.mget && m.mget(_a.nid);
      if (prev && prev.nid != null && nextNid != null && prev.nid != nextNid) {
        this._navStack.push(prev);
      }
    }
    super.updateTopbar(m);
    this.scopeChatToFolder(this.mget(_a.nid));
    this.scopeTasksToFolder();
    this.refreshBreadcrumbsUI();
  }

  showFolderTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.$el.find(".window-folder__tab-bar-item").attr("data-state", 0);
    this.$el
      .find(`.window-folder__tab-bar-item[data-tab='${tab}']`)
      .attr("data-state", 1);
    // The member-filter button shares the tab line but only applies to Tasks.
    if (this._taskFilterBtn && this._taskFilterBtn.el) {
      this._taskFilterBtn.el.dataset.visible = tab === _a.task ? "1" : "0";
    }
    // The list/grid view toggle shares the tab line but only applies to Files.
    const viewCtrl = this.getPart("view-ctrl");
    if (viewCtrl && viewCtrl.el) {
      viewCtrl.el.dataset.visible = tab === "files" ? "1" : "0";
    }

    const switchView = (view) => {
      if (this._meetingViewActive && tab !== "meeting") {
        view.feed(folderFilesView(this));
        this._meetingViewActive = 0;
        this._taskPanelMounted = 0;
      }
      view.el.dataset.view = tab;
      switch (tab) {
        case "files":
        case _a.chat:
          return;
        case "meeting":
          this._meetingViewActive = 1;
          this._taskPanelMounted = 0;
          return view.feed(require("./skeleton/meeting-panel")(this));
        case _a.task:
          if (!this._taskPanelMounted) {
            this._taskPanelMounted = 1;
            const { scopeNid, isRoot, destNid } = this._taskScopeArgs();
            return view.append({
              kind: "tasks_panel",
              hub_id: this.mget(_a.hub_id),
              // Upload/destination nid: for a hub-level window the working nid
              // is actual_home_id, not the hub_id itself (else media.upload 403).
              nid: destNid,
              // Folder-scope identity for the task list/create.
              scope_nid: scopeNid,
              scope_is_root: isRoot,
              // sys_pn + partHandler let the window grab a reference (for the
              // tab-bar filter button) and re-scope the panel on navigation.
              sys_pn: "folder-task-panel",
              partHandler: this,
              uiHandler: [this],
            });
          }
          return;
        default:
          view.el.dataset.view = "files";
      }
    };

    if (
      this.__folderView &&
      !(this.__folderView.isDestroyed && this.__folderView.isDestroyed())
    ) {
      return switchView(this.__folderView);
    }
    const switchId = _.uniqueId("folder-tab-");
    this._folderTabSwitchId = switchId;
    return this.ensurePart("folder-view").then((view) => {
      if (
        this._folderTabSwitchId !== switchId ||
        !view ||
        (view.isDestroyed && view.isDestroyed())
      )
        return;
      this.__folderView = view;
      return switchView(view);
    });
  }

  getFolderActionTarget() {
    return this.mget(_a.trigger) || this.mget(_a.media) || this;
  }

  closeFolderSettings() {
    this.isShowSettings = false;
    return this.dialogWrapper.clear();
  }

  openFolderDialog(skeleton) {
    this.isShowSettings = false;
    this.dialogWrapper.clear();
    return _.delay(() => this.dialogWrapper.feed(skeleton));
  }

  runFolderMediaAction(service) {
    const target = this.getFolderActionTarget();
    switch (service) {
      case _e.download:
        this.closeFolderSettings();
        return target.download();
      case "organize":
        return this.prepareFolderMove(target);
      case _a.duplicate:
        return this.duplicateFolderTarget(target);
      default:
        return target?.onUiEvent?.(
          { service, mget: () => service },
          { service },
        );
    }
  }

  prepareFolderMove(target) {
    this.closeFolderSettings();
    if (typeof target.move === "function") return target.move();
    Wm.unselect && Wm.unselect();
    Wm.storeClipboard(_e.cut, target);
    Wm.acknowledge && Wm.acknowledge();
  }

  duplicateFolderTarget(target) {
    this.closeFolderSettings();
    Wm.unselect && Wm.unselect();
    const echoId = Visitor.get(_a.echoId);
    return target
      .postService(
        SERVICE.media.copy,
        {
          service: SERVICE.media.copy,
          nid: target.mget(_a.nodeId),
          pid: target.mget(_a.pid),
          action: _a.copy,
          recipient_id: target.mget(_a.hub_id),
          hub_id: target.mget(_a.hub_id),
          echoId,
        },
        { async: 1 },
      )
      .then(() => {
        // Don't add folder here — WS broadcast (newContent) handles adding
        // the new folder to the grid. Adding from HTTP response causes duplicate.
        Wm.unselect && Wm.unselect();
      })
      .catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN));
  }

  openFolderRenameDialog() {
    const target = this.getFolderActionTarget();
    const currentName =
      target?.mget?.(_a.filename) || this.mget(_a.filename) || "";
    this._renameFolderTarget = target;
    this._renameFolderValue = currentName;
    this.openFolderDialog(
      require("./skeleton/rename-folder-dialog")(this, { value: currentName }),
    );
    return _.delay(() =>
      this.ensurePart("rename-folder-name").then(
        (entry) => entry.focus && entry.focus(),
      ),
    );
  }

  renameFolderTarget(target) {
    if (this._renamingFolder) return;
    const entry = this.getPart && this.getPart("rename-folder-name");
    const input = entry?.el?.querySelector?.("input");
    const filename = String(
      input?.value || entry?.getValue?.() || this._renameFolderValue || "",
    ).trim();
    if (!filename || filename === target?.mget?.(_a.filename))
      return this.closeFolderSettings();
    if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(filename))
      return Wm.alert(LOCALE.INVALID_FILENAME);
    this._renamingFolder = 1;
    const node = target.actualNode ? target.actualNode() : {};
    return target
      .postService(SERVICE.media.rename, {
        filename,
        nid: target.mget(_a.nodeId) || node.nid || target.mget(_a.nid),
        service: SERVICE.media.rename,
        hub_id: target.isHub
          ? Visitor.id
          : target.mget(_a.hub_id) || node.hub_id,
        echoId: target.mget("echoId"),
      })
      .then((data) => {
        if (target.afterRename) target.afterRename(data);
        this.closeFolderSettings();
      })
      .catch((e) => {
        Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN);
      })
      .finally(() => {
        this._renamingFolder = 0;
      });
  }

  confirmFolderDelete() {
    const target = this.getFolderActionTarget();
    const filename =
      target?.mget?.(_a.filename) || this.mget(_a.filename) || "";
    this.dialogWrapper.feed({
      kind: "window_confirm",
      title: LOCALE.DELETE,
      message: `${LOCALE.CONFIRM_DELETE} ${filename}?`,
      confirm: LOCALE.DELETE,
      confirm_type: "danger",
    });
    return this.dialogWrapper.children
      .last()
      .ask()
      .then(() => {
        this.closeFolderSettings();
        if (target?.trash) return target.trash();
        if (target?.delete) return target.delete();
      })
      .catch(() => {});
  }

  getFolderSettingPart() {
    return (
      this.dialogWrapper &&
      this.dialogWrapper.children &&
      this.dialogWrapper.children.last()
    );
  }

  getInviteEmail(cmd) {
    const data = (cmd.getData && cmd.getData()) || this.getData?.() || {};
    const entry = this.getPart && this.getPart("invite-email");
    return String(data.email || entry?.getValue?.() || "").trim();
  }

  getFolderRoleOptions() {
    return [
      { label: LOCALE.ROLE_ADMIN, privilege: _K.privilege.admin },
      { label: LOCALE.ROLE_VIEW_EDIT, privilege: _K.privilege.write },
      { label: LOCALE.ROLE_VIEW_CHAT, privilege: _K.privilege.chat },
      {
        label: LOCALE.VIEW,
        privilege: _K.privilege.guest || _K.privilege.read,
      },
    ];
  }

  getNextFolderRole(role) {
    const options = this.getFolderRoleOptions();
    const index = options.findIndex((item) => item.label === role);
    return options[(index + 1) % options.length];
  }

  updateRoleSelector(cmd, role) {
    if (!cmd.el) return;
    cmd.el.dataset.role = role.label;
    cmd.el.dataset.privilege = role.privilege;
    const label = cmd.el.querySelector(
      ".window-folder__settings-action-role-label .note-content",
    );
    if (label) label.textContent = role.label;
  }

  // Menu pick from the invite-row role dropdown — set _folderInviteRole and
  // refresh just the trigger label. (No server call until the user actually
  // clicks Send Invitation.)
  //
  // Re-feeding the whole panel here destroys and recreates the still-open
  // menu_topic widget mid-click, before it finishes dispatching the option
  // click. The rebuilt menu's trigger still opens, but its option click
  // handlers never get wired, so the role could only be changed once. Update
  // the label text in place instead: the live menu stays intact (it closes
  // itself on pick, and the radio behaviour moves the selected highlight), so
  // the role can be re-picked any number of times.
  setFolderInviteRole(cmd) {
    const privilegeAttr = cmd.el?.dataset?.privilege;
    const roleLabel = cmd.el?.dataset?.role_label;
    if (privilegeAttr == null) return;
    this._folderInviteRole = {
      label: roleLabel || LOCALE.ROLE_ADMIN || "Admin",
      privilege: Number(privilegeAttr),
    };
    const label = this.dialogWrapper?.el?.querySelector(
      ".window-folder__settings-action-invite-input-row " +
        ".window-folder__settings-action-role-label .note-content",
    );
    if (label) label.textContent = this._folderInviteRole.label;

    // The option fires its pick straight at this window via uiHandler, so the
    // click never bubbles back to the menu_topic for it to auto-close. Close
    // it explicitly (animated, widget kept alive) so the dropdown dismisses on
    // every pick and stays reusable for the next change.
    const menu = cmd.getParentByKind?.(KIND.menu.topic);
    if (menu?.changeState) menu.changeState(0);
  }

  // Menu pick from a member-row role dropdown — confirm and persist the
  // picked role across the workspace. DOM only updates AFTER server ACK +
  // refetch so Cancel is a true no-op and a failed POST never leaves a
  // stale label.
  async setFolderMemberRole(cmd) {
    if (this._folderConfirmInFlight) return;

    const memberId = cmd.el?.dataset?.member_id;
    const privilegeAttr = cmd.el?.dataset?.privilege;
    const roleLabel = cmd.el?.dataset?.role_label;
    if (!memberId || privilegeAttr == null) return;

    const raw = this._findFolderMemberRow(memberId);
    if (!raw) return;
    if (raw.id === Visitor.id || raw.entity_id === Visitor.id) return;

    const privilege = Number(privilegeAttr);
    if (Number.isNaN(privilege)) return;
    // No-op when the picked role equals the current — saves a confirm popup
    // and a wasted round-trip for the most common menu interaction.
    if (Number(raw.privilege) === privilege) return;

    const nextRole = { label: roleLabel || "", privilege };
    const name = this._formatFolderMemberName(raw);

    this._folderConfirmInFlight = true;
    try {
      await Wm.confirm({
        title: LOCALE.CHANGE_MEMBER_ROLE_TITLE || "Change member role",
        message: (
          LOCALE.CHANGE_MEMBER_ROLE_MESSAGE || "Change {name} to {role}?"
        )
          .replace("{name}", name)
          .replace("{role}", nextRole.label),
        confirm: LOCALE.CONFIRM || "Confirm",
        confirm_type: "primary",
        cancel: LOCALE.CANCEL || "Cancel",
        cancel_type: "secondary",
        mode: "hbf",
      });
    } catch (_) {
      this._folderConfirmInFlight = false;
      return;
    }

    const { hub_id } = this.actualNode();
    try {
      // hub.set_privilege (permission_set) REPLACES the workspace privilege
      // bitmask — works for both upgrade and downgrade. Affects every
      // folder under this workspace via inheritance, which matches what
      // the "Folder Settings → Permissions Matrix" UX surfaces.
      const res = await this.postService(SERVICE.hub.set_privilege, {
        hub_id,
        users: [memberId],
        privilege: nextRole.privilege,
      });
      if (res && (res.error || res.error_code)) {
        Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
        return;
      }
      // Trust the POST: mutate the cached row in place and redraw from
      // local state (hub.get_members_by_type can return stale data on
      // immediate read-after-write).
      raw.privilege = nextRole.privilege;
      if (this.dialogWrapper) {
        // The initial mount in switchShowFolderSettings attaches a
        // once(destroy) handler on the panel that flips isShowSettings
        // to false. An in-place re-feed destroys that old child and
        // would trip the handler — detach it first, then re-attach an
        // identical handler to the freshly mounted child so the close
        // button keeps working.
        const oldChild = this.dialogWrapper.children?.last?.();
        if (oldChild) oldChild.off(_e.destroy);
        this.dialogWrapper.feed(
          require("./skeleton/settings-action-panel")(this),
        );
        this.isShowSettings = true;
        const newChild = this.dialogWrapper.children?.last?.();
        if (newChild) {
          newChild.once(_e.destroy, () => {
            this.isShowSettings = false;
            this.unselect();
          });
        }
      }
      Wm.alert(LOCALE.ROLE_UPDATED_SUCCESSFULLY || "Role updated.");
    } catch (e) {
      Wm.alert(e?.reason || e?.error || LOCALE.TRY_AGAIN);
    } finally {
      this._folderConfirmInFlight = false;
    }
  }

  sendFolderInvitation(cmd) {
    const email = this.getInviteEmail(cmd);
    if (!email)
      return Wm.alert(LOCALE.EMAIL_REQUIRED || LOCALE.ENTER_VALID_EMAIL);

    const { hub_id } = this.actualNode();
    const privilege = this._folderInviteRole?.privilege || _K.privilege.admin;

    const btn = cmd?.el;
    if (btn?.getAttribute("data-pending") === "1") return;
    if (btn) btn.setAttribute("data-pending", "1");

    return this.postService(SERVICE.hub.invite, {
      hub_id,
      invitees: [email],
      privilege,
    })
      .then(async (res) => {
        // hub.invite returns {results:[...]} on success; on error returns
        // {error, error_code, reason} — catch top-level errors first.
        if (res && (res.error || res.error_code)) {
          return Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
        }
        const r = (res && res.results && res.results[0]) || {};
        if (r.status === "failed") {
          return Wm.alert(r.reason || LOCALE.TRY_AGAIN);
        }
        await this._refreshFolderMembers();
        Wm.alert(LOCALE.INVITATION_SENT_SUCCESSFULLY);
      })
      .catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN))
      .finally(() => {
        if (btn) btn.removeAttribute("data-pending");
      });
  }

  // Open a destructive Wm.confirm popup; on confirm POST
  // hub.delete_contributor and refresh the matrix from the server (no
  // optimistic DOM removal). Workspace-scoped: removes the user from the
  // workspace entirely — they lose access to every folder.
  async removeFolderMember(cmd) {
    if (this._folderConfirmInFlight) return;

    const memberId = cmd.el?.dataset?.member_id;
    if (!memberId) return;

    const raw = this._findFolderMemberRow(memberId);
    if (!raw) return;
    if (raw.id === Visitor.id || raw.entity_id === Visitor.id) return;

    const name = this._formatFolderMemberName(raw);

    this._folderConfirmInFlight = true;
    try {
      await Wm.confirm({
        title: LOCALE.REMOVE_MEMBER_TITLE || "Remove member",
        message: (
          LOCALE.REMOVE_MEMBER_MESSAGE ||
          "Remove {name} from this folder? They will lose all access."
        ).replace("{name}", name),
        confirm: LOCALE.REMOVE || "Remove",
        confirm_type: "danger",
        cancel: LOCALE.CANCEL || "Cancel",
        cancel_type: "secondary",
        mode: "hbf",
      });
    } catch (_) {
      this._folderConfirmInFlight = false;
      return;
    }

    const { hub_id } = this.actualNode();
    try {
      const res = await this.postService(SERVICE.hub.delete_contributor, {
        hub_id,
        users: [memberId],
      });
      if (res && (res.error || res.error_code)) {
        Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
        return;
      }
      await this._refreshFolderMembers();
      Wm.alert(LOCALE.MEMBER_REMOVED_SUCCESSFULLY || "Member removed.");
    } catch (e) {
      Wm.alert(e?.reason || e?.error || LOCALE.TRY_AGAIN);
    } finally {
      this._folderConfirmInFlight = false;
    }
  }

  _findFolderMemberRow(memberId) {
    if (!memberId) return null;
    const list = this._folderMembers || [];
    const key = String(memberId);
    return (
      list.find(
        (r) => String(r.entity_id || r.drumate_id || r.id || "") === key,
      ) || null
    );
  }

  _formatFolderMemberName(row) {
    const pick = (...vals) =>
      vals.map((v) => (v == null ? "" : String(v).trim())).find(Boolean) || "";
    return pick(
      row.fullname,
      [row.firstname, row.lastname].filter(Boolean).join(" "),
      row.surname,
      row.email,
    );
  }

  async _refreshFolderMembers() {
    if (!this.isShowSettings || !this.dialogWrapper) return;
    const { hub_id } = this.actualNode();
    if (!hub_id) return;
    try {
      const rows = await this.fetchService(SERVICE.hub.get_members_by_type, {
        hub_id,
        type: "all",
      });
      this._folderMembers = Array.isArray(rows) ? rows : [];
    } catch (e) {
      if (this.warn) this.warn("Failed to refresh folder members", e);
    } finally {
      if (this.isShowSettings && this.dialogWrapper) {
        this.dialogWrapper.feed(
          require("./skeleton/settings-action-panel")(this),
        );
      }
    }
  }

  openAdvancedSettings(cmd) {
    this.isShowSettings = false;
    this.dialogWrapper.clear();
    this.dialogWrapper.feed({
      kind: "settings_hub",
      label: this.settingsLabel,
      className: "",
      uiHandler: [this],
      media: this.mget(_a.media),
      hub_id: this.mget(_a.hub_id),
      source: this,
      persistence: _a.once,
    });
  }

  /**
   * Ensure the dialog wrapper part exists, then open the folder settings
   * panel. Used by the `showSettings` launch option ("Get info") and to
   * surface settings on an already-open window.
   */
  openSettingsPanel() {
    return this.ensurePart("wrapper-dialog").then((wrapper) => {
      this.dialogWrapper = wrapper;
      if (!this.isShowSettings) this.switchShowFolderSettings();
    });
  }

  /**
   * Toggle folder settings panel.
   */
  switchShowFolderSettings(cmd) {
    if (this.isShowSettings) {
      this.isShowSettings = false;
      return this.dialogWrapper.clear();
    }
    this.isShowSettings = true;
    this._folderMembers = [];
    this._folderMembersLoaded = false;
    // Reset invite role to default (Admin) on every open — otherwise a prior
    // session's pick persists silently and the next invite uses the stale
    // privilege even though the trigger label visually shows the default.
    this._folderInviteRole = null;

    const render = () => {
      if (this.isDestroyed && this.isDestroyed()) return;
      if (!this.isShowSettings || !this.dialogWrapper) return;
      this.dialogWrapper.feed(
        require("./skeleton/settings-action-panel")(this),
      );
      const c = this.dialogWrapper.children.last();
      if (!c) return;
      c.once(_e.destroy, () => {
        this.isShowSettings = false;
        return this.unselect();
      });
      return c.on(_e.show, () => {
        return this.once(_e.unselect, () => {
          return this.dialogWrapper.clear();
        });
      });
    };

    // Workspace-scoped membership: hub.get_members_by_type returns every
    // user with workspace-level access (which is also what grants implicit
    // access to this folder). The folder window's settings panel manages
    // workspace membership in context — sharebox per-node grants are a
    // separate flow (Manage Access) not exposed here.
    const { hub_id } = this.actualNode();
    if (!hub_id) {
      this._folderMembersLoaded = true;
      return render();
    }
    return this.fetchService(SERVICE.hub.get_members_by_type, {
      hub_id,
      type: "all",
    })
      .then((rows) => {
        this._folderMembers = Array.isArray(rows) ? rows : [];
      })
      .catch((e) => {
        this.warn("Failed to load folder members", e);
        this._folderMembers = [];
      })
      .finally(() => {
        this._folderMembersLoaded = true;
        render();
      });
  }

  /**
   * Open the "Manage Access" (permission_shared) panel — triggered by the
   * topbar share icon, which the skeleton renders only for share-area
   * folders. Separate from Folder Settings (the gear icon).
   */
  openManageAccess() {
    if (this.isShowSettings) {
      this.isShowSettings = false;
      return this.dialogWrapper.clear();
    }
    this.isShowSettings = true;
    this.dialogWrapper.feed({
      kind: "permission_shared",
      media: this.mget(_a.media) || this.media,
      hub_id: this.mget(_a.hub_id),
      uiHandler: [this],
      persistence: _a.once,
    });
    const c = this.dialogWrapper.children.last();
    if (c) {
      c.once(_e.destroy, () => {
        this.isShowSettings = false;
        return this.unselect();
      });
    }
  }

  showInfo() {
    const state = this.__wrapperInfo.el.dataset.state;
    if (state === _a.closed) {
      return this.fetchService(SERVICE.media.info, {
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.nid),
      })
        .then((data) => {
          this.__wrapperInfo.feed(require("./skeleton/info")(this, data));
        })
        .catch((e) => {
          this.warn(e);
          this.__wrapperInfo.feed(require("./skeleton/no-info")(this));
        });
    } else {
      this.__wrapperInfo.clear();
    }
  }

  // Events from search box
  onSearchEvent(service, data) {
    const list = this.getPart(_a.list);
    if (service === "clear") {
      list.collection.set(this._backup);
      return;
    }
    if (!_.isArray(data) || data.length === 0) {
      return;
    }
    if (this._backup == null) {
      this._backup = _.map(list.collection.models, (model) => {
        const r = _.clone(model.toJSON());
        return r;
      });
    }
    const found = _.map(data, (item) => {
      const ext = {
        kind: KIND.media.helper,
        signal: _e.ui.event,
        service: "open-node",
        uiHandler: [this],
      };
      return { ...item, ...ext };
    });
    list.collection.set(found);
  }
}

module.exports = __window_folder;
