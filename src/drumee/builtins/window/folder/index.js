const mfsInteract = require("../interact");

const {

  
  folderFilesView,
  fileTypeFilterBar,
  gridFilesBrowser,
  chatHeaderBar,
  chatSearchBar,
  searchResults,
  fileThreadPanelContent,
  fileThreadInfoCard,
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
      // Workspace pane fills the area exactly. No top offset — the topbar IS
      // the header, so any upward shift clips it against `overflow: hidden`.
      return {
        left: 0,
        top: 0,
        width: workspaceWidth,
        height: workspaceHeight,
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
    // CSS hook: zoomed window shows the 6-per-row grid (folder skin).
    this.el.dataset.zoomed = this._zoomed ? 1 : 0;
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
    // Left gets the floored half, right gets the remainder, so an odd width
    // splits with no overlap and no gap (left ends exactly where right starts).
    const leftW = halfW;
    const rightW = ws.width - halfW;
    const bounds = side === "right"
      ? { left: halfW, top: 0, width: rightW, height: ws.height }
      : { left: 0, top: 0, width: leftW, height: ws.height };
    this._zoomed = false;
    this._preZoomBounds = null;
    this.el.dataset.zoomed = 0;
    // A half-tile is narrower than the normal window minimum (760) on any
    // workspace < 1520px wide; without this override _applyBounds would clamp
    // both tiles up to 760 and they would overlap. Pass the tile's own width
    // as the minimum so it can shrink to exactly half the screen.
    this._applyBoundsAfterFs(bounds, {
      minWidth: side === "right" ? rightW : leftW,
    });
  }

  reframeToDefault() {
    const b = this._defaultBounds();
    this._zoomed = false;
    this._preZoomBounds = null;
    this.el.dataset.zoomed = 0;
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
  _applyBoundsAfterFs(bounds, opt) {
    if (document.fullscreenElement === this.el) {
      this._preFsBounds = null;
      const onChange = () => {
        if (document.fullscreenElement === this.el) return;
        document.removeEventListener("fullscreenchange", onChange);
        _.delay(() => this._applyBounds(bounds, opt), 50);
      };
      document.addEventListener("fullscreenchange", onChange);
      document.exitFullscreen();
      return;
    }
    this._applyBounds(bounds, opt);
  }

  _applyBounds(bounds, opt = {}) {
    const ws = this._workspaceRect();
    // Callers (e.g. tiling) may request a smaller minimum so a tile can shrink
    // below the normal window minimum. In all cases the effective minimum is
    // capped to the workspace itself — otherwise two half-tiles on a screen
    // narrower than 2× the minimum would each be clamped up and overlap.
    const baseMinW = (this.size && this.size.minWidth) || 760;
    const baseMinH = (this.size && this.size.minHeight) || 480;
    const minW = Math.min(opt.minWidth || baseMinW, ws.width);
    const minH = Math.min(opt.minHeight || baseMinH, ws.height);
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
    // `.window__ui` carries a stylesheet floor (`min-width:600px`,
    // `min-height:320px` in window/skin/window.scss). CSS min-width WINS over a
    // smaller inline width, so a half-tile narrower than 600px (workspace <
    // 1200px wide) is rendered back up to 600px and the two tiles overlap even
    // though the JS geometry is correct. Pin the inline min to the applied size
    // to override the stylesheet floor.
    this.$el.css({ minWidth: minW, minHeight: minH });
    // Keep the resizable minimum in sync with the applied geometry so a manual
    // drag right after tiling doesn't snap the tile back up to 760 and overlap
    // its neighbour again.
    try {
      this.$el.resizable(_a.option, "minWidth", minW);
      this.$el.resizable(_a.option, "minHeight", minH);
    } catch (e) {}
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
    // Active file-type filter (Docs/PDF/Images/…), scoped to the current
    // folder view. Drives getCurrentApi(); null means "All" (no filter).
    this._filterType = null;

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
    } else if (this.mget(_a.headless) && window.Wm && Wm.$el) {
      // A headless folder IS the full-screen workspace pane and carries its
      // own window topbar, so the desk's home-section topbar above it is
      // redundant while it's open. Fire synchronously (not deferred) so the
      // hide/show coalesces with the previous pane's close in the same frame
      // when switching workspaces — no topbar flicker.
      Wm.$el.trigger("workspace:open", this);
    }
  }

  onBeforeDestroy(opt) {
    if (this._folderGridSortTimer) {
      clearTimeout(this._folderGridSortTimer);
      this._folderGridSortTimer = null;
    }
    if (this._chatSearchTimer) {
      clearTimeout(this._chatSearchTimer);
      this._chatSearchTimer = null;
    }
    this._unbindThreadMenuOutside();
    if (!this.mget(_a.headless) && window.Wm && Wm.$el) {
      Wm.$el.trigger("folder:close", this);
    } else if (this.mget(_a.headless) && window.Wm && Wm.$el) {
      Wm.$el.trigger("workspace:close", this);
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

  _isFolderGridMode() {
    return !this.getViewMode || this.getViewMode() !== _a.row;
  }

  _sortFolderGridByFilename(list = this.iconsList) {
    if (!list || (list.isDestroyed && list.isDestroyed())) return;
    if (this.iconsList && this.iconsList !== list) return;
    this.iconsList = list;
    if (list.collection) this.sortContent();
    if (this._partitionFoldersAndFiles) this._partitionFoldersAndFiles(list);
    if (this.syncBounds) this.syncBounds();
  }

  _scheduleAlphabeticalGridSort(list = this.iconsList) {
    if (!this._isFolderGridMode()) return;
    if (!list || (list.isDestroyed && list.isDestroyed())) return;
    if (this._folderGridSortTimer) clearTimeout(this._folderGridSortTimer);
    this._folderGridSortTimer = setTimeout(() => {
      this._folderGridSortTimer = null;
      this._sortFolderGridByFilename(list);
    }, 0);
  }

  onMediaRenamed() {
    this._scheduleAlphabeticalGridSort();
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
    // Gate the chat panel to the viewer's current role on open (a view-only
    // member sees the "need permission" info card instead of the conversation);
    // live role changes re-run this via _applyLivePrivilege. Deferred until the
    // body is rendered so the chat-panel part exists.
    this.ensurePart("folder-view").then(() => this._syncChatGate());
    // Honor a launch-time file-chat scope (opened from a "file.thread" card
    // outside any folder window): scope the chat to that file IN PLACE — no
    // auto-switch to the full Chat tab (the window opens on its default tab and
    // the embedded chat panel shows the thread).
    const scopedFileNid = this.mget("scopedFileNid");
    if (scopedFileNid) {
      this.ensurePart("folder-view").then(() => {
        this.scopeChatToFile(scopedFileNid, this.mget("scopedFileLabel") || "");
      });
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
   * When the Task tab is showing a create/edit form, a media dragged in from
   * the home grid / folder list attaches to that task (links the existing nid)
   * rather than being inserted into the folder body. Otherwise fall through to
   * the normal folder insert.
   */
  insertMedia(files, position = 0) {
    // With the Task tab + a form open, the drop belongs to the task. Route it
    // to the panel and always skip the folder insert (the droppable may have
    // already handled it) — otherwise the file is duplicated into the folder.
    if (
      this.activeTab === _a.task &&
      this._taskPanel &&
      !(this._taskPanel.isDestroyed && this._taskPanel.isDestroyed()) &&
      typeof this._taskPanel.canAttachExisting === "function" &&
      this._taskPanel.canAttachExisting()
    ) {
      this._taskPanel.attachExistingNodes(files);
      if (typeof this.resetShift === "function") this.resetShift();
      return;
    }
    return super.insertMedia(files, position);
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
        // Grid the new tile IMMEDIATELY. Once a folder has been partitioned,
        // `.smart-container` is `flex-direction: column` (it stacks the
        // workspace/folder/file sections); a freshly appended upload
        // placeholder lands there as a raw direct child, so it renders
        // stacked VERTICALLY until re-partition. `_scheduleAlphabeticalGridSort`
        // only re-partitions on a debounced setTimeout(0) (and bails when
        // `iconsList` points at another list), so during a multi-file upload
        // the placeholders stay stacked for the whole upload, then snap into
        // the grid on completion. Partition synchronously here — same as the
        // base interact `_insertMedia` (Wm/DMZ) — so the placeholder drops
        // straight into the wrapping `.file-section` grid; the scheduled sort
        // then just reorders it alphabetically.
        if (this._partitionFoldersAndFiles) this._partitionFoldersAndFiles(list);
        this._scheduleAlphabeticalGridSort(list);
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
      this._scheduleAlphabeticalGridSort();
      return true;
    });
    if (existing.length) return;

    data.format = this.mget(_a.format) || _a.card;
    data.kind = this._getKind();
    data.service = "open-node";
    data.logicalParent = this;
    this.ensurePart(_a.list).then((l) => {
      if (!l || (l.isDestroyed && l.isDestroyed())) return;
      if (data.position >= 0) l.append(data, data.position);
      else l.append(data);
      if (this.getViewMode && this.getViewMode() !== _a.row) {
        this._scheduleAlphabeticalGridSort(l);
      }
    });
    if (this.syncBounds) this.syncBounds();
  }

  addMedia(data) {
    if (!data) return;
    data.kind = data.kind || this._getKind();
    data.service = data.service || "open-node";
    data.logicalParent = this;
    return this.ensurePart(_a.list).then((list) => {
      if (!list || (list.isDestroyed && list.isDestroyed())) return;
      list.append(data);
      this._scheduleAlphabeticalGridSort(list);
      if (this.syncBounds) this.syncBounds();
    });
  }

  // ---- Files-tab adjustable split (files:chat, draggable 1:1 ↔ 2:1) --------
  // The split ratio is the files panel's width as a % of the split-body. Range:
  // 50% (1:1) … 66.667% (2:1); default 2:1. Persisted globally in localStorage
  // and applied as the `--files-w` CSS var the Files-view grid reads.
  _FILES_SPLIT_MIN() { return 50; }            // 1:1
  _FILES_SPLIT_MAX() { return 200 / 3; }       // 2:1  (≈66.667%)
  _FILES_SPLIT_KEY() { return "folder-files-split"; }

  _storedFilesSplit() {
    const raw = parseFloat(localStorage.getItem(this._FILES_SPLIT_KEY()));
    if (!isFinite(raw)) return this._FILES_SPLIT_MAX(); // default 2:1
    return Math.min(this._FILES_SPLIT_MAX(), Math.max(this._FILES_SPLIT_MIN(), raw));
  }

  _applyFilesSplit(pct) {
    const view = this.__folderView;
    if (!view || !view.el) return;
    const v = pct == null ? this._storedFilesSplit() : pct;
    view.el.style.setProperty("--files-w", `${v}%`);
  }

  _wireFilesSplitter(child) {
    if (!child || !child.el) return;
    const handle = child.el;
    this._applyFilesSplit(); // restore persisted value on (re)mount
    let dragging = false;
    const onMove = (e) => {
      const view = this.__folderView;
      if (!dragging || !view || !view.el) return;
      const rect = view.el.getBoundingClientRect();
      if (!rect.width) return;
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.min(this._FILES_SPLIT_MAX(), Math.max(this._FILES_SPLIT_MIN(), pct));
      this._filesSplitPct = pct;
      view.el.style.setProperty("--files-w", `${pct}%`);
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      handle.dataset.dragging = "0";
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (isFinite(this._filesSplitPct)) {
        localStorage.setItem(this._FILES_SPLIT_KEY(), `${this._filesSplitPct}`);
      }
    };
    handle.addEventListener("pointerdown", (e) => {
      const view = this.__folderView;
      // Only active on the Files tab (the only view that reads --files-w).
      if (!view || !view.el || view.el.dataset.view !== "files") return;
      dragging = true;
      handle.dataset.dragging = "1";
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      e.preventDefault();
    });
  }

  onPartReady(child, pn) {
    if (pn === "folder-view") {
      this.__folderView = child;
      // Restore the user's persisted Files-tab split ratio (default 2:1).
      this._applyFilesSplit();
      return;
    }
    if (pn === "files-splitter") {
      this._wireFilesSplitter(child);
      return;
    }
    if (pn === "file-type-filter") {
      // Reference to the Docs/PDF/Images filter bar so navigation can reset it.
      this._fileTypeFilterBar = child;
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
    if (pn === "sched-grid") {
      // Weekly view: land the scroll on the working hours instead of 12 AM.
      const body = child.el && child.el.querySelector(`.${this.fig.family}__meeting-sched-body`);
      if (body && !body.classList.contains(`${this.fig.family}__meeting-sched-body--month`)) {
        body.scrollTop = 56 * 7; // ~7 AM with 56px hour rows
      }
      return;
    }
    if (pn === "search-results") {
      this._searchResultsPart = child;
      return;
    }
    if (pn === "chat-search-input") {
      // Filtering is wired via the Entry's `watch` → onUiEvent("chat-search-typed").
      // Here we only autofocus the field. Its <input> is created asynchronously
      // (waitElement), so it is absent at part-ready time — poll briefly until it
      // exists, then focus.
      let tries = 0;
      const focusInput = () => {
        const inputEl = child.el && child.el.querySelector("input");
        if (inputEl) return inputEl.focus();
        if (tries++ < 20) setTimeout(focusInput, 25);
      };
      focusInput();
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
    if (pn === "ref-window-name") {
      // core's handler clears the title; restore it from the model (an empty-
      // filename workspace root takes its name from hub_name). Set `child`
      // DIRECTLY — calling ensurePart for this part here would replay
      // onPartReady and loop forever.
      const name = this.mget(_a.filename) || this.model.get("hub_name");
      if (name && _.isFunction(child.set)) {
        child.set({ content: name });
      } else if (!name && !this.mget(_a.headless)) {
        // Opened without a seeded name (e.g. openFileLocation revealing a hit
        // in a hub/workspace ROOT — media.attributes carries no display name
        // for a root). Resolve it from get_path, the same source loadWorkspace
        // feeds to refreshBreadcrumbsUI. Headless panes are always seeded by
        // loadWorkspace, so they never hit this branch.
        this._resolveMissingTitle();
      }
    }
  }

  // Resolve a blank window title from get_path. get_path returns the workspace
  // display name as `hub_name` on every path row; refreshBreadcrumbsUI persists
  // it (mset hub_name) which fires change:hub_name → _syncWindowTitle, painting
  // the title. One-shot guard so a slow fetch can't stack.
  _resolveMissingTitle() {
    if (this._titleResolving) return;
    const nid = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);
    if (!nid || !hub_id) return;
    this._titleResolving = 1;
    this.fetchService(SERVICE.media.get_path, { nid, hub_id })
      .then((data) => {
        if (this.isDestroyed && this.isDestroyed()) return;
        if (!_.isEmpty(data)) this.refreshBreadcrumbsUI(data);
      })
      .catch((e) => {
        if (this.warn) this.warn("_resolveMissingTitle: get_path failed", e);
      });
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

  // The file-type filter is scoped to a single folder view. When moving to
  // another folder (forward into a child or back via a breadcrumb), drop it so
  // the destination shows its full contents — otherwise a lingering "Docs"
  // filter hides every sub-folder and the listing looks empty/unreachable.
  // Resets both the api state and the radiotoggle UI (via its broadcast
  // channel, simulating a click on the "All" tab). No-op when no filter is set.
  _resetFileTypeFilter() {
    if (!this._filterType) return;
    this._filterType = null;
    const bar = this._fileTypeFilterBar;
    if (!bar || (bar.isDestroyed && bar.isDestroyed()) || !bar.children) return;
    const all =
      bar.children.find &&
      bar.children.find((c) => c && c.mget && c.mget(_a.value) === "all");
    if (all && typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.trigger(`media-filter-${this._id}`, all);
    }
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
      this._resetFileTypeFilter();
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

      case "close-export":
        this._closeChatExportOverlay();
        return;

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

      case "filter-by-type": {
        // Record the filter on the window and re-run the list's DYNAMIC api via
        // loadContent — do NOT call l.setApi() (core's default handler) here.
        // setApi swaps the `() => ui.getCurrentApi()` function for a static
        // object frozen at the current nid + type, which then makes every later
        // loadContent → restart refetch that frozen listing, breaking
        // navigation (e.g. a child folder becomes unreachable after filtering).
        const value =
          (cmd.mget && cmd.mget(_a.value)) ||
          (cmd.options && cmd.options.value);
        this._filterType = value && value !== "all" ? value : null;
        return this.loadContent();
      }

      case "tab-files":
        return this.showFolderTab("files");

      case "tab-chat":
        // Full Chat tab layout (main = #General, rail, file-thread side panel)
        // is set up by _enterChatTabLayout inside showFolderTab.
        return this.showFolderTab(_a.chat);

      // Close the full Chat-tab file-thread side panel (its X button).
      case "close-file-thread-panel":
        return this._closeFileThreadPanel();

      // "Open file →" on the side-panel info card → open the file in its viewer.
      // openFileLocation (window base) opens the file's grid item in a player if
      // it is visible, else — given a filetype so it can resolve a player kind —
      // fetches attributes and launches that player. Passing the cached filetype
      // (from file_thread_info) avoids the no-type fallback that would otherwise
      // open the parent folder when the grid item is not currently rendered.
      case "open-file-from-thread": {
        const fileNid = cmd && cmd.mget && cmd.mget("file_nid");
        if (!fileNid) return;
        return this.openFileLocation({
          nid: `${fileNid}`,
          hub_id: this.mget(_a.actual_hub_id) || this.mget(_a.hub_id),
          pid: this.mget(_a.nid),
          area: this.mget(_a.area),
          // Cached from the active file thread's file_thread_info (side panel or
          // in-place card) so an absent grid item still opens the player.
          filetype: this._ftFiletype || undefined,
        });
      }

      // ── Team-chat header message search ──
      // Magnifying glass → swap the header for a search bar; back arrow restores
      // it. Both target the single `chat-header-bar` part, which always sits
      // above the folder-chat conversation the search filters.
      case "open-chat-search":
        return this._openChatSearch();

      // Fired by the search Entry's `watch` on every keystroke (args.value).
      case "chat-search-typed":
        return this._runChatSearch((args && args.value) || "");

      // A search result row → close search and scroll to the message if loaded.
      case "search-result-jump":
        return this._jumpToSearchResult(cmd);

      case "close-chat-search":
        return this._closeChatSearch();

      // ── Team-chat header thread-switch dropdown (Figma 2216-170337) ──
      case "open-thread-menu":
        return this._toggleThreadMenu();

      case "thread-menu-general":
        // "# General" → folder-wide chat, scoped IN PLACE (no tab switch).
        this._closeThreadMenu();
        this.scopeChatToFile(null);
        return this.scopeChatToFolder(this.mget(_a.nid));

      case "thread-menu-file": {
        // A file row → scope the (already-visible) chat to that file's thread
        // in place. No auto-switch to the full Chat tab.
        const fileNid = cmd && cmd.mget && cmd.mget("file_nid");
        if (!fileNid) return this._closeThreadMenu();
        // The skeleton always sets `filename` on the row model.
        const fileLabel = (cmd && cmd.mget && cmd.mget("filename")) || "";
        this._closeThreadMenu();
        return this.scopeChatToFile(fileNid, fileLabel);
      }

      case "download-chat-history":
        this._closeThreadMenu();
        return this._openChatExportModal();

      // File kebab → "Chat Threads → Download Chat Threads". Bubbled up from the
      // media node (cmd = that file node); open the export modal scoped to this
      // single file's thread, with the file (not the folder) in the card.
      case "download-file-chat":
        return this._openFileChatExportModal(cmd);

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
        // Scope in place — do not auto-open the full Chat tab.
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
        // The Meeting tab opens the calendar view, not a live call. (Live-call
        // joins come via activeTab:"meeting" in onDomRefresh, bypassing this.)
        return this.showFolderTab("meeting");

      case "toggle-files-layout":
        return this.toggleFilesLayout(cmd);

      case "leave-meeting":
      case "close-call-panel":
        this.mset("activeTab", "files");
        return this.showFolderTab("files");

      case "start-meeting":
        return this._launchMeetingInPanel();

      // ── Meeting-tab schedule view (skeleton/meeting-schedule.js) ────────
      case "sched-prev":
      case "sched-next":
      case "sched-today": {
        const st = require("./skeleton/meeting-schedule").schedState(this);
        const unit = st.view === "monthly" ? "month" : "week";
        if (service === "sched-today") st.anchor = Dayjs();
        else st.anchor = st.anchor.add(service === "sched-next" ? 1 : -1, unit);
        return this._refreshSchedule();
      }

      case "sched-toggle-view": {
        const st = require("./skeleton/meeting-schedule").schedState(this);
        st.view = st.view === "monthly" ? "weekly" : "monthly";
        return this._refreshSchedule();
      }

      // ── Meeting scheduling modal (skeleton/meeting-modal.js) ───────────
      case "open-schedule":
        // Calendar "Schedule" CTA → create a new meeting.
        return this.openMeetingModal();

      case "open-meeting": {
        // A schedule card on the calendar → edit that meeting.
        const nid = (cmd.mget && cmd.mget(_a.nid)) || (cmd.el && cmd.el.dataset.nid);
        const meeting = (this._meetings || []).find((m) => m.id === nid);
        return this.openMeetingModal({ meeting });
      }

      case "close-meeting-modal":
        return this.closeMeetingModal();

      case "mm-toggle-invitee":
        return this.toggleMeetingInvitee(cmd);

      case "mm-set-recur":
        return this.setMeetingRecur(cmd);

      case "meeting-modal-submit":
        return this.submitMeetingModal();

      case "meeting-modal-delete":
        return this.deleteMeetingModal();

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

  /**
   * Open the "Export chat history" modal in a fixed-position viewport overlay
   * so it is never clipped by the folder window's bounds.
   *
   * Root cause: wrapper-dialog is `position:absolute; top:132px` INSIDE the
   * window container (window.scss ~line 183), so a 530px-tall card is clipped.
   *
   * Fix: use a dedicated `wrapper-chat-export` Wrapper appended via `this.append()`
   * (so Marionette owns the lifecycle), with CSS `position:fixed; inset:0`
   * (class `widget-chat-export__viewport-backdrop`) applied via `data-chat-export`.
   * A backdrop overlay closes on click-outside. Does NOT touch `wrapper-dialog` so
   * create-folder / rename-folder dialogs are completely unaffected.
   */
  _openChatExportModal() {
    // Tear down any previous overlay first (e.g. user re-clicks menu quickly).
    this._closeChatExportOverlay();

    const folderName = this.mget(_a.name);
    const folderColor = this._chatExportFolderColor(folderName);

    // Append a dedicated Wrapper to this window so Marionette owns its lifecycle.
    // The wrapper's __bhv_wrapper behavior auto-sets data-state="open" when it
    // receives children, and "closed" when empty. We feed immediately after
    // ensurePart resolves, so it will open automatically.
    this.append(
      Skeletons.Wrapper.Y({
        className: "widget-chat-export__viewport-backdrop",
        name: "chat-export",
      }),
    );

    this.ensurePart("wrapper-chat-export").then((wrapper) => {
      if (!wrapper || (wrapper.isDestroyed && wrapper.isDestroyed())) return;
      this._chatExportWrapper = wrapper;

      // Clicking the backdrop (not the card) closes the modal.
      wrapper.el.addEventListener("click", (e) => {
        if (e.target === wrapper.el) {
          this._closeChatExportOverlay();
        }
      });

      // Feed the export widget into the centering container.
      wrapper.feed({
        kind: "widget_chat_export",
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.nid),
        name: folderName,
        // Folder access level (private/share/public/dmz) → drives the icon
        // colour in the modal, matching the hub icon shown outside.
        area: this.mget(_a.area),
        uiHandler: [this],
      });
    });
  }

  /**
   * Open the export modal scoped to a SINGLE file's chat thread, reusing the
   * same viewport overlay + widget as the folder-wide export. Differences:
   *   - card shows the file (filename) instead of the folder,
   *   - scope picker is hidden (scope is fixed to this file's thread),
   *   - the widget resolves the file's file_thread_id from export_scope by
   *     matching file_nid, then exports scope_sel=[file_thread_id] — which the
   *     offline worker treats as "this thread only" (no hub chat).
   * @param {*} cmd the bubbled media node (carries the file's nid/filename).
   */
  _openFileChatExportModal(cmd) {
    this._closeChatExportOverlay();

    const fileNid =
      (cmd && cmd._args && cmd._args.nid) ||
      (cmd && cmd.mget && cmd.mget(_a.nid));
    if (!fileNid) return;
    const filename =
      (cmd && cmd._args && (cmd._args.filename || cmd._args.name)) ||
      (cmd && cmd.mget && (cmd.mget(_a.filename) || cmd.mget(_a.name))) ||
      (cmd && _.isFunction(cmd.fullname) && cmd.fullname()) ||
      "";

    this.append(
      Skeletons.Wrapper.Y({
        className: "widget-chat-export__viewport-backdrop",
        name: "chat-export",
      }),
    );

    this.ensurePart("wrapper-chat-export").then((wrapper) => {
      if (!wrapper || (wrapper.isDestroyed && wrapper.isDestroyed())) return;
      this._chatExportWrapper = wrapper;

      wrapper.el.addEventListener("click", (e) => {
        if (e.target === wrapper.el) {
          this._closeChatExportOverlay();
        }
      });

      wrapper.feed({
        kind: "widget_chat_export",
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.nid),
        // File-scope mode: render the file card + hide the scope picker; the
        // widget matches file_nid → file_thread_id against export_scope.
        file_scope: 1,
        file_nid: `${fileNid}`,
        filename,
        area: this.mget(_a.area),
        uiHandler: [this],
      });
    });
  }

  /**
   * Computes the folder's representative color using the same colorFromName
   * utility that chat-item/username uses for bubble colours, so the folder
   * icon box in the export modal matches the hub's chat accent.
   * @param {string} name
   * @returns {string} hsl(...) color string
   */
  _chatExportFolderColor(name) {
    try {
      const { colorFromName } = require("@drumee/ui-essentials");
      return colorFromName(name || "folder");
    } catch (_) {
      return "hsl(240, 40%, 60%)";
    }
  }

  /**
   * Tears down the viewport-level chat-export overlay wrapper + its child widget.
   */
  _closeChatExportOverlay() {
    if (this._chatExportWrapper) {
      if (_.isFunction(this._chatExportWrapper.goodbye)) {
        this._chatExportWrapper.goodbye();
      } else if (_.isFunction(this._chatExportWrapper.suppress)) {
        this._chatExportWrapper.suppress();
      }
      this._chatExportWrapper = null;
    }
  }

  openCreateFolderDialog() {
    return this.ensurePart("wrapper-dialog").then((wrapper) => {
      this.dialogWrapper = wrapper;
      wrapper.feed(require("./skeleton/create-folder-dialog")(this));
      return this.ensurePart("create-folder-name").then((entry) =>
        // Defer focus: ensurePart resolves as soon as the EntryBox mounts, but
        // its inner native <input> isn't ready yet, so an immediate
        // entry.focus() no-ops. In folders that show the chat panel (shared
        // workspaces) the chat composer autofocused on render and KEEPS the
        // caret, so the dialog field never gets focus and can't be typed into.
        // Focus the real <input> on the next tick so the dialog reliably wins.
        // Mirrors openFolderRenameDialog's _.delay pattern.
        _.delay(() => {
          if (!entry || (entry.isDestroyed && entry.isDestroyed())) return;
          const input = entry.el && entry.el.querySelector("input");
          if (input) {
            input.focus();
            input.select();
          } else if (entry.focus) {
            entry.focus();
          }
        }, 60),
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

  // Re-render the Meeting-tab schedule in place after a nav/toggle service
  // (state lives in this._sched — see skeleton/meeting-schedule.js). Refetches
  // the hub's meetings for the (possibly changed) visible range first, so the
  // grid always reflects the current window.
  _refreshSchedule() {
    return this._fetchMeetings().then(() => {
      const part = this.getPart && this.getPart("meeting-panel");
      if (!part || !part.el) return;
      const skl = require("./skeleton/meeting-schedule")(this);
      part.feed(skl.kids);
    });
  }

  // The [stime, etime] epoch bounds of the calendar's visible range, derived
  // from the schedule view state (this._sched). Padded a week/month either side
  // so meetings straddling the edge still surface.
  _meetingRange() {
    const st = require("./skeleton/meeting-schedule").schedState(this);
    if (st.view === "monthly") {
      const s = st.anchor.startOf("month").startOf("week").subtract(1, "day");
      const e = st.anchor.endOf("month").endOf("week").add(1, "day");
      return { stime: s.unix(), etime: e.unix() };
    }
    const s = st.anchor.startOf("week");
    const e = s.add(7, "day");
    return { stime: s.unix(), etime: e.unix() };
  }

  // Fetch the hub's scheduled meetings for the visible range into this._meetings.
  // Resolves (never rejects) so callers can re-feed regardless.
  _fetchMeetings() {
    const { stime, etime } = this._meetingRange();
    return this.fetchService(SERVICE.room.list || "room.list", { stime, etime })
      .then((rows) => {
        this._meetings = Array.isArray(rows) ? rows : [];
      })
      .catch(() => {
        this._meetings = this._meetings || [];
      });
  }

  // ── Meeting Information modal (skeleton/meeting-modal.js) ────────────────

  // Normalize a room.list row into the modal's prefill shape. `stime`/`etime`
  // are epoch seconds; `date` is a legacy display string kept for back-compat.
  // Attendees are workspace members ({uid,name}); recur is the recurrence rule.
  _prefillMeeting(m) {
    if (!m) return null;
    let content = {};
    try {
      const md = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata || {};
      content = typeof md.content === "string" ? JSON.parse(md.content) : md.content || {};
    } catch (e) {
      content = {};
    }
    const s = Number(m.stime || content.stime) || 0;
    const e = Number(m.etime || content.etime) || 0;
    const recur = content.recur || null;
    return {
      nid: m.id,
      title: content.title || m.filename || "",
      message: content.message || "",
      date_ymd: s ? Dayjs.unix(s).format("YYYY-MM-DD") : Dayjs().format("YYYY-MM-DD"),
      stime_hm: s ? Dayjs.unix(s).format("HH:mm") : "",
      etime_hm: e ? Dayjs.unix(e).format("HH:mm") : "",
      attendees: Array.isArray(content.attendees)
        ? content.attendees.map((a) => ({ uid: a.uid || a, name: a.name || "" })).filter((a) => a.uid)
        : [],
      recur: {
        freq: (recur && recur.freq) || "none",
        until: recur && recur.until ? Dayjs.unix(Number(recur.until)).format("YYYY-MM-DD") : "",
      },
    };
  }

  openMeetingModal(opt = {}) {
    const prefill = this._prefillMeeting(opt.meeting);
    // Working state the invitee chips + recurrence row read/mutate.
    this._mmAttendees = prefill ? prefill.attendees.slice() : [];
    this._mmRecur = prefill ? { ...prefill.recur } : { freq: "none", until: "" };
    this._mmEditNid = prefill ? prefill.nid : null;
    // Fetch the workspace member pool first so the invitee chips can render.
    const hubId = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    const loadMembers = this.fetchService(SERVICE.hub.get_members_by_type, { type: "all", hub_id: hubId })
      .then((rows) => {
        this._hubMembers = Array.isArray(rows) ? rows : [];
      })
      .catch(() => {
        this._hubMembers = this._hubMembers || [];
      });
    return loadMembers.then(() =>
      this.ensurePart("wrapper-dialog").then((wrapper) => {
        this.dialogWrapper = wrapper;
        if (wrapper.el) {
          wrapper.el.setAttribute("data-variant", "meeting");
          // Glass backdrop behind the centered card (Figma 2510-145902).
          wrapper.el.setAttribute("data-overlay", "blur");
        }
        wrapper.feed(require("./skeleton/meeting-modal")(this, { meeting: prefill }));
      }),
    );
  }

  closeMeetingModal() {
    this._mmAttendees = [];
    this._mmRecur = { freq: "none", until: "" };
    this._mmEditNid = null;
    if (this.dialogWrapper) {
      if (this.dialogWrapper.el) {
        this.dialogWrapper.el.removeAttribute("data-variant");
        this.dialogWrapper.el.removeAttribute("data-overlay");
      }
      this.dialogWrapper.clear();
    }
  }

  _reFeedInviteeChips() {
    const part = this.getPart && this.getPart("mm-invitees-chips");
    if (!part) return;
    const pfx = `${this.fig.family}__meeting-modal`;
    part.feed(require("./skeleton/meeting-modal").inviteesChips(this, pfx));
  }

  // Toggle a workspace member in/out of the invitee set, then re-render chips.
  toggleMeetingInvitee(cmd) {
    const uid = cmd && ((cmd.mget && cmd.mget("uid")) || (cmd.el && cmd.el.dataset.uid));
    if (!uid) return;
    const name = (cmd.mget && cmd.mget("uname")) || "";
    this._mmAttendees = this._mmAttendees || [];
    const i = this._mmAttendees.findIndex((a) => (a.uid || a) === uid);
    if (i >= 0) this._mmAttendees.splice(i, 1);
    else this._mmAttendees.push({ uid, name });
    this._reFeedInviteeChips();
  }

  // Set the recurrence frequency, then re-feed the recurrence row (so the
  // "Until" date shows/hides with the None ↔ repeat switch).
  setMeetingRecur(cmd) {
    const freq = (cmd.mget && cmd.mget("freq")) || (cmd.el && cmd.el.dataset.freq) || "none";
    this._mmRecur = this._mmRecur || { freq: "none", until: "" };
    // Preserve a picked "until" across toggles unless switching to None.
    const untilEl = this.dialogWrapper && this.dialogWrapper.el
      && this.dialogWrapper.el.querySelector('[name="mm-until"]');
    if (untilEl) this._mmRecur.until = String(untilEl.value || "").trim();
    this._mmRecur.freq = freq;
    if (freq === "none") this._mmRecur.until = "";
    const part = this.getPart && this.getPart("mm-recur");
    if (part) {
      const pfx = `${this.fig.family}__meeting-modal`;
      part.feed(require("./skeleton/meeting-modal").recurRow(this, pfx));
    }
  }

  // Read the modal form off the dialog DOM: title, message, date + start/end
  // time → epochs, recurrence rule, and the selected member uids. Returns null
  // if the date is missing.
  _readMeetingForm() {
    const root = this.dialogWrapper && this.dialogWrapper.el;
    if (!root) return null;
    const val = (sel) => {
      const el = root.querySelector(sel);
      return el ? String(el.value || "").trim() : "";
    };
    const title = val('[name="mm-title"]');
    const message = val('[name="mm-message"]');
    const dateYmd = val('[name="mm-date"]'); // Y-m-d from date_picker
    const sHm = val('[name="mm-stime"]');
    const eHm = val('[name="mm-etime"]');
    if (!dateYmd) return null;
    // Build ISO strings (YYYY-MM-DDTHH:mm) — parsed natively by Dayjs without
    // the customParseFormat plugin, which isn't guaranteed to be loaded.
    const stime = sHm ? Dayjs(`${dateYmd}T${sHm}`).unix() : Dayjs(dateYmd).unix();
    const etime = eHm ? Dayjs(`${dateYmd}T${eHm}`).unix() : stime;

    // Recurrence rule → { freq, until? } (epoch) or null for a one-off.
    const rc = this._mmRecur || { freq: "none" };
    let recur = null;
    if (rc.freq && rc.freq !== "none") {
      const untilYmd = val('[name="mm-until"]') || rc.until;
      recur = { freq: rc.freq };
      if (untilYmd) recur.until = Dayjs(`${untilYmd}T23:59`).unix();
    }

    return {
      title,
      message,
      // Legacy display string (back-compat for player/schedule). Plain tokens
      // only — no localizedFormat plugin dependency.
      date: Dayjs.unix(stime).format("ddd, MMM D, YYYY h:mm A"),
      stime,
      etime,
      recur,
      attendees: (this._mmAttendees || []).slice(),
    };
  }

  submitMeetingModal() {
    if (this._mmSubmitting) return;
    const form = this._readMeetingForm();
    if (!form) return; // no date → do nothing (field stays open)
    this._mmSubmitting = 1;
    const nid = this._mmEditNid;
    const done = () => {
      this._mmSubmitting = 0;
      this.closeMeetingModal();
      this._refreshSchedule();
    };
    const fail = () => {
      this._mmSubmitting = 0;
    };

    if (nid) {
      // Edit: flag "all" updates title/agenda/when + members (uids) + recur.
      return this.fetchService(SERVICE.room.update || "room.update", {
        flag: "all",
        nid,
        title: form.title,
        message: form.message,
        date: form.date,
        stime: form.stime,
        etime: form.etime,
        recur: form.recur,
        attendees: form.attendees,
      }).then(done, fail);
    }

    // Create: book the node (with recurrence), then attach the invited members
    // via update "member" (which notifies them in-app).
    return this.fetchService(SERVICE.room.book || "room.book", {
      title: form.title,
      message: form.message,
      date: form.date,
      stime: form.stime,
      etime: form.etime,
      recur: form.recur,
    })
      .then((node) => {
        const newNid = node && (node.id || node.nid);
        if (newNid && form.attendees.length) {
          return this.fetchService(SERVICE.room.update || "room.update", {
            flag: "member",
            nid: newNid,
            attendees: form.attendees,
          });
        }
      })
      .then(done, fail);
  }

  deleteMeetingModal() {
    const nid = this._mmEditNid;
    if (!nid) return this.closeMeetingModal();
    return this.postService(SERVICE.room.remove || "room.remove", { nid }).then(() => {
      this.closeMeetingModal();
      this._refreshSchedule();
    });
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
      // Center within the WM content area (right of the sidebar), not the raw
      // viewport — see Wm.centeredPopupGeometry.
      const { top, left, width, height } = Wm.centeredPopupGeometry();

      return Wm.launch(
        {
          kind: "window_meeting",
          hub_id: this.mget(_a.hub_id),
          nid: room_id,
          room_id,
          // Forward this folder's chat-channel identity so the meeting chat
          // binds to the same conversation. chat_nid is the folder chat's
          // scope nid (this window's nid), not the workspace root.
          actual_hub_id: this.mget(_a.actual_hub_id),
          actual_home_id: this.mget(_a.actual_home_id),
          chat_nid: this.mget(_a.nid),
          home_id: this.mget(_a.home_id),
          ownpath: this.mget(_a.ownpath),
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

  // The 3-column Chat-tab layout (rail + #General + side panel) needs width; the
  // @container query collapses it ≤700px. Below that the rail + side panel are
  // CSS-hidden, so fall back to the single in-place chat (folder header + 3-dot
  // dropdown still switch threads).
  _isCompactChat() {
    // Match the @container window-folder-w (max-width:700px) query exactly: it
    // is anchored on the window root (.window-folder__ui = this.el), NOT the
    // narrower split-body — measuring the split-body left a boundary band where
    // CSS showed the 2-column layout but JS took the compact branch (empty rail).
    const w = (this.el && this.el.offsetWidth) || 9999;
    return w <= 700;
  }

  scopeChatToFile(fileNid, fileLabel, opts = {}) {
    // Full (wide) Chat tab: the file thread lives in the docked RIGHT panel; the
    // middle chat always stays #General (Figma 2331-46821). Files tab — and the
    // compact Chat tab — scope the single chat IN PLACE (no room for a column).
    // opts.replyData (optional): a captured reply quote to restore in the thread
    // composer (reply-in-thread from a file message).
    if (this.activeTab === _a.chat && !this._isCompactChat()) {
      if (fileNid) return this._openFileThreadPanel(fileNid, fileLabel, opts.replyData);
      return this._closeFileThreadPanel();
    }
    // ── Files-tab in-place scoping ──
    // Track the active file scope so folder navigation (updateTopbar) can drop
    // it — scopedFileNid otherwise wins in the chat's getCurrentApi, pinning the
    // old thread and leaving a stale file-thread header.
    this._scopedFileNid = fileNid ? `${fileNid}` : "";
    // Swap the chat header between "Team Chat" and the file-thread bar (back +
    // filename + tag) to match the new scope (Figma 2216-166665).
    this._updateChatHeader(fileNid, fileLabel);
    // Pin the file-info card above the in-place chat (or clear it for General).
    this._updateChatInfoCard(fileNid, fileLabel);
    // Keep the docked Chat-tab rail's highlight in lockstep with the scope.
    this._setThreadRailActive(fileNid || "");
    return this.ensurePart("folder-chat").then((chat) => {
      if (chat && _.isFunction(chat.setScopedFileNid))
        chat.setScopedFileNid(fileNid, fileLabel, opts.replyData);
    });
  }

  // Re-feed the folder team-chat header part for the current scope:
  //   file   → file-thread bar (back + paperclip + filename + tag),
  //   general→ "# General" + search (full Chat-tab middle header),
  //   folder → "Team Chat" + 3-dot + search (Files-tab default).
  // data-scope drives the row layout in SCSS.
  _updateChatHeader(fileNid, label, general) {
    return this.ensurePart("chat-header-bar").then((bar) => {
      if (!bar || (bar.isDestroyed && bar.isDestroyed()) || !bar.el) return;
      // Re-feeding a normal header out of search mode (tab/scope switch with the
      // search bar still open) must tear down the search results overlay so it
      // does not linger over the restored conversation.
      if (bar.el.dataset.scope === "search") {
        this._chatSearchRestore = null;
        this._hideChatSearchResults();
      }
      bar.el.dataset.scope = fileNid ? "file" : general ? "general" : "folder";
      // Stamp the active file so a slow hydrate can't paint into a re-scoped header.
      bar.el.dataset.ftNid = fileNid ? `${fileNid}` : "";
      bar.feed(
        chatHeaderBar(this, {
          fileNid: fileNid || "",
          label: label || "",
          general: !!general && !fileNid,
        }),
      );
      if (fileNid) this._hydrateChatHeaderFile(bar, `${fileNid}`);
    });
  }

  // ── Team-chat header message search ───────────────────────────────────
  // Swap the `chat-header-bar` content for a search bar (back + input). Snapshot
  // the current header mode first so the back arrow can restore the exact same
  // header (general / folder / file). The search filters the folder-chat
  // conversation that always sits below this header.
  _openChatSearch() {
    return this.ensurePart("chat-header-bar").then((bar) => {
      if (!bar || !bar.el || (bar.isDestroyed && bar.isDestroyed())) return;
      const scope = bar.el.dataset.scope || "folder";
      const fileNid = bar.el.dataset.ftNid || "";
      let label = "";
      if (fileNid) {
        const nameEl = bar.el.querySelector(
          `.${this.fig.group}__chat-header-file-name`,
        );
        label = nameEl ? nameEl.textContent || "" : "";
      }
      this._chatSearchRestore = {
        fileNid,
        label,
        general: scope === "general",
      };
      bar.el.dataset.scope = "search";
      bar.feed(chatSearchBar(this));
    });
  }

  // Back arrow → tear down the results overlay and restore the pre-search header.
  _closeChatSearch() {
    this._hideChatSearchResults();
    const r =
      this._chatSearchRestore || { fileNid: "", label: "", general: false };
    this._chatSearchRestore = null;
    return this._updateChatHeader(r.fileNid, r.label, r.general);
  }

  // Run a backend message search over the FULL history of the conversation the
  // search bar sits above (folder-chat): #General team chat when not file-scoped,
  // else the open file thread. Debounced; queries < 2 chars hide the overlay
  // (the server returns [] anyway). A monotonic token discards stale responses
  // so a slower earlier query cannot overwrite a newer one.
  _runChatSearch(text) {
    const q = `${text || ""}`.trim();
    if (this._chatSearchTimer) clearTimeout(this._chatSearchTimer);
    if (q.length < 2) {
      this._chatSearchToken = (this._chatSearchToken || 0) + 1; // cancel in-flight
      return this._hideChatSearchResults();
    }
    this._chatSearchTimer = setTimeout(() => {
      const token = (this._chatSearchToken = (this._chatSearchToken || 0) + 1);
      // Scope = the folder-chat's current file thread (empty = team chat). Pass
      // file_nid too: the thread id resolves asynchronously, so on an in-place
      // file thread it can still be empty here — the server then resolves the
      // thread from the (synchronously-known) file nid instead of falling back
      // to the team chat.
      this.ensurePart("folder-chat").then((chat) => {
        const fileThreadId = (chat && chat.fileThreadId) || "";
        const fileNid = (chat && chat.scopedFileNid) || "";
        const svc =
          (SERVICE.channel && SERVICE.channel.search) || "channel.search";
        this.fetchService(
          {
            service: svc,
            // hub_id is REQUIRED: a scope=hub service resolves its hub DB from
            // the request hub_id (session.js), falling back to the host when it
            // is absent — which targets the wrong DB and returns nothing. Same
            // hub the folder team chat uses (_fetchThreadList / channel.messages).
            hub_id: this.mget(_a.actual_hub_id) || this.mget(_a.hub_id),
            pattern: q,
            file_thread_id: fileThreadId,
            file_nid: fileNid,
          },
          { async: 1 },
        )
          .then((res) => {
            // Drop stale / superseded responses.
            if (token !== this._chatSearchToken) return;
            const rows = _.isArray(res)
              ? res
              : (res && (res.data || res.rows)) || [];
            this._showChatSearchResults(rows);
          })
          .catch(() => {
            if (token !== this._chatSearchToken) return;
            this._showChatSearchResults([]);
          });
      });
    }, 250);
  }

  _showChatSearchResults(rows) {
    return this.ensurePart("search-results").then((panel) => {
      if (!panel || !panel.el || (panel.isDestroyed && panel.isDestroyed()))
        return;
      panel.feed(searchResults(this, rows));
      panel.el.dataset.open = "1";
    });
  }

  _hideChatSearchResults() {
    if (this._chatSearchTimer) {
      clearTimeout(this._chatSearchTimer);
      this._chatSearchTimer = null;
    }
    this._chatSearchToken = (this._chatSearchToken || 0) + 1; // cancel in-flight
    const panel = this._searchResultsPart;
    if (panel && panel.el && !(panel.isDestroyed && panel.isDestroyed())) {
      panel.el.dataset.open = "0";
      panel.feed([]);
    }
  }

  // A result row → close the search and scroll to the message if it is currently
  // loaded in the conversation list (older/unloaded messages just close search).
  _jumpToSearchResult(cmd) {
    const messageId = cmd && cmd.mget && cmd.mget("message_id");
    this._closeChatSearch();
    if (!messageId) return;
    return this.ensurePart("folder-chat").then((chat) => {
      const list = chat && chat.__list;
      if (!list || !_.isFunction(list.getItemsByAttr)) return;
      const hit = list.getItemsByAttr("message_id", `${messageId}`)[0];
      if (hit && hit.el && _.isFunction(hit.el.scrollIntoView)) {
        hit.el.scrollIntoView({ block: "center" });
      }
    });
  }

  // Paint a file's vignette thumbnail onto a badge element (image/vector only).
  // Shared by the header badge and the info-card badge — only the modifier class
  // differs. No-op for non-preview types (paperclip stays).
  _applyVignette(badge, fileNid, hub_id, modifierClass) {
    if (!badge) return;
    const { mfs_base, keysel } = bootstrap();
    let url = `${mfs_base}file/vignette/${fileNid}/${hub_id}`;
    if (keysel) url += `?keysel=${keysel}`;
    badge.style.backgroundImage = `url("${url}")`;
    badge.classList.add(modifierClass);
  }

  // Apply a file thread's real name + (image/vector) vignette into a header DOM
  // subtree. Shared by the in-place chat header and the side-panel header — the
  // label passed in may be stale/empty (deep-link) and the paperclip should
  // become the file's vignette (mirrors the chat-item card hydration).
  _fillFileHeader(rootEl, fileNid, hub_id, info) {
    const grp = this.fig.group;
    const name = info.user_filename || info.filename || "";
    const nameEl = rootEl.querySelector(`.${grp}__chat-header-file-name`);
    if (nameEl && name) nameEl.textContent = name;
    const type = info.filetype || info.category;
    if (type === _a.image || type === _a.vector) {
      this._applyVignette(
        rootEl.querySelector(`.${grp}__chat-header-file-badge`),
        fileNid,
        hub_id,
        `${grp}__chat-header-file-badge--image`,
      );
    }
  }

  // Fill the side-panel info card (Figma 2216-165656) from file_thread_info:
  // filename, "N replies", relative time, and the image/vector vignette badge.
  // "Open file →" is static (wired to open-file-from-thread); only the data
  // fields are hydrated here.
  _fillFileInfoCard(rootEl, fileNid, hub_id, info) {
    const grp = this.fig.group;
    const q = (cls) => rootEl.querySelector(`.${grp}__${cls}`);
    const name = info.user_filename || info.filename || "";
    const nameEl = q("ft-info-name");
    if (nameEl && name) nameEl.textContent = name;

    const replies = Number(info.reply_count || 0);
    const repliesLbl =
      replies === 1
        ? LOCALE.REPLY_ONE || "reply"
        : LOCALE.REPLIES || "replies";
    const repliesEl = q("ft-info-replies");
    if (repliesEl) repliesEl.textContent = `${replies} ${repliesLbl}`;

    let when = "";
    const mtime = Number(info.mtime || info.ctime || 0);
    if (mtime) {
      try {
        when = Dayjs.unix(mtime).fromNow();
      } catch (e) {
        when = "";
      }
    }
    const timeEl = q("ft-info-time");
    if (timeEl) timeEl.textContent = when;
    const dotEl = q("ft-info-dot");
    if (dotEl) dotEl.textContent = when ? "•" : "";

    const type = info.filetype || info.category;
    if (type === _a.image || type === _a.vector) {
      this._applyVignette(
        q("ft-info-badge"),
        fileNid,
        hub_id,
        `${grp}__ft-info-badge--image`,
      );
    }
  }

  _hydrateChatHeaderFile(bar, fileNid) {
    const hub_id = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    const svc =
      (SERVICE.channel && SERVICE.channel.file_thread_info) ||
      "channel.file_thread_info";
    this.fetchService({ service: svc, hub_id, file_nid: fileNid }, { async: 1 })
      .then((info) => {
        if (!info || !bar.el || (bar.isDestroyed && bar.isDestroyed())) return;
        // Header may have switched back to folder, or to a different file, while
        // the fetch was in flight.
        if (bar.el.dataset.scope !== "file") return;
        if (bar.el.dataset.ftNid !== `${fileNid}`) return;
        this._fillFileHeader(bar.el, fileNid, hub_id, info);
      })
      .catch(() => {});
  }

  // Pin (or clear) the in-place Files-tab file-thread info card above the chat —
  // the same card the side panel shows (Figma 2216-165656). Populated on file
  // scope, emptied on General. The full-tab middle chat never file-scopes in
  // place, so its slot stays empty there.
  _updateChatInfoCard(fileNid, label) {
    // Reset the cached filetype until this file's info resolves (so "Open file →"
    // never launches a player from a stale other-context filetype).
    this._ftFiletype = "";
    return this.ensurePart("chat-info-card").then((slot) => {
      if (!slot || !slot.el || (slot.isDestroyed && slot.isDestroyed())) return;
      if (!fileNid) {
        slot.el.dataset.open = "0";
        slot.el.dataset.ftNid = "";
        slot.feed([]);
        return;
      }
      slot.feed(fileThreadInfoCard(this, { fileNid: `${fileNid}`, label: label || "" }));
      slot.el.dataset.open = "1";
      slot.el.dataset.ftNid = `${fileNid}`;
      this._hydrateChatInfoCard(slot, `${fileNid}`);
    });
  }

  _hydrateChatInfoCard(slot, fileNid) {
    const hub_id = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    const svc =
      (SERVICE.channel && SERVICE.channel.file_thread_info) ||
      "channel.file_thread_info";
    this.fetchService({ service: svc, hub_id, file_nid: fileNid }, { async: 1 })
      .then((info) => {
        if (!info || !slot.el || (slot.isDestroyed && slot.isDestroyed())) return;
        if (slot.el.dataset.open !== "1") return;
        if (slot.el.dataset.ftNid !== `${fileNid}`) return;
        this._ftFiletype = `${info.filetype || info.category || ""}`;
        this._fillFileInfoCard(slot.el, fileNid, hub_id, info);
      })
      .catch(() => {});
  }

  // ── Full Chat-tab file-thread side panel (Figma 2331-47041) ───────────
  // Open (or re-scope) the docked right panel to a file thread: re-feed it with
  // [header, scoped chat widget], reveal it (data-open + split-body
  // data-thread="open" → 3-column grid), and hydrate the header with the file's
  // real name + vignette. The middle #General chat is untouched.
  _openFileThreadPanel(fileNid, fileLabel, replyData) {
    const nid = `${fileNid}`;
    return this.ensurePart("file-thread-panel").then((panel) => {
      if (!panel || !panel.el || (panel.isDestroyed && panel.isDestroyed()))
        return;
      this._fileThreadPanelPart = panel;
      panel.feed(
        fileThreadPanelContent(this, {
          fileNid: nid,
          label: fileLabel || "",
          replyData,
        }),
      );
      panel.el.dataset.open = "1";
      // Stamp the active file so a slow hydrate from a previously-opened file
      // (rapid re-scope A→B) cannot paint into B's freshly-fed card. Reset the
      // cached filetype until this file's info resolves so "Open file →" never
      // launches the wrong player from a stale (other-context) filetype.
      panel.el.dataset.ftNid = nid;
      this._ftFiletype = "";
      this._setFolderViewThread("open");
      this._hydrateFtPanelHeader(panel, nid);
    });
  }

  // Hide the side panel and tear down its scoped chat widget (feed [] →
  // onBeforeDestroy unbinds its WS), collapsing the grid back to 2 columns.
  _closeFileThreadPanel() {
    const panel = this._fileThreadPanelPart;
    if (panel && panel.el && !(panel.isDestroyed && panel.isDestroyed())) {
      panel.el.dataset.open = "0";
      panel.feed([]);
    }
    this._setFolderViewThread("closed");
  }

  // Toggle the split-body's data-thread so SCSS switches between the 2-column
  // ([rail | chat]) and 3-column ([rail | chat | file panel]) Chat-tab grids.
  _setFolderViewThread(state) {
    const apply = (v) => {
      if (v && v.el && !(v.isDestroyed && v.isDestroyed()))
        v.el.dataset.thread = state;
    };
    if (
      this.__folderView &&
      !(this.__folderView.isDestroyed && this.__folderView.isDestroyed())
    )
      return apply(this.__folderView);
    return this.ensurePart("folder-view").then(apply);
  }

  // Fill the side-panel header AND the info card from one file_thread_info fetch
  // (name + vignette for both; replies + time for the card). Guards on the panel
  // still being open for the same file when the fetch resolves.
  _hydrateFtPanelHeader(panel, fileNid) {
    const hub_id = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    const svc =
      (SERVICE.channel && SERVICE.channel.file_thread_info) ||
      "channel.file_thread_info";
    this.fetchService({ service: svc, hub_id, file_nid: fileNid }, { async: 1 })
      .then((info) => {
        if (!info || !panel.el || (panel.isDestroyed && panel.isDestroyed()))
          return;
        // Panel may have closed, or re-scoped to a different file, while the
        // fetch was in flight — bail so we never paint stale info into the
        // current card.
        if (panel.el.dataset.open !== "1") return;
        if (panel.el.dataset.ftNid !== `${fileNid}`) return;
        // Cache the file's type so "Open file →" can launch the right player
        // even when the file's grid item is not currently rendered.
        this._ftFiletype = `${info.filetype || info.category || ""}`;
        this._fillFileHeader(panel.el, fileNid, hub_id, info);
        this._fillFileInfoCard(panel.el, fileNid, hub_id, info);
      })
      .catch(() => {});
  }

  // Entering the full Chat tab: the middle chat is always #General. Drop any
  // in-place file scope carried from the Files tab, re-assert folder scope,
  // switch the middle header to the "# General" variant, and (re)populate the
  // left rail. The file-thread side panel starts closed.
  _enterChatTabLayout() {
    // Compact: rail + side panel are CSS-hidden → keep the single in-place chat
    // with the folder header (Team Chat + 3-dot dropdown for thread switching).
    if (this._isCompactChat()) {
      this._updateChatHeader(this._scopedFileNid || null, "", false);
      this._updateChatInfoCard(this._scopedFileNid || null, "");
      return;
    }
    this._scopedFileNid = "";
    // Middle chat is #General in the full tab → drop any in-place info card.
    this._updateChatInfoCard(null);
    this.ensurePart("folder-chat").then((chat) => {
      if (!chat) return;
      if (_.isFunction(chat.setScopedFileNid)) chat.setScopedFileNid(null);
      if (_.isFunction(chat.setScopedFolderNid))
        chat.setScopedFolderNid(this.mget(_a.nid));
    });
    this._updateChatHeader(null, "", true);
    this._populateThreadRail();
  }

  // Leaving the full Chat tab: close the side panel and restore the folder
  // header (Team Chat + 3-dot) for the narrow Files-tab chat.
  _exitChatTabLayout() {
    this._closeFileThreadPanel();
    this._updateChatHeader(null, "", false);
  }

  scopeChatToFolder(folderNid) {
    return this.ensurePart("folder-chat").then((chat) => {
      if (chat && _.isFunction(chat.setScopedFolderNid))
        chat.setScopedFolderNid(folderNid);
    });
  }

  // ── Team-chat header thread-switch dropdown ────────────────────────────
  // Toggle the header 3-dot dropdown. On open, fetch the current folder's file
  // threads (channel.file_thread_list_by_folder) and feed the menu part; the
  // row matching the chat's current scope is highlighted (is-active).
  _toggleThreadMenu() {
    return this.ensurePart("thread-menu").then((menu) => {
      if (!menu || (menu.isDestroyed && menu.isDestroyed())) return;
      this._threadMenuPart = menu;
      if (menu.el.dataset.open === "1") return this._closeThreadMenu();

      const render = (items, scopedNid) => {
        // The fetch (and ensurePart) resolve async — bail if the window or the
        // menu part was destroyed meanwhile, so we never feed/flag a dead node
        // or re-bind a document listener on it.
        if (this.isDestroyed && this.isDestroyed()) return;
        if (!menu.el || (menu.isDestroyed && menu.isDestroyed())) return;
        menu.feed(
          require("./skeleton/thread-menu")(this, { items, scopedNid }),
        );
        menu.el.dataset.open = "1";
        this._bindThreadMenuOutside(menu);
      };
      // Current chat scope → highlight the matching row (file nid, or "" = General).
      this.ensurePart("folder-chat").then((chat) => {
        const scopedNid = chat && chat.scopedFileNid ? chat.scopedFileNid : "";
        // Fetch failure → still open with General + Download (no file rows).
        this._fetchThreadList().then((items) => render(items, scopedNid));
      });
    });
  }

  // Shared file-thread fetch for the current folder, used by both the header
  // dropdown (_toggleThreadMenu) and the docked Chat-tab rail
  // (_populateThreadRail). Resolves to a plain item array; never rejects (a
  // failed/absent fetch yields [] so callers still render General + Download).
  _fetchThreadList() {
    const hub_id = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    const folder_nid = this.mget(_a.nid);
    const svc =
      (SERVICE.channel && SERVICE.channel.file_thread_list_by_folder) ||
      "channel.file_thread_list_by_folder";
    return this.fetchService(
      { service: svc, folder_nid, hub_id, page: 1 },
      { async: 1 },
    )
      .then((res) =>
        _.isArray(res) ? res : (res && (res.data || res.rows)) || [],
      )
      .catch(() => []);
  }

  // ── Full Chat-tab thread rail (Figma 2328-115485) ─────────────────────
  // The docked left panel mirrors the header dropdown's thread list. Populate
  // it (fetch + render) when the Chat tab opens and on folder navigation while
  // that tab is active — the current folder's threads, highlighting the row
  // matching the chat's live scope. Items are cached so _setThreadRailActive
  // can move the highlight on scope change without re-fetching.
  _populateThreadRail() {
    if (this.fig.family !== "window-folder") return;
    // Snapshot the folder so a slow response from a folder we already left
    // cannot overwrite the rail with wrong-folder rows (last-writer-wins on
    // rapid navigation). Mirrors chat/index.js's nid recheck after async.
    const folderNid = `${this.mget(_a.nid)}`;
    return this.ensurePart("thread-rail").then((rail) => {
      if (!rail || !rail.el || (rail.isDestroyed && rail.isDestroyed())) return;
      this._threadRailPart = rail;
      return this.ensurePart("folder-chat").then((chat) => {
        const scopedNid = chat && chat.scopedFileNid ? chat.scopedFileNid : "";
        return this._fetchThreadList().then((items) => {
          if (this.isDestroyed && this.isDestroyed()) return;
          if (!rail.el || (rail.isDestroyed && rail.isDestroyed())) return;
          // Folder changed mid-fetch → discard this stale response.
          if (`${this.mget(_a.nid)}` !== folderNid) return;
          this._threadRailItems = items;
          rail.feed(
            require("./skeleton/thread-menu")(this, {
              items,
              scopedNid,
              variant: "rail",
            }),
          );
        });
      });
    });
  }

  // Move the rail's is-active highlight to the new chat scope ("" = General)
  // without a re-fetch — re-render the cached items. No-op until the rail has
  // been populated (cached items absent) or while it is unmounted/destroyed.
  _setThreadRailActive(scopedNid) {
    const rail = this._threadRailPart;
    if (!rail || !rail.el || (rail.isDestroyed && rail.isDestroyed())) return;
    if (!_.isArray(this._threadRailItems)) return;
    rail.feed(
      require("./skeleton/thread-menu")(this, {
        items: this._threadRailItems,
        scopedNid: scopedNid || "",
        variant: "rail",
      }),
    );
  }

  _closeThreadMenu() {
    const menu = this._threadMenuPart;
    if (menu && menu.el && !(menu.isDestroyed && menu.isDestroyed()))
      menu.el.dataset.open = "0";
    this._unbindThreadMenuOutside();
  }

  // Close the dropdown on any click outside it or its trigger. Capture phase so
  // it runs before the menu rows' own handling; the trigger guard lets the
  // 3-dot button toggle closed instead of immediately reopening.
  _bindThreadMenuOutside(menu) {
    this._unbindThreadMenuOutside();
    this._threadMenuOutside = (ev) => {
      const t = ev.target;
      if (!t) return;
      if (menu.el.contains(t)) return;
      if (t.closest && t.closest('[data-service="open-thread-menu"]')) return;
      this._closeThreadMenu();
    };
    document.addEventListener("click", this._threadMenuOutside, true);
  }

  _unbindThreadMenuOutside() {
    if (this._threadMenuOutside) {
      document.removeEventListener("click", this._threadMenuOutside, true);
      this._threadMenuOutside = null;
    }
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
        // Entering a different folder — clear any active file-type filter so
        // the child's full contents render (mirrors the breadcrumb path).
        this._resetFileTypeFilter();
      }
    }
    super.updateTopbar(m);
    // Navigating to another folder drops any open file thread → fall back to the
    // folder ("# General") chat so the panel and header follow the new folder
    // (resets scopedFileNid + the file-thread header before re-scoping below).
    // On the Chat tab the rail shows the *current* folder's threads. Drop the
    // previous folder's cached file rows up front and flush the rail to just
    // General+Download, so the refetch below never flashes wrong-folder rows.
    if (this.activeTab === _a.chat) {
      this._threadRailItems = [];
      this._setThreadRailActive("");
      // The side panel shows a thread from the folder we are leaving → close it.
      this._closeFileThreadPanel();
    }
    if (this._scopedFileNid) this.scopeChatToFile(null);
    this.scopeChatToFolder(this.mget(_a.nid));
    // The rail lists the *current* folder's threads — refetch on navigation,
    // but only while the Chat tab is showing it (else it repopulates on entry).
    if (this.activeTab === _a.chat) this._populateThreadRail();
    this.scopeTasksToFolder();
    this.refreshBreadcrumbsUI();
  }

  showFolderTab(tab) {
    if (this.activeTab === tab) return;
    const prevTab = this.activeTab;
    this.activeTab = tab;
    this.$el.find(".window-folder__tab-bar-item").attr("data-state", 0);
    this.$el
      .find(`.window-folder__tab-bar-item[data-tab='${tab}']`)
      .attr("data-state", 1);
    // Full Chat-tab layout: entering sets up [rail | #General | side panel] and
    // forces the middle chat to General; leaving restores the Files-tab header
    // and closes the side panel.
    if (tab === _a.chat) this._enterChatTabLayout();
    else if (prevTab === _a.chat) this._exitChatTabLayout();
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
        case _a.chat:
          // Rail + side-panel layout is set up by _enterChatTabLayout (called
          // from showFolderTab); the chat panel itself is already mounted.
          return;
        case "files":
          return;
        case "meeting":
          this._meetingViewActive = 1;
          this._taskPanelMounted = 0;
          view.feed(require("./skeleton/meeting-panel")(this));
          // Then fetch the hub's meetings for the visible range and re-feed the
          // grid with schedule cards.
          this._refreshSchedule();
          return;
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
              // Deep-link from a task mention/assignment notification: the tasks
              // panel opens this task's detail once its list has loaded.
              open_task_id: this.mget("open_task_id"),
              // sys_pn + partHandler let the window grab a reference (for the
              // tab-bar filter button) and re-scope the panel on navigation.
              sys_pn: "folder-task-panel",
              partHandler: this,
              uiHandler: [this],
            });
          }
          // Already mounted: folder navigation happens on the Files tab, so
          // re-apply the current folder's scope when the Task tab is reopened
          // (otherwise the panel keeps the scope from wherever it was mounted).
          this.scopeTasksToFolder();
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
      this._showNoticeToast(LOCALE.ROLE_UPDATED_SUCCESSFULLY || "Role updated.");
    } catch (e) {
      Wm.alert(e?.reason || e?.error || LOCALE.TRY_AGAIN);
    } finally {
      this._folderConfirmInFlight = false;
    }
  }

  // Realtime role change for THIS viewer. When an admin changes our privilege,
  // the server (hub.set_privilege) pushes { privilege, hub_id, area } to our
  // sockets. The base handleWsEvent routes set_privilege to updateContent,
  // which matches children by nid and no-ops on this nid-less payload — so
  // intercept it here to refresh our own chrome. mget(_a.privilege) drives
  // canUpload/canShare/canManageAccess, so updating it fixes context-menu,
  // drag-drop, etc. live; the topbar re-feed is needed because its buttons are
  // conditionally created (absent when unpermitted) and can't be CSS-toggled.
  handleWsEvent(args = {}) {
    const { data, options } = args || {};
    if (options && options.service === SERVICE.hub.set_privilege) {
      this._applyLivePrivilege(data || {});
    }
    return super.handleWsEvent(args);
  }

  _applyLivePrivilege(data = {}) {
    const { privilege, hub_id } = data;
    if (privilege == null) return;
    // A user may have several workspace windows open — only react to our own.
    if (hub_id && hub_id !== this.mget(_a.hub_id)) return;
    // No-op when unchanged: avoids a needless topbar flicker.
    if (Number(this.mget(_a.privilege)) === Number(privilege)) return;
    this.mset(_a.privilege, Number(privilege));
    // Re-feed the header (not the topbar container) so the header element and
    // its drag/raise wiring survive; only the topbar child rebuilds with the
    // new privilege. The re-feed recreates the breadcrumb part, so repopulate.
    this.feedPart("folder-header", require("./skeleton/topbar")(this));
    this.refreshBreadcrumbsUI();
    this._syncChatGate();
  }

  // Chat is granted at the "View & chat" tier and above — i.e. any privilege
  // carrying the download bit. Only the bare view-only "View" role lacks it.
  // Mirrors roleFromPrivilege's chat detection in settings-action-panel.
  _privilegeGrantsChat(priv) {
    return !!(Number(priv) & _K.permission.download);
  }

  // Gate window__chat-panel to the viewer's chat capability. The Chat tab stays
  // visible; a view-only member meets the "need permission" card and a blurred,
  // disabled composer instead of the conversation. One data-chat_gated flag on
  // the panel drives both (CSS): the card overlay and the composer blur. Cheap
  // attribute flip — the chat widget stays intact. Called at mount and on the
  // live role change (hub.set_privilege) via _applyLivePrivilege.
  _syncChatGate() {
    if (!this.$el) return;
    const gated = this._privilegeGrantsChat(this.mget(_a.privilege)) ? 0 : 1;
    // Attribute is data-chat_gated (underscore): the skeleton sets it via
    // dataset:{chat_gated}, which the framework renders literally as data-${k}.
    this.$el.find(".window__chat-panel").attr("data-chat_gated", gated);
  }

  // Show / clear the inline validation message in the invite-error slot below
  // the email input. Mirrors b2b-signup's showErrorMessage: toggle the
  // wrapper's data-state and set the Note content.
  _setInviteError(reason) {
    const wrapper = this.getPart && this.getPart("invite-error");
    const note = this.getPart && this.getPart("invite-error-message");
    const entry = this.getPart && this.getPart("invite-email");
    if (wrapper?.el) wrapper.el.dataset.state = reason ? _a.open : _a.closed;
    if (note?.set) note.set({ content: reason || "" });
    if (reason) {
      if (entry?.showError) entry.showError();
    } else if (entry?.hideError) {
      entry.hideError();
    }
  }

  sendFolderInvitation(cmd) {
    const email = this.getInviteEmail(cmd);
    if (!email)
      return this._setInviteError(
        LOCALE.EMAIL_REQUIRED || LOCALE.ENTER_VALID_EMAIL,
      );

    // Reject malformed addresses before hitting the server. Send is a separate
    // Note button that reads the entry value directly, so the invite Entry
    // never runs its own checkSanity — validate here. String.prototype.isEmail
    // (ui-core addons/string.js) is the shared validator used across the app,
    // same as the signup form gate.
    if (!email.isEmail())
      return this._setInviteError(
        LOCALE.ENTER_VALID_EMAIL || LOCALE.INVALID_EMAIL,
      );

    // Reject addresses that already appear in the permissions matrix — the
    // server would fail the invite anyway, but flagging it inline saves the
    // round-trip and points the user at the email field.
    if (this._emailIsFolderMember(email))
      return this._setInviteError(
        LOCALE.MEMBER_ALREADY_HAS_ACCESS ||
          "This email already has access to this folder.",
      );

    // Valid address — drop any stale inline error before sending.
    this._setInviteError();

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
        this._showInviteSentToast();
      })
      .catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN))
      .finally(() => {
        if (btn) btn.removeAttribute("data-pending");
      });
  }

  // Branded confirmation toast shown after a member-management action succeeds
  // (invite sent, role updated, member removed, …). It reuses the floating
  // window_info component styled like window-confirm (the "notice" variant —
  // drumee logo + a compact card, see window-info skin [data-variant="notice"])
  // with a single Close button that dismisses the toast. Every success
  // confirmation goes through here so they share one consistent style.
  _showNoticeToast(message) {
    Wm.info({
      message,
      variant: "notice",
      actions: [
        {
          label: LOCALE.CLOSE,
          priority: "primary",
          // No uiHandler → handled by the toast window itself (closes it).
          service: _e.close,
        },
      ],
    });
  }

  // Confirmation toast shown after an invitation is sent.
  _showInviteSentToast() {
    this._showNoticeToast(LOCALE.INVITATION_SENT_SUCCESSFULLY);
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
      this._showNoticeToast(LOCALE.MEMBER_REMOVED_SUCCESSFULLY || "Member removed.");
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

  // True when `email` already belongs to a member in the permissions matrix
  // (this._folderMembers is the same source the matrix renders from). Compared
  // case-insensitively and trimmed so "Foo@Bar.com " matches a stored
  // "foo@bar.com" — the invite Entry doesn't normalize before send.
  _emailIsFolderMember(email) {
    const target = String(email || "")
      .trim()
      .toLowerCase();
    if (!target) return false;
    return (this._folderMembers || []).some(
      (r) => String(r.email || "").trim().toLowerCase() === target,
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
    // Converge the workspace "Manage access" onto secure-share v2 — the SAME panel
    // files/subfolders use (window_secure_share) — so the workspace link gets
    // editable permissions + logged-in-recipient recognition. The old external-room
    // panel (permission_shared) supported neither (permission was hard-clamped to
    // view; recipients were always guest-bound). Share the workspace ROOT node: for
    // a hub/workspace-root window the real node id is actual_home_id (nid is the
    // hub/0) — mirrors this window's own curNid logic; a share-area subfolder shares
    // its own node. Rendered embedded in the same dialog drawer, matching the media
    // 'secure-share' launch.
    let shareNid = this.mget(_a.nid);
    if (this.mget(_a.filetype) === _a.hub && this.mget(_a.actual_home_id)) {
      shareNid = this.mget(_a.actual_home_id);
    }
    this.dialogWrapper.feed({
      kind     : "window_secure_share",
      embedded : 1,
      dataset  : { embedded: "yes" },
      nid      : shareNid,
      hub_id   : this.mget(_a.hub_id),
      filetype : _a.folder,
      // Title this panel "Manage access" (workspace-root entry), not the default
      // "Folder Secure Share" used for file/subfolder shares. Scoped: only this
      // launch sets the flag, so subfolder/file share panels keep their title.
      manage_access: 1,
      uiHandler: [this],
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
