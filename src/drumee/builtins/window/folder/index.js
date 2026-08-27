const mfsInteract = require("../interact");
const {
  VIEW_STATES,
  isGrouped,
  setGrouped,
  clearGrouped,
  groupViewState,
  nextGroupViewState,
} = require("../skeleton/toolkit/file-group");

const { overMeetingCap } = require("libs/billing");

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

// Compact breakpoint for the Meeting-tab schedule (see
// _wireScheduleBreakpoint). Must stay in step with the skin's
// `@container window-folder-w (max-width: 700px)` blocks — the folder skin's
// own compact threshold, and the one meeting-schedule.scss already uses.
const SCHED_NARROW_PX = 700;

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

    let restore = null;
    if (this._zoomed && this._preZoomBounds) {
      restore = this._preZoomBounds;
      this._zoomed = false;
      this._preZoomBounds = null;
    } else {
      this._preZoomBounds = preFsSafe || this._snapshotBounds();
      this._zoomed = true;
    }
    // CSS hook: zoomed window shows the 6-per-row grid (folder skin).
    this.el.dataset.zoomed = this._zoomed ? 1 : 0;
    // Un-zooming restores arbitrary pre-zoom bounds, which match no preset.
    this._snapMode = this._zoomed ? "full" : null;
    this._syncSnapPresets();
    // Must run BEFORE measuring: hiding the desk header grows the
    // wm-container, and _workspaceRect() has to see the post-toggle height.
    this._syncDeskChrome();
    // Defer the resize until after fullscreen actually exits (see helper).
    this._applyBoundsAfterFs(restore || this._zoomTarget());
  }

  _zoomTarget() {
    const ws = this._workspaceRect();
    return { left: 0, top: 0, width: ws.width, height: ws.height };
  }

  /**
   * A zoomed window owns the whole desk body, header included — the same deal
   * a headless workspace pane gets from the sidebar. Desk listens on Wm.$el and
   * re-runs _syncWorkspaceTopbar, which reads `_zoomed` back off every open
   * folder window. Headless panes already hide the header via workspace:open.
   */
  _syncDeskChrome() {
    if (this.mget(_a.headless)) return;
    if (!window.Wm || !Wm.$el) return;
    this._zoomSyncing = true;
    Wm.$el.trigger("folder:zoom", this);
    this._zoomSyncing = false;
  }

  /**
   * The header can come back while this window is still zoomed — a second
   * window flips the bar into strip-only mode — which shrinks the container
   * under inline-pixel geometry. Skipped during _syncDeskChrome: toggleZoom
   * applies the new bounds itself right after.
   */
  _onDeskChrome() {
    if (this._zoomSyncing) return;
    if (!this._zoomed || this.mget(_a.minimize)) return;
    if (this.isDestroyed && this.isDestroyed()) return;
    const target = this._zoomTarget();
    const cur = this._snapshotBounds();
    if (
      cur.left === target.left &&
      cur.top === target.top &&
      cur.width === target.width &&
      cur.height === target.height
    ) {
      return;
    }
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
    // A full-frame window re-fits the CURRENT work area rather than the box it
    // was minimized at: the desk header / tab strip can appear or disappear
    // while a window sits minimized (it is skipped by _hasZoomedFolder, so the
    // `desk:chrome` re-fit never reaches it), which leaves the snapshot taller
    // than the area it comes back into.
    const b = this._zoomed ? this._zoomTarget() : this._minimizedBounds;
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

  // One inline button drives both directions of fullscreen, so its glyph has
  // to follow the real state — ESC and the browser's own exit both arrive as
  // fullscreenchange, not as a click.
  _syncFullscreenBtn() {
    const btn = this.__ctrlFullscreen;
    if (!btn || !btn.el) return;
    if (btn.isDestroyed && btn.isDestroyed()) return;
    const isFs = document.fullscreenElement === this.el;
    if (_.isFunction(btn.setState)) btn.setState(isFs ? 1 : 0);
    if (_.isFunction(btn.setIcon)) {
      btn.setIcon(isFs ? "desktop_reduce" : "player-fullscreen");
    }
  }

  /**
   * Mark the Move & Resize preset the window is currently in.
   *
   * The active preset is inert (skin: `pointer-events: none`) — re-picking
   * "full" would run `toggleZoom` and RESTORE the window rather than leave it
   * maximised — so the stamp must track the real layout instead of being
   * frozen at whatever the topbar was built with. Cleared to `null` by any
   * move that lands the window on arbitrary bounds (un-zoom, manual drag is
   * not tracked), which simply leaves every preset clickable.
   */
  _syncSnapPresets() {
    const host = this.__zoomPresets;
    if (!host || !host.el) return;
    for (const el of host.el.querySelectorAll("[data-preset]")) {
      el.dataset.active = el.dataset.preset === this._snapMode ? 1 : 0;
    }
  }

  toggleFullscreen() {
    if (document.fullscreenElement === this.el) {
      document.exitFullscreen();
      return;
    }
    this._preFsBounds = this._snapshotBounds();
    // One-shot listener handles both a second click on the button and ESC.
    const onChange = () => {
      this._syncFullscreenBtn();
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
    // Release the header before measuring — same ordering rule as toggleZoom.
    this._zoomed = false;
    this._preZoomBounds = null;
    this.el.dataset.zoomed = 0;
    this._snapMode = side === "right" ? "right" : "left";
    this._syncSnapPresets();
    this._syncDeskChrome();
    const ws = this._workspaceRect();
    const halfW = Math.floor(ws.width / 2);
    // Left gets the floored half, right gets the remainder, so an odd width
    // splits with no overlap and no gap (left ends exactly where right starts).
    const leftW = halfW;
    const rightW = ws.width - halfW;
    const bounds = side === "right"
      ? { left: halfW, top: 0, width: rightW, height: ws.height }
      : { left: 0, top: 0, width: leftW, height: ws.height };
    // A half-tile is narrower than the normal window minimum (760) on any
    // workspace < 1520px wide; without this override _applyBounds would clamp
    // both tiles up to 760 and they would overlap. Pass the tile's own width
    // as the minimum so it can shrink to exactly half the screen.
    this._applyBoundsAfterFs(bounds, {
      minWidth: side === "right" ? rightW : leftW,
    });
  }

  reframeToDefault() {
    this._zoomed = false;
    this._preZoomBounds = null;
    this.el.dataset.zoomed = 0;
    this._snapMode = "center";
    this._syncSnapPresets();
    this._syncDeskChrome();
    const b = this._defaultBounds();
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
    // Warm the tile widget's chunk while the listing is still in flight. "media"
    // is a lazily imported kind, so without this the first response builds ~30
    // placeholder roots, and the real tiles only appear a second hop later when
    // the chunk resolves — measured as a visible 1668ms → 1747ms gap on a cold
    // workspace, and worse on a cold cache. Fire-and-forget: if it fails the
    // placeholders still resolve exactly as before.
    if (Kind && _.isFunction(Kind.waitFor)) {
      Kind.waitFor("media").catch(() => { });
      // Warm the one tour this window can still trigger — Manage access and
      // the kebab Share item. The tracker moved back into `folder_task`, which
      // the desk raises and warms. Safe to repeat per window: waitFor returns
      // the registered class on its first line once the chunk has landed
      // (ui-core letc/kind/index.js:244), and before that webpack has already
      // memoized the import() promise, so several open folders cost one fetch
      // and then a map lookup each.
      Kind.waitFor("tutorial_share").catch(() => { });
    }
    setGrouped(this, true);
    this.setViewMode(_a.icon, false);
    // `data-visible` is derived from privilege. Keep it in sync even when a
    // caller updates the model outside the explicit navigation/live-role paths.
    this.listenTo(
      this.model,
      `change:${_a.privilege}`,
      this.syncNewCtrlVisibility,
    );
    // Bind uploadFile for the meeting description's inline image paste/drop
    // (mfsInteract doesn't provide it — same pattern as the tasks widget).
    if (!this.uploadFile) {
      const { uploadFile } = require("@drumee/ui-essentials");
      this.uploadFile = uploadFile.bind(this);
    }
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
    clearGrouped(this);
    if (this._folderGridSortTimer) {
      clearTimeout(this._folderGridSortTimer);
      this._folderGridSortTimer = null;
    }
    if (this._chatSearchTimer) {
      clearTimeout(this._chatSearchTimer);
      this._chatSearchTimer = null;
    }
    if (this._mmInviteeBlurTimer) {
      clearTimeout(this._mmInviteeBlurTimer);
      this._mmInviteeBlurTimer = null;
    }
    this._stopAwaitMeetingReady();
    this._ftTeardown();
    this._unbindThreadMenuOutside();
    this._unbindViewportReframe();
    this._unbindDeskChrome();
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
    // A hand-arranged folder must not be re-sorted by filename behind the
    // user's back. sortContent() installs a filename comparator on the
    // collection, and Backbone then keeps re-applying it on every add — so
    // a dropped tile snapped back and the saved ranks were overwritten by
    // the next sync. This is why arranging worked in row view (which never
    // schedules this sort) but not in grid.
    if (this._hasArrangedSort && this._hasArrangedSort()) return;
    if (!list || (list.isDestroyed && list.isDestroyed())) return;
    if (this._folderGridSortTimer) clearTimeout(this._folderGridSortTimer);
    this._folderGridSortTimer = setTimeout(() => {
      this._folderGridSortTimer = null;
      this._sortFolderGridByFilename(list);
    }, 0);
  }

  onMediaRenamed() {
    // A rename can change the file's group (.txt → .md), so Group view must
    // re-bucket even when the scheduled sort bails out. It does bail for a
    // hand-arranged folder (_hasArrangedSort), which would otherwise leave the
    // renamed tile in its old group until the next mode switch. Partitioning
    // alone re-reads the models and never installs a comparator, so the saved
    // ranks stay intact.
    if (isGrouped(this) && this._partitionFoldersAndFiles && this.iconsList) {
      this._partitionFoldersAndFiles(this.iconsList);
    }
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
    // Bound BEFORE the first bounds pass: applyDefaultBounds opens the window
    // full-frame, which hides the desk header and therefore grows the
    // wm-container. The re-fit for that growth arrives as `desk:chrome`, so the
    // listener has to already be attached when the bounds are applied.
    this._bindDeskChrome();
    this.applyDefaultBounds();
    this._bindViewportReframe();
    if (!this._raised) this.raise();
    if (this.media && this.media.wait) this.media.wait(0);
    // Honor the launch-time `activeTab` option (e.g. opened from the,
    // sidebar live-meeting badge with activeTab: "meeting"). A meeting request
    // now opens a standalone call window rather than an embedded folder tab.
    // Track live meetings in this room so the schedule Start button can show
    // "Join Meeting" to members while a host is in the call (chat meeting.start/
    // meeting.end sentinels — realtime + an initial history scan).
    this._initMeetingPresence();
    const initialTab = this.mget("activeTab");
    if (initialTab === "meeting" || this.mget(_a.start_meeting)) {
      this._launchMeetingStandalone();
    } else if (initialTab && initialTab !== "files") {
      this.ensurePart("folder-view").then(() => this.showFolderTab(initialTab));
    }
    // Launched by "Link to task tracker" from outside a folder window. Consumed
    // once, so a later remount doesn't reopen the draft out of the blue.
    const taskFiles = this.mget("link_task_files");
    if (taskFiles && taskFiles.length) {
      this.mset("link_task_files", null);
      this.ensurePart("folder-view").then(() => this.linkFilesToTask(taskFiles));
    }
    // Gate the chat panel to the viewer's current role on open (a view-only
    // member sees the "need permission" info card instead of the conversation);
    // live role changes re-run this via _applyLivePrivilege. Deferred until the
    // body is rendered so the chat-panel part exists.
    this.ensurePart("folder-view").then(() => this._syncChatGate());
    // A folder opened WITHOUT a privilege value gates the chat for everyone —
    // even a full-permission member — because _privilegeGrantsChat reads
    // mget(privilege). This happens when the window is opened from a context
    // whose payload carries no privilege (e.g. a meeting notification, whose
    // mfs_node_attr payload has no privilege field). Self-heal: fetch this
    // node's attributes for the CURRENT viewer (mfs_access_node → their real
    // privilege) and re-sync the gate. Guarded to run ONLY when privilege is
    // missing, so normally-opened folders (which already carry privilege) are
    // untouched — no extra request, no behaviour change, and it can never grant
    // more than the viewer actually has (view-only members stay correctly gated).
    if (this.mget(_a.privilege) == null) this._healChatPrivilege();
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

  // A folder window opens FULL-FRAME — the whole desk body, the same frame a
  // workspace pane gets from the sidebar — instead of the inset popup box it
  // used to land in (reported 2026-08-21: opening a folder should land
  // full-frame, not in the small window).
  //
  // Implemented as the window's existing "full" snap preset rather than as new
  // geometry, so nothing else shifts meaning: `_defaultBounds()` remains the
  // reframe target, which keeps a second click on Zoom (and the Reframe preset)
  // returning the window to its cascaded default size, keeps the Tile presets
  // as they are, and reuses the desk-header handshake that a manual zoom
  // already goes through. Headless workspace panes are already full-area and
  // are left untouched; mobile is excluded by the guard above (those windows
  // are full-screen via CSS).
  applyDefaultBounds() {
    if (this._defaultBoundsApplied || Visitor.isMobile()) return;
    this._defaultBoundsApplied = 1;
    const bounds = this._defaultBounds();
    let target = bounds;
    if (!this.mget(_a.headless)) {
      this._zoomed = true;
      // Un-zoom restores the inset default this window would have opened at.
      this._preZoomBounds = {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      };
      this.el.dataset.zoomed = 1;
      this._snapMode = "full";
      this._syncSnapPresets();
      // Must run BEFORE measuring, exactly as in toggleZoom: hiding the desk
      // header grows the wm-container and _zoomTarget() has to see the
      // post-hide height. (The desk only learns about this window on the
      // deferred `folder:open` from initialize, so on that ordering the header
      // hides a tick later and _onDeskChrome re-fits us then.)
      this._syncDeskChrome();
      // Keep the min-width/min-height floors from `bounds`; take the geometry
      // from the zoom target.
      target = { ...bounds, ...this._zoomTarget() };
    }
    this.size = { ...this.size, ...target };
    this.style.set(target);
    this.$el.css(target);
    try {
      this.$el.resizable(_a.option, "disabled", false);
      this.$el.resizable(_a.option, "minWidth", bounds.minWidth);
      this.$el.resizable(_a.option, "minHeight", bounds.minHeight);
      this.$el.resizable(_a.option, "handles", this.handles || "all");
    } catch (e) {}
    this.syncBounds();
  }

  // A non-headless folder window is sized by inline pixel geometry captured
  // ONCE at open (applyDefaultBounds). On browser resize the WM only ever
  // clamps windows DOWN to fit the shrunken work area and never grows them back
  // — so after the browser shrinks then re-enlarges, the window stays stuck at
  // the small size and its @container layout stays in the compact branch until
  // it is reopened. Re-apply the default bounds for the CURRENT viewport when
  // the browser stops resizing, so the window returns to its normal open size
  // on its own — exactly as if freshly opened. Debounced so intermediate sizes
  // mid-drag don't thrash the geometry.
  //
  // (Headless panes fill their layer via CSS `width/height:100% !important`, so
  // they track the viewport already and are excluded here. Dragging a window's
  // OWN resize handle does not fire the browser `resize` event, so a manual
  // window resize is preserved — only a viewport change reframes.)
  _bindViewportReframe() {
    if (this._viewportReframeBound || Visitor.isMobile()) return;
    if (this.mget(_a.headless)) return;
    this._viewportReframeBound = true;
    this._onViewportReframe = () => {
      clearTimeout(this._viewportReframeTimer);
      this._viewportReframeTimer = setTimeout(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        if (this._isResizing) return; // user is dragging a resize handle
        if (this.mget(_a.minimize)) return; // leave minimized windows alone
        // A full-frame window stays full-frame: re-fit it to the new work area
        // instead of dropping it back to the inset default (which is what
        // reframeToDefault does, and what it used to do to a zoomed window on
        // every browser resize).
        if (this._zoomed) return this._applyBoundsAfterFs(this._zoomTarget());
        this.reframeToDefault();
      }, 200);
    };
    window.addEventListener("resize", this._onViewportReframe);
  }

  _unbindViewportReframe() {
    if (!this._viewportReframeBound) return;
    this._viewportReframeBound = false;
    clearTimeout(this._viewportReframeTimer);
    window.removeEventListener("resize", this._onViewportReframe);
  }

  // Only inline-geometry windows care — headless panes fill their layer via
  // CSS and track the container already.
  _bindDeskChrome() {
    if (this._deskChromeBound) return;
    if (this.mget(_a.headless)) return;
    if (!window.Wm || !Wm.$el) return;
    this._onDeskChrome = this._onDeskChrome.bind(this);
    Wm.$el.on("desk:chrome", this._onDeskChrome);
    this._deskChromeBound = true;
  }

  _unbindDeskChrome() {
    if (!this._deskChromeBound) return;
    this._deskChromeBound = false;
    if (window.Wm && Wm.$el) Wm.$el.off("desk:chrome", this._onDeskChrome);
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
    // Under the modified-newest-first default a freshly inserted node
    // (upload, paste, move-in) belongs at the TOP of its section, not the
    // bottom — append-at-end matched the old rank-asc order. The partition
    // observer files the tile into the right section either way and keeps
    // the relative position it was inserted at.
    if (
      position === 0 &&
      this._currentApi &&
      this._currentApi.name === _a.mtime &&
      this._currentApi.order === _K.order.descending
    ) {
      position = -1;
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
    // Neither of these returns: window/core's onPartReady tail wires
    // `child.onChildBubble` on every part it sees, and the control these two
    // replace (the old zoom trigger) went through it. Fall through so the
    // topbar keeps behaving the same on bubble.
    if (pn === "ctrl-fullscreen") {
      this.__ctrlFullscreen = child;
      // The topbar can be rebuilt while the window is already fullscreen.
      this._syncFullscreenBtn();
    }
    if (pn === "zoom-presets") {
      this.__zoomPresets = child;
      this._syncSnapPresets();
    }
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
    if (pn === "tab-bar-tabs") {
      this._wireTabCarousel(child);
      return;
    }
    if (pn === "tab-bar-dots") {
      this._tabBarDots = child;
      // The strip may have mounted first, in which case its listener already
      // ran against no dots. Stamp the current page now so the footer is right
      // on first paint rather than only after the first scroll.
      this._syncTabCarouselPage();
      return;
    }
    if (pn === "new-ctrl") {
      // The button renders hidden (the skeleton is built before the window has
      // a privilege). Now that it is mounted, resolve the real answer once.
      this.syncNewCtrlVisibility();
      return;
    }
    // Second entry point for the migrate tour, alongside the desk topbar's
    // + New (desk/index.js, case "addmenu"). Both are the same gesture — "I
    // want to bring something in" — so they share the `migrate` flag: whichever
    // is pressed first runs the tour, and the other then finds it seen. This is
    // the shape the share tour already uses across its own two entry points.
    //
    // `open` is the signal rather than a click on the wrapper: it fires only on
    // opening, never on closing, so re-opening the menu cannot re-trigger, and
    // a click that lands on the control's padding is not mistaken for the
    // gesture. Nothing is remembered here — every gate lives in
    // libs/tutorial-tours — so a topbar rebuild can neither lose nor duplicate
    // the trigger.
    if (pn === "new-menu") {
      const Tours = require("libs/tutorial-tours");
      if (_.isFunction(child.on)) {
        child.on(_e.open, () => Tours.fire("migrate", this));
      }
      // Warm the chunk while the surface that triggers it is on screen, so
      // pressing the button renders from memory rather than from the network.
      if (typeof Kind !== "undefined" && _.isFunction(Kind.waitFor)) {
        Promise.resolve(Kind.waitFor("tutorial_migrate")).catch(() => {});
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
    // Arm the responsive view switch whenever the schedule mounts. Separate
    // from (and ahead of) the start_meeting branch below, which is gated on a
    // launch flag and must keep its existing fall-through.
    if (pn === "meeting-panel") this._wireScheduleBreakpoint();
    if (pn == "meeting-panel" && this.mget(_a.start_meeting)) {
      this._launchMeetingInPanel();
      return;
    }
    if (pn === "sched-grid") {
      this._scrollScheduleIntoView(child);
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
      //
      // `child.set()` re-enters this handler: set → mould → render →
      // onBeforeRender → registerPart → triggerMethod(part:ready) → here. That
      // recursed ~945 times on every folder open, until the stack overflowed
      // and mould()'s own try/catch swallowed the RangeError — invisible, but
      // it burned ~1.2s of main thread and pushed the content listing
      // (media.show_node_by) from ~0.9s to ~2.2s after the click. Write only
      // when the title actually differs, and never re-enter.
      const name = this.mget(_a.filename) || this.model.get("hub_name");
      const shown = child && _.isFunction(child.mget) ? child.mget("content") : null;
      if (name && String(shown) === String(name)) return; // already painted
      if (this._namingWindow) return;
      if (name && _.isFunction(child.set)) {
        this._namingWindow = 1;
        try {
          child.set({ content: name });
        } finally {
          this._namingWindow = 0;
        }
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
    // Wm.loadWorkspace is very likely asking for this same path right now —
    // share its request rather than adding a second one (libs/path-request).
    require("libs/path-request").getPath(this, { nid, hub_id })
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
    // A re-feed driven by a remote event (see _applyLivePrivilege) spawns
    // children that bubble through here, and the base implementation answers by
    // raising this window. The user did not touch anything — an admin did,
    // elsewhere — so raising would bury whatever they have on top of this
    // workspace, e.g. a document they are reading.
    if (this._suppressRaise) return;
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
    // _captureNavState snapshots privilege and mset(state) above restores it,
    // so walking BACK to an ancestor can change our rights just as walking in
    // does (updateTopbar handles the forward case; _navRestoring skips it here).
    this.syncNewCtrlVisibility();
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
    if (window.pointerDragged) return;

    // Each segment reports its own mode, so pressing one selects it directly.
    // The cycle is kept only as the fallback for a press that carries no mode —
    // the toggle box itself is still clickable in the gaps between segments.
    const viewMode = this.getViewMode && this.getViewMode();
    const picked = cmd && cmd.mget && cmd.mget(_a.value);
    const state = VIEW_STATES.includes(picked)
      ? picked
      : nextGroupViewState(this, viewMode);
    // Re-pressing the active segment would rebuild the list for nothing, and a
    // rebuild mid-drag is exactly what the pointerDragged guard above avoids.
    if (state === groupViewState(this, viewMode)) return;
    setGrouped(this, state === "group");
    // Window-local, like the mode chosen in initialize: the folder toggle must
    // not leak "row" into the process-wide ViewMode default, or the next
    // Share/Search/Transferbox to open would inherit list view from it.
    this.setViewMode(state === "list" ? _a.row : _a.icon, false);
    // The active-segment CSS keys off `data-state` on the toggle BOX, and cmd.el
    // is now the pressed segment — so resolve the box rather than stamping the
    // segment. The toolbar is rebuilt below and fileViewToggle recomputes this
    // from the real state anyway; the write only avoids a flash until then.
    const toggleBox = cmd?.el?.closest?.(
      `.${this.fig.family}-topbar__view-toggle`,
    ) || cmd?.el;
    if (toggleBox) toggleBox.dataset.state = state;

    this.ensurePart(_a.content).then((content) => {
      if (!content || (content.isDestroyed && content.isDestroyed())) return;
      if (state === "list") {
        // Keep the file-type filter bar (All/Docs/PDF/Images/Other) in list
        // view too — mirrors the grid branch below and the initial-render
        // folderFilesRowContainer. content/row adds the column header + list.
        content.feed([
          fileTypeFilterBar(this),
          require("../skeleton/content/row")(this),
        ]);
        return;
      }
      content.feed([fileTypeFilterBar(this), gridFilesBrowser(this)]);
    });
  }

  // Close the merged "+ New" menu and reset its create flyout.
  //
  // Leaf rows live INSIDE the menu topic, so they resolve it by walking up.
  // The mobile backdrop (skeleton/toolkit fileNewControl) is a SIBLING of the
  // topic, not a descendant — the walk returns nothing there, so fall back to
  // the part the window already owns. Same close for both entry points.
  // ── Mobile tab-bar carousel ──────────────────────────────────────────
  // The strip pages two tabs at a time on narrow layouts (folder skin's
  // @container block owns the scroll-snap); this only keeps the footer's
  // `data-page` in step with where the strip actually is, and the skin maps
  // that one attribute to the active dot.
  //
  // Reads scrollLeft rather than tracking taps, so a swipe, a dot press and a
  // programmatic scroll all converge on the same source of truth.
  _wireTabCarousel(child) {
    this._tabBarStrip = child;
    if (!child || !child.el) return;
    // rAF-throttled: a touch scroll fires this continuously, and all it has to
    // produce is one attribute write per frame at most.
    let queued = 0;
    const onScroll = () => {
      if (queued) return;
      queued = 1;
      requestAnimationFrame(() => {
        queued = 0;
        this._syncTabCarouselPage();
      });
    };
    child.el.addEventListener("scroll", onScroll, { passive: true });
    this._syncTabCarouselPage();
  }

  _syncTabCarouselPage() {
    const strip = this._tabBarStrip;
    const dots = this._tabBarDots;
    if (!strip || !strip.el || !dots || !dots.el) return;
    const w = strip.el.clientWidth;
    // Desktop / one-page: clientWidth is the whole strip and scrollLeft stays 0,
    // so this lands on page 0 and the skin has the footer hidden anyway.
    const page = w > 0 ? Math.round(strip.el.scrollLeft / w) : 0;
    if (`${page}` !== dots.el.dataset.page) dots.el.dataset.page = `${page}`;
  }

  // Dot press. Scrolls by whole pages; the scroll listener above then updates
  // data-page, so this deliberately does not write it itself.
  _showTabCarouselPage(cmd) {
    const strip = this._tabBarStrip;
    if (!strip || !strip.el || !cmd || !cmd.el) return;
    const page = Number(cmd.el.dataset.page) || 0;
    strip.el.scrollTo({ left: page * strip.el.clientWidth, behavior: "smooth" });
  }

  closeNewMenu(cmd) {
    const menu =
      (cmd && cmd.getParentByKind?.(KIND.menu.topic)) ||
      (this.getPart && this.getPart("new-menu"));
    if (!menu) return;
    const group = menu.el?.querySelector(
      ".window-button__dropdown-menu__item--create-group",
    );
    if (group) group.dataset.submenu = _a.closed;
    if (menu.changeState) menu.changeState(0);
  }

  toggleNewCreateMenu(cmd) {
    if (!cmd || !cmd.el) return;
    cmd.el.dataset.submenu =
      cmd.el.dataset.submenu === _a.open ? _a.closed : _a.open;
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    // File-thread access revocation: while a revoked thread is still on screen
    // (before OK / the 5-second timeout), refuse every action that would act on
    // it. The CSS blur is cosmetic — this is the guard. See file-thread-access.js.
    if (this._ftRevoked && this._ftIsRevokedService(service)) return;
    switch (service) {
      // OK on the revocation notice — same finalizer the timeout uses.
      case "file-thread-revoked-ack":
        return this._finalizeRevokedFileThread();

      case _e.upload:
        this.closeNewMenu(cmd);
        return super.onUiEvent(cmd, args);

      case _a.info:
        return this.showInfo();

      case _e.download:
        return this.runFolderMediaAction(_e.download);

      case _e.settings:
        return this.switchShowFolderSettings(cmd);

      case "add-folder":
        this.closeNewMenu(cmd);
        if (require("libs/over-limit").guardWrite("write")) return;
        return this.openCreateFolderDialog();

      case "add-note":
        this.closeNewMenu(cmd);
        if (require("libs/over-limit").guardWrite("write")) return;
        return Wm.windowsLayer.append({
          kind: "editor_markdown",
          uiHandler: [this],
        });

      case "tab-bar-page":
        return this._showTabCarouselPage(cmd);

      case "toggle-new-create-menu":
        return this.toggleNewCreateMenu(cmd);

      // Tap on the mobile dim layer behind the centred "+ New" card. Same
      // close a leaf row runs, so the card and its backdrop leave together.
      case "close-new-menu":
        return this.closeNewMenu(cmd);

      case "launch-gdrive-migration": {
        // "Migrate from Google Drive" row of the merged "+ New" menu. Opens the
        // full migration popup; the widget + google_drive.* backend already
        // exist. singleton + wm_unique_id (per the multi-folder-windows fix)
        // prevents a duplicate popup on re-click.
        //
        // Destination = the directory the user is LOOKING AT, mirroring the
        // breadcrumb's current-node rule (refreshBreadcrumbsUI): the model nid
        // follows in-window navigation, and a hub/workspace ROOT window's
        // active directory is its actual_home_id. The previous order —
        // actual_home_id first — sent every import to the workspace root even
        // when the user had navigated into a sub-folder and clicked "+ New"
        // right there. `direct: 1` tells the importer to land the content in
        // this folder itself, not in a GoogleDriveMigration wrapper: the user
        // picked the destination by standing in it.
        this.closeNewMenu(cmd);
        let destNid = this.mget(_a.nid);
        if (this.mget(_a.filetype) === _a.hub && this.mget(_a.actual_home_id)) {
          destNid = this.mget(_a.actual_home_id);
        }
        // The window title tracks navigation the same way the nid does
        // (refreshBreadcrumbsUI msets hub_name to the current node's name).
        const destName = this.mget(_a.hub_name) || this.mget(_a.filename) || "";
        const destHub = this.mget(_a.hub_id) || Visitor.id;
        const destNidFinal = destNid || Visitor.get(_a.home_id);
        return Kind.waitFor("migrate_gdrive_popup").then(() => {
          Wm.launch(
            {
              kind: "migrate_gdrive_popup",
              hub_id: destHub,
              nid: destNidFinal,
              destinationName: destName || undefined,
              direct: 1,
              // Destination-scoped id (same scheme as window_folder-<hub>-<nid>).
              // A plain shared id made singleton raise() a popup opened from
              // ANOTHER destination (e.g. Settings after a folder, or folder B
              // after folder A) with its stale destination — the user would
              // import into the wrong place. Per-destination ids keep the
              // no-duplicate guarantee per folder while giving each launch
              // context its own popup.
              wm_unique_id: `migrate_gdrive_popup-${destHub}-${destNidFinal}`,
            },
            { explicit: 1, singleton: 1 },
          );
        });
      }

      case "new-document":
        this.closeNewMenu(cmd);
        // Inherited newDocument() also guards; keep the early return here so
        // the folder's own create menu closes cleanly without a spinner.
        if (require("libs/over-limit").guardWrite("write")) return;
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
        // Belt for the two hidden entry points (topbar icon + overflow menu):
        // the panel mints secure-share links that can grant can_edit, and
        // secure_share.create now refuses without the write bit. Refuse here so
        // a stale DOM or a deep link cannot open a panel that can only fail.
        if (this.canUpload && !this.canUpload()) {
          if (window.Butler && Butler.say) Butler.say(LOCALE.WEAK_PRIVILEGE);
          return;
        }
        // Contextual tour, raised BEFORE openManageAccess because that call
        // TOGGLES: with a drawer already open it clears it and returns, so the
        // flag read after the call means the opposite of what it means here.
        // `!isShowSettings` is precisely "this click is going to OPEN the
        // panel" — a closing click, and a click that dismisses the folder
        // settings drawer (which shares the flag), are both correctly not
        // treated as reaching Manage access for the first time.
        //
        // Placed in the handler rather than at either call site on purpose:
        // the topbar icon and the overflow menu both raise this service with
        // uiHandler: [ui] (folder/skeleton/topbar.js:96, window/skeleton/
        // toolkit/index.js:1666), so one line covers both without going near
        // their duplicated visibility gate.
        if (!this.isShowSettings) {
          require("libs/tutorial-tours").fire("share", this);
        }
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

      case "folder-pick-invite-contact":
        return this.pickFolderInviteContact(cmd);

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
        // No tour here. The tracker is step two of `folder_task`, which the
        // desk raises when a workspace or folder is opened — the Tasks tab is
        // not where a first-time user goes looking for it.
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
        const unit =
          st.view === "monthly" ? "month" : st.view === "daily" ? "day" : "week";
        if (service === "sched-today") st.anchor = Dayjs();
        else st.anchor = st.anchor.add(service === "sched-next" ? 1 : -1, unit);
        return this._refreshSchedule();
      }

      case "sched-toggle-view": {
        const st = require("./skeleton/meeting-schedule").schedState(this);
        // Explicit pick: from here on this view is the user's, so widening the
        // panel must not revert it (see _applyScheduleBreakpoint).
        st.autoDaily = false;
        // NOTE: from "daily" this lands on "monthly", not "weekly" — the knob
        // has only two positions and daily is a drill-down of weekly. Existing
        // behaviour, left as-is; it is simply reachable more often now that a
        // narrow panel starts in daily.
        st.view = st.view === "monthly" ? "weekly" : "monthly";
        return this._refreshSchedule();
      }

      case "sched-set-view": {
        const st = require("./skeleton/meeting-schedule").schedState(this);
        const v =
          (cmd.mget && (cmd.mget("schedView") || cmd.mget("view"))) ||
          (cmd.el && cmd.el.dataset.view);
        // Cleared even when the view does not change: tapping "Weekly" while
        // already weekly is still the user claiming the choice, and it should
        // survive the next resize.
        if (v) st.autoDaily = false;
        if (v && v !== st.view) {
          st.view = v;
          return this._refreshSchedule();
        }
        return;
      }

      // ── Mini-calendar dropdown on the range label's caret ──────────────
      case "sched-toggle-picker": {
        const st = require("./skeleton/meeting-schedule").schedState(this);
        st.pickerOpen = !st.pickerOpen;
        // Re-open on the month currently in view, not where it was left.
        if (st.pickerOpen) st.pickerCursor = st.anchor;
        return this._refreshSchedule();
      }

      case "sched-picker-prev":
      case "sched-picker-next": {
        const st = require("./skeleton/meeting-schedule").schedState(this);
        st.pickerCursor = (st.pickerCursor || st.anchor).add(
          service === "sched-picker-next" ? 1 : -1,
          "month",
        );
        return this._refreshSchedule();
      }

      case "sched-pick-day": {
        // Picking a day drills into the single-day hourly view of that day
        // (Google-Calendar style); the Weekly/Monthly toggle exits it.
        const st = require("./skeleton/meeting-schedule").schedState(this);
        const d =
          (cmd.mget && cmd.mget("schedDay")) || (cmd.el && cmd.el.dataset.day);
        if (d) {
          st.anchor = Dayjs(d);
          st.view = "daily";
          // Drilling into a day is an explicit choice too — widening the panel
          // afterwards should leave the user on that day, not snap to weekly.
          st.autoDaily = false;
          st.pickerOpen = false;
          return this._refreshSchedule();
        }
        return;
      }

      // ── Meeting scheduling modal (skeleton/meeting-modal.js) ───────────
      case "open-schedule":
        // Calendar "Schedule" CTA → create a new meeting.
        return this.openMeetingModal();

      case "sched-new-at": {
        // Click an empty weekly half-slot → create a meeting prefilled at that
        // day + half-hour.
        const day = (cmd.mget && cmd.mget("day")) || (cmd.el && cmd.el.dataset.day);
        const hour = Number((cmd.mget && cmd.mget("hour")) ?? (cmd.el && cmd.el.dataset.hour));
        const min = Number((cmd.mget && cmd.mget("min")) ?? (cmd.el && cmd.el.dataset.min)) || 0;
        return this.openMeetingModal({ at: { day, hour: isNaN(hour) ? 9 : hour, min } });
      }

      case "open-meeting": {
        // A schedule card on the calendar → edit that meeting.
        const nid = (cmd.mget && cmd.mget(_a.nid)) || (cmd.el && cmd.el.dataset.nid);
        const meeting = (this._meetings || []).find((m) => m.id === nid);
        return this.openMeetingModal({ meeting });
      }

      case "join-meeting":
        // Join the workspace meeting room (from a calendar card or the editor).
        this.closeMeetingModal();
        return this._launchMeetingStandalone();

      case "close-meeting-modal":
        return this.closeMeetingModal();

      // Fired by the invitee search Entry's `watch` on every keystroke.
      case "mm-invitee-typed":
        return this._filterInvitees((args && args.value) || "", { open: true });

      case "mm-toggle-invitee-list":
        return this._toggleInviteeList();

      case "mm-add-invitee":
        return this._addInvitee(cmd);

      case "mm-remove-invitee":
        return this._removeInvitee(cmd);

      case "mm-set-recur":
        return this.setMeetingRecur(cmd);

      case "mm-set-ampm":
        return this._setMeetingAmpm(cmd);

      // The meeting date changed — refresh the invitees' free/busy state.
      case "mm-recheck-availability":
        return this._checkAvailability();

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

    // Current NAVIGATED folder name — `filename` follows navigation (like the
    // window title, see _syncWindowTitle); `_a.name` keeps the launch-time
    // workspace name and would show the root instead of the open subfolder.
    // Empty filename = workspace root → hub_name.
    const folderName =
      this.mget(_a.filename) || this.model.get("hub_name") || this.mget(_a.name);
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

      this._wireChatExportBackdrop(wrapper);

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

      this._wireChatExportBackdrop(wrapper);

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
   * Clicking the backdrop (not the card) closes the export modal.
   *
   * Assigned, not added: ui-core installs its own `el.onclick` on every widget
   * at render and that handler ends in `e.stopImmediatePropagation()`, which
   * drops any listener added to the SAME element afterwards — so an
   * `addEventListener("click", …)` here only ran on a second click inside the
   * framework's 300 ms debounce, i.e. the backdrop needed a double click.
   * Capture does not help when the backdrop IS the event target, and the
   * wrapper is a bare layout node with no `service`, so replacing its handler
   * costs nothing. Same idiom as the @-mention dropdown.
   *
   * Shared by both openers of the overlay — it used to be copy-pasted twice.
   */
  _wireChatExportBackdrop(wrapper) {
    if (!wrapper || !wrapper.el) return;
    wrapper.el.onclick = (e) => {
      if (e.target === wrapper.el) this._closeChatExportOverlay();
    };
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

  // ── Meeting schedule: responsive view breakpoint ─────────────────────────
  // A 7-day hourly grid does not fit a phone. Rather than build a third
  // rendering path, this switches the panel to the DAILY view that already
  // exists (skeleton/meeting-schedule weeklyGrid renders nDays = 1 when
  // st.view === "daily" — the same view the mini-calendar drills into).
  //
  // Observes `this.el`, which IS `.window-folder__ui` — deliberately the same
  // element the skin's `@container window-folder-w` query measures, so the CSS
  // and this JS cannot drift apart on where 700px is. Observing the panel
  // instead would measure a box inset by the window chrome and cross the
  // threshold at a different screen width than the stylesheet does.
  //
  // Width, not a device flag: Visitor.device() has no tablet tier (user.js
  // returns `desktop` above 800px and only says `mobile` with /mobile/i in the
  // UA, which a modern iPad's Macintosh UA never matches), and a width test
  // additionally catches a narrow folder window on a wide desktop — the
  // split-with-chat case a viewport @media misses entirely.
  _wireScheduleBreakpoint() {
    if (
      this._schedResizeObserver ||
      !this.el ||
      typeof ResizeObserver !== "function"
    )
      return;
    // null, not a boolean: the first ResizeObserver callback (which fires
    // immediately on observe()) then reads as a crossing and seeds the state,
    // so opening the Meeting tab on a phone lands on daily without a separate
    // measure-on-mount path.
    this._schedNarrow = null;
    this._schedResizeObserver = new ResizeObserver((entries) => {
      if (this.isDestroyed?.()) return this._unwireScheduleBreakpoint();
      const box = entries && entries[0] && entries[0].contentRect;
      const w = box ? box.width : this.el.clientWidth;
      // Ignore a zero measure: the panel reports 0×0 while its tab is hidden,
      // and treating that as "narrow" would switch the view behind a tab the
      // user is not looking at.
      if (!w) return;
      const narrow = w <= SCHED_NARROW_PX;
      // Only a CROSSING acts. This is what keeps the observer off the render
      // path: _applyScheduleBreakpoint re-feeds the panel, which resizes it,
      // which calls this back — comparing against the last known side is what
      // stops that being a loop, and it also spares the refetch that
      // _refreshSchedule does on every call.
      if (narrow === this._schedNarrow) return;
      this._schedNarrow = narrow;
      this._applyScheduleBreakpoint(narrow);
    });
    this._schedResizeObserver.observe(this.el);
  }

  _unwireScheduleBreakpoint() {
    if (!this._schedResizeObserver) return;
    this._schedResizeObserver.disconnect();
    this._schedResizeObserver = null;
  }

  /**
   * Apply the narrow/wide decision to the schedule view.
   *
   * Monthly is deliberately untouched in both directions: a month grid is
   * legible on a phone (the skin tightens its cells), and someone who picked
   * Monthly asked for it.
   *
   * @param {boolean} narrow  panel is at or below the compact breakpoint
   */
  _applyScheduleBreakpoint(narrow) {
    const st = require("./skeleton/meeting-schedule").schedState(this);
    let next = st.view;
    if (narrow) {
      if (st.view === "weekly") {
        next = "daily";
        st.autoDaily = true;
      }
    } else if (st.autoDaily) {
      // Undo only OUR switch. An explicit pick cleared the flag, so widening
      // never yanks the user out of a view they chose themselves.
      if (st.view === "daily") next = "weekly";
      st.autoDaily = false;
    }
    if (next === st.view) return;
    st.view = next;
    this._refreshSchedule();
  }

  // Re-render the Meeting-tab schedule in place after a nav/toggle service
  // (state lives in this._sched — see skeleton/meeting-schedule.js). Refetches
  // the hub's meetings for the (possibly changed) visible range first, so the
  // grid always reflects the current window.
  _refreshSchedule() {
    // Render immediately from view state (so nav/toggle work even if the fetch
    // fails), then re-render when the fetch resolves.
    const feed = () => {
      const part = this.getPart && this.getPart("meeting-panel");
      if (!part || !part.el) return;
      part.feed(require("./skeleton/meeting-schedule")(this).kids);
    };
    feed();
    return this._fetchMeetings().then(feed, feed);
  }

  // Week/day grids render all 24 hours, so an unscrolled grid opens on empty
  // night hours. Land on the earliest meeting in view (one row of context
  // above it), or on the working hours when the range is empty. Month view
  // doesn't scroll.
  _scrollScheduleIntoView(part) {
    const fig = this.fig.family;
    const body = part && part.el && part.el.querySelector(`.${fig}__meeting-sched-body`);
    if (!body || body.classList.contains(`${fig}__meeting-sched-body--month`)) return;

    const sched = require("./skeleton/meeting-schedule");
    const st = sched.schedState(this);
    const daily = st.view === "daily";
    const start = daily ? st.anchor.startOf("day") : st.anchor.startOf("week");
    const range = sched.normalizeMeetings(this, start, start.add(daily ? 1 : 7, "day"));
    const DEFAULT_HOUR = 8;
    const hour = range.length
      ? Math.min(...range.map((m) => m.start.hour()))
      : DEFAULT_HOUR;
    // One row of context above the first meeting, clamped to the top.
    body.scrollTop = Math.max(0, (hour - 1) * sched.HOUR_PX);
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

  // The workspace every room.* call must be scoped to. Without an explicit
  // hub_id the server resolves the hub from the request hostname
  // (session._initHub), which for the SPA is always the bootstrap endpoint —
  // so every workspace read and wrote the same calendar.
  // A fragment, not a bare value: fetchService puts plain scalars straight into
  // the query string, so an undefined hub_id would ship as the string
  // "undefined" and resolve to the default hub.
  _meetingScope() {
    const hub_id = this.mget(_a.actual_hub_id) || this.mget(_a.hub_id);
    return hub_id ? { hub_id } : {};
  }

  // room.list answers with the raw stored-procedure result, and the server's
  // row unwrapping collapses a SINGLE-row result set into a bare object — an
  // array only when the range holds two or more meetings. Reading that object
  // as "not a list" emptied the calendar, so deleting one of two meetings made
  // the survivor vanish too, while the meeting (and its start-time reminder)
  // stayed alive server-side: the toast still fired for a meeting no longer on
  // screen. Normalize every shape to a list of rows here.
  _asMeetingRows(rows) {
    if (Array.isArray(rows)) return rows.filter((r) => r && r.id);
    if (rows && typeof rows === "object" && rows.id) return [rows];
    return [];
  }

  // Fetch the hub's scheduled meetings for the visible range into this._meetings.
  // Resolves (never rejects) so callers can re-feed regardless.
  _fetchMeetings() {
    // Guard against SERVICE.room being absent (route not loaded) — fall back to
    // the plain service name so this never throws synchronously.
    const svc = (SERVICE.room && SERVICE.room.list) || "room.list";
    const { stime, etime } = this._meetingRange();
    return Promise.resolve()
      .then(() => this.fetchService(svc, { stime, etime, ...this._meetingScope() }))
      .then((rows) => {
        this._meetings = this._asMeetingRows(rows);
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
      // Creator uid — written server-side by room.book (metadata.content
      // .created_by). Legacy meetings predate it, so fall back to the node's
      // owner_id; both may be absent, which the UI treats as "unknown".
      created_by: content.created_by || m.owner_id || null,
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

  // Resolve a meeting's creator uid into a display chip. The uid is all the
  // server stores, so the name/avatar come from the workspace member pool
  // (_hubMembers, loaded with the modal); an unresolvable uid — a former
  // member, or a legacy meeting with no creator recorded — degrades to the raw
  // uid rather than rendering blank. No `created_by` in create mode means the
  // current user, who becomes the creator on submit.
  meetingCreator(m) {
    const uid = m && m.created_by;
    if (!uid || String(uid) === String(Visitor.id)) {
      return {
        uid: Visitor.id,
        // Never empty: Skeletons.Avatar hashes the name to build the fallback
        // colour swatch and would throw on undefined.
        name: Visitor.fullname() || String(Visitor.id || ""),
        avatar: Visitor.avatar(),
        isMe: true,
      };
    }
    const member = (this._hubMembers || []).find(
      (x) => String(x.uid || x.id) === String(uid),
    );
    if (!member) return { uid, name: String(uid), avatar: "default", isMe: false };
    const name =
      member.fullname ||
      `${member.firstname || ""} ${member.lastname || ""}`.trim() ||
      member.email ||
      String(uid);
    return { uid, name, avatar: member.avatar || "default", isMe: false };
  }

  openMeetingModal(opt = {}) {
    let prefill = this._prefillMeeting(opt.meeting);
    // Create-at-slot (clicking an empty weekly cell): synthesize a create-mode
    // prefill (nid null) seeded with the clicked day + a 1-hour slot.
    if (!prefill && opt.at && opt.at.day) {
      const p2 = (n) => String(n).padStart(2, "0");
      const startMin = opt.at.hour * 60 + (opt.at.min || 0);
      const endMin = startMin + 60; // default 1-hour slot
      const hm = (mins) => `${p2(Math.floor(mins / 60) % 24)}:${p2(mins % 60)}`;
      prefill = {
        nid: null,
        title: "",
        message: "",
        created_by: null,
        date_ymd: opt.at.day,
        stime_hm: hm(startMin),
        etime_hm: hm(endMin),
        attendees: [],
        recur: { freq: "none", until: "" },
      };
    }
    // Working state the invitee chips + recurrence row read/mutate.
    this._mmAttendees = prefill ? prefill.attendees.slice() : [];
    this._mmRecur = prefill ? { ...prefill.recur } : { freq: "none", until: "" };
    this._mmEditNid = prefill ? prefill.nid : null;
    // Creator of the meeting being edited (null while creating — the current
    // user becomes the creator on submit).
    this._mmCreatedBy = prefill ? prefill.created_by : null;
    this._mmBusy = {};
    // Also cleared on close; reset here too so a modal re-opened without one
    // (create → edit) cannot start out suppressing the availability banner.
    this._mmCapNotice = 0;
    // Fetch the workspace member pool first so the invitee chips can render.
    const loadMembers = this.fetchService(SERVICE.hub.get_members_by_type, {
      type: "all",
      ...this._meetingScope(),
    })
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
          // Transparent backdrop (no blur/white wash — the content stays visible
          // behind the centered card).
          wrapper.el.setAttribute("data-variant", "meeting");
        }
        wrapper.feed(require("./skeleton/meeting-modal")(this, { meeting: prefill }));
        // Focus/blur wiring for the invitee combobox (delegated on the wrapper,
        // installed once — the wrapper element outlives each modal).
        this._installInviteeFocus();
        // Re-run the free/busy check when the time changes, and once on open
        // (edit mode arrives with attendees + a time already set).
        const root = wrapper.el;
        if (root) {
          // The date field and the invitee search build their <input> lazily,
          // so they can't be listened to here — both route through the skeleton
          // instead (service "mm-recheck-availability" / watch
          // "mm-invitee-typed"). The time pickers are plain Elements and are
          // wired directly: keep the hidden HH:mm in sync with the Hour/Minute
          // boxes; pad + recheck availability on blur.
          ["stime", "etime"].forEach((which) => {
            root
              .querySelectorAll(`[data-timefor="${which}"][data-timepart]`)
              .forEach((el) => {
                el.addEventListener("input", () => this._recomputeTime(which));
                el.addEventListener("blur", () => {
                  const v = parseInt(el.value, 10);
                  if (!isNaN(v)) el.value = String(v).padStart(2, "0");
                  this._recomputeTime(which);
                  this._checkAvailability();
                });
              });
          });
          // Rich description editor: seed from the meeting's stored markers + wire
          // @-mention / /-file / image paste-drop.
          const descEditor = root.querySelector(
            `.${this.fig.family}__meeting-modal-desc-editor`,
          );
          if (descEditor) {
            this._mmInitDescEditor(descEditor, prefill ? prefill.message : "");
          }
        }
        _.delay(() => this._checkAvailability(), 150);
      }),
    );
  }

  closeMeetingModal() {
    if (this._mmInviteeBlurTimer) {
      clearTimeout(this._mmInviteeBlurTimer);
      this._mmInviteeBlurTimer = null;
    }
    this._mmAttendees = [];
    this._mmRecur = { freq: "none", until: "" };
    this._mmEditNid = null;
    this._mmBusy = {};
    this._mmCapNotice = 0;
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

  // Feed the suggestions dropdown: an empty query now lists every member, so
  // `opt.open` decides whether it is shown (focus / typing / caret). Omitted,
  // the current open state is preserved — removing a chip must re-feed the rows
  // without popping a list the user had dismissed.
  _filterInvitees(query, opt = {}) {
    const part = this.getPart && this.getPart("mm-invitees-suggestions");
    if (!part) return;
    const pfx = `${this.fig.family}__meeting-modal`;
    const rows = require("./skeleton/meeting-modal").inviteesSuggestions(this, pfx, query);
    const open =
      opt.open != null
        ? !!opt.open
        : !!(part.el && part.el.dataset.open === "1");
    part.feed(rows);
    // A press on a row must not blur the search field, or the 200 ms focusout
    // teardown fires mid-click and the pick is lost.
    require("libs/pick-guard").keepListThroughClick(
      part.el,
      `.${pfx}-invitee-option`,
    );
    if (part.el) part.el.dataset.open = open && rows.length ? 1 : 0;
  }

  // Caret click: same list as focusing the field, but also dismisses it.
  _toggleInviteeList() {
    const part = this.getPart && this.getPart("mm-invitees-suggestions");
    const open = !!(part && part.el && part.el.dataset.open === "1");
    if (this._mmInviteeBlurTimer) {
      clearTimeout(this._mmInviteeBlurTimer);
      this._mmInviteeBlurTimer = null;
    }
    const input = this._mmSearchInput();
    if (open) {
      if (input) input.blur();
      if (part && part.el) part.el.dataset.open = 0;
      if (part) part.feed([]);
      return;
    }
    if (input) input.focus();
    return this._filterInvitees(input ? input.value : "", { open: true });
  }

  // Focus opens the member list, blur closes it. Delegated on the dialog
  // wrapper: the Entry builds its <input> lazily and rebuilds it on re-feed, so
  // a listener bound to the input itself would be dropped. The close is
  // deferred because clicking a suggestion row blurs the input first.
  _installInviteeFocus() {
    const root = this.dialogWrapper && this.dialogWrapper.el;
    if (!root || this._mmInviteeFocusInstalled) return;
    this._mmInviteeFocusInstalled = true;

    const isSearchInput = (t) =>
      t && t.matches && t.matches('[name="mm-invitee-search"]');

    root.addEventListener("focusin", (e) => {
      if (!isSearchInput(e.target)) return;
      if (this._mmInviteeBlurTimer) {
        clearTimeout(this._mmInviteeBlurTimer);
        this._mmInviteeBlurTimer = null;
      }
      this._filterInvitees(e.target.value || "", { open: true });
    });

    root.addEventListener("focusout", (e) => {
      if (!isSearchInput(e.target)) return;
      if (this._mmInviteeBlurTimer) clearTimeout(this._mmInviteeBlurTimer);
      this._mmInviteeBlurTimer = setTimeout(() => {
        this._mmInviteeBlurTimer = null;
        const active =
          typeof document !== "undefined" ? document.activeElement : null;
        // _addInvitee refocuses the field for the next pick — keep it open.
        if (isSearchInput(active)) return;
        const part = this.getPart && this.getPart("mm-invitees-suggestions");
        if (!part) return;
        part.feed([]);
        if (part.el) part.el.dataset.open = 0;
      }, 200);
    });
  }

  _mmSearchInput() {
    return (
      this.dialogWrapper &&
      this.dialogWrapper.el &&
      this.dialogWrapper.el.querySelector('[name="mm-invitee-search"]')
    );
  }

  // Recompute the hidden 24h "HH:mm" value (name mm-stime / mm-etime) from the
  // custom time picker's Hour/Minute boxes + AM/PM toggle, so the submit +
  // free/busy read paths stay unchanged.
  _recomputeTime(which) {
    const root = this.dialogWrapper && this.dialogWrapper.el;
    if (!root) return;
    const fig = this.fig.family;
    const picker = root.querySelector(
      `.${fig}__meeting-modal-time-picker[data-timefor="${which}"]`,
    );
    if (!picker) return;
    const p2 = (n) => String(n).padStart(2, "0");
    const hourEl = picker.querySelector('[data-timepart="hour"]');
    const minEl = picker.querySelector('[data-timepart="minute"]');
    const active = picker.querySelector(
      `.${fig}__meeting-modal-time-seg[data-active="1"]`,
    );
    let h = parseInt((hourEl && hourEl.value) || "", 10);
    if (isNaN(h) || h < 1) h = 12;
    if (h > 12) h = 12;
    let mi = parseInt((minEl && minEl.value) || "", 10);
    if (isNaN(mi) || mi < 0) mi = 0;
    if (mi > 59) mi = 59;
    const ampm = active ? active.dataset.ampm : "am";
    let h24 = h % 12;
    if (ampm === "pm") h24 += 12;
    const hidden = picker.querySelector(`[name="mm-${which}"]`);
    if (hidden) hidden.value = `${p2(h24)}:${p2(mi)}`;
  }

  // AM/PM toggle: activate the clicked segment, resync the hidden value, recheck.
  _setMeetingAmpm(cmd) {
    const which = cmd && cmd.mget && cmd.mget("which");
    const ampm = cmd && cmd.mget && cmd.mget("ampm");
    const root = this.dialogWrapper && this.dialogWrapper.el;
    if (!root || !which || !ampm) return;
    const fig = this.fig.family;
    const picker = root.querySelector(
      `.${fig}__meeting-modal-time-picker[data-timefor="${which}"]`,
    );
    if (!picker) return;
    picker.querySelectorAll(`.${fig}__meeting-modal-time-seg`).forEach((s) => {
      s.dataset.active = s.dataset.ampm === ampm ? "1" : "0";
    });
    this._recomputeTime(which);
    this._checkAvailability();
  }

  // Add a searched member to the invitee set; clear the search box + dropdown.
  // The teardown is deferred: clearing the dropdown destroys `cmd` itself (the
  // suggestion row currently dispatching this click), and tearing it down
  // mid-dispatch aborted the rest of the click handling.
  _addInvitee(cmd) {
    const uid = cmd && ((cmd.mget && cmd.mget("uid")) || (cmd.el && cmd.el.dataset.uid));
    if (!uid) return;
    const name = (cmd.mget && cmd.mget("uname")) || "";
    this._mmAttendees = this._mmAttendees || [];
    if (!this._mmAttendees.some((a) => String(a.uid || a) === String(uid))) {
      this._mmAttendees.push({ uid, name });
    }
    _.defer(() => {
      const search = this._mmSearchInput();
      if (search) {
        search.value = "";
        // Keep the caret in the field so the next name can be typed straight
        // away instead of having to click back into it.
        search.focus();
      }
      // Field keeps focus, so keep the list open on the remaining members.
      this._filterInvitees("", { open: true });
      this._reFeedInviteeChips();
      this._checkAvailability();
    });
  }

  // Remove an invitee chip; re-run the current query so the member reappears as
  // a suggestion if it still matches. Deferred for the same reason as _addInvitee
  // — the re-feed destroys the chip whose ✕ is dispatching this click.
  _removeInvitee(cmd) {
    const uid = cmd && ((cmd.mget && cmd.mget("uid")) || (cmd.el && cmd.el.dataset.uid));
    if (!uid) return;
    this._mmAttendees = (this._mmAttendees || []).filter(
      (a) => String(a.uid || a) !== String(uid),
    );
    _.defer(() => {
      this._reFeedInviteeChips();
      const search = this._mmSearchInput();
      this._filterInvitees(search ? search.value : "");
      this._checkAvailability();
    });
  }

  // Free/busy (Tier 1, workspace-scoped): ask the server which invitees already
  // have a meeting overlapping the chosen slot, mark their chips busy + a banner.
  // Warn-only — never blocks the organizer from booking.
  _checkAvailability() {
    const root = this.dialogWrapper && this.dialogWrapper.el;
    if (!root) return;
    const val = (sel) => {
      const el = root.querySelector(sel);
      return el ? String(el.value || "").trim() : "";
    };
    const setBanner = (txt) => {
      // This banner line is shared with the plan-cap notice, and clicking
      // Schedule blurs the time field — which fires this probe on the very
      // same click that raised the notice. Clearing to empty afterwards would
      // erase the reason the save was refused, seconds after showing it. A
      // real busy warning still wins: that is new information, not a stale
      // blank. The notice is dropped by the next submit.
      if (!txt && this._mmCapNotice) return;
      const el = root.querySelector(`.${this.fig.family}__meeting-modal-availability`);
      if (el) el.textContent = txt || "";
    };
    const dateYmd = val('[name="mm-date"]');
    const sHm = val('[name="mm-stime"]');
    const uids = (this._mmAttendees || []).map((a) => a.uid || a).filter(Boolean);
    if (!dateYmd || !sHm || !uids.length) {
      this._mmBusy = {};
      this._reFeedInviteeChips();
      setBanner("");
      return;
    }
    const eHm = val('[name="mm-etime"]');
    const stime = Dayjs(`${dateYmd}T${sHm}`).unix();
    const etime = eHm ? Dayjs(`${dateYmd}T${eHm}`).unix() : stime + 3600;
    const svc = (SERVICE.room && SERVICE.room.check_availability) || "room.check_availability";
    return this.fetchService(svc, {
      stime,
      etime,
      ...this._meetingScope(),
      attendees: this._mmAttendees,
      nid: this._mmEditNid || undefined,
    })
      .then((rows) => {
        const busy = {};
        (Array.isArray(rows) ? rows : []).forEach((r) => {
          if (r && r.busy) busy[r.uid] = r.conflicts || [];
        });
        this._mmBusy = busy;
        this._reFeedInviteeChips();
        const n = Object.keys(busy).length;
        setBanner(n ? LOCALE.N_INVITEES_BUSY.format(n) : "");
      })
      .catch(() => {});
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
    // Description is the rich contenteditable → serialize to marker text + the
    // mentioned person uids (for server-side notify).
    const descEditor = root.querySelector(
      `.${this.fig.family}__meeting-modal-desc-editor`,
    );
    const message = descEditor ? this._mmSerializeEditor(descEditor) : "";
    const mention_uids = descEditor ? this._mmCollectMentionUids(descEditor) : [];
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
      mention_uids,
      // Legacy display string (back-compat for player/schedule). Plain tokens
      // only — no localizedFormat plugin dependency.
      date: Dayjs.unix(stime).format("ddd, MMM D, YYYY h:mm A"),
      stime,
      etime,
      recur,
      attendees: (this._mmAttendees || []).slice(),
      // Creating → the current user is the creator. Editing → keep whoever
      // created it (null for legacy meetings; never claim authorship). The
      // server owns this field — it's carried here only so the optimistic
      // local row matches what room.list will return.
      created_by: this._mmEditNid ? this._mmCreatedBy : Visitor.id,
    };
  }

  /**
   * The plan's meeting-length cap when this form exceeds it, else 0.
   *
   * Read from the VIEWER's own entitlement, with no ownership test.
   *
   * There was one here, gating only workspaces whose `privilege` carried the
   * owner bit, on the grounds that a room runs on the workspace OWNER's plan
   * (the server stamps its deadline from the hub's owner_id — meeting-limit
   * roomDeadline). That is true and it is still the wrong rule, because inside
   * an organisation the hub owner and the billing entity are not the same
   * thing: every member shares the ORG's plan, so a workspace admin who simply
   * does not happen to own the hub would have been waved through in silence —
   * the common case — to avoid refusing a Free user booking into somebody
   * else's paid workspace, which is the rare one. A silent no-op is the worse
   * failure of the two: being told to shorten the meeting or upgrade is an
   * inconvenience the reader can act on, while a gate that quietly does
   * nothing is indistinguishable from a broken build.
   *
   * The residual mismatch is bounded and self-correcting either way: the room
   * is capped server-side from the owner's plan regardless of what this says,
   * so the worst outcome is a card shown to someone whose meeting would not
   * actually have been cut.
   */
  _meetingOverPlanCap(form) {
    if (!form) return 0;
    return overMeetingCap(form.etime - form.stime);
  }

  // Optimistically upsert a meeting into this._meetings from the form so it
  // shows immediately; a later room.list fetch overwrites it.
  _upsertLocalMeeting(nid, form) {
    if (!nid) return;
    this._meetings = Array.isArray(this._meetings) ? this._meetings : [];
    const row = {
      id: nid,
      filename: form.title,
      stime: form.stime,
      etime: form.etime,
      owner_id: form.created_by,
      metadata: JSON.stringify({
        content: {
          title: form.title,
          message: form.message,
          date: form.date,
          stime: form.stime,
          etime: form.etime,
          recur: form.recur,
          attendees: form.attendees,
          created_by: form.created_by,
          room_id: nid,
        },
      }),
    };
    const i = this._meetings.findIndex((m) => m.id === nid);
    if (i >= 0) this._meetings[i] = row;
    else this._meetings.push(row);
  }

  // Outline the Title field while its "required" warning is up.
  _mmMarkTitleError(on) {
    const root = this.dialogWrapper && this.dialogWrapper.el;
    const el =
      root &&
      root.querySelector(`.${this.fig.family}__meeting-modal-input.title`);
    if (el) el.dataset.error = on ? "1" : "0";
  }

  // Inline warning line inside the schedule modal (shared with the free/busy
  // banner — it is the modal's one messaging surface).
  _mmBanner(txt) {
    const root = this.dialogWrapper && this.dialogWrapper.el;
    const el =
      root &&
      root.querySelector(`.${this.fig.family}__meeting-modal-availability`);
    if (el) el.textContent = txt || "";
  }

  // Did a room.* call actually go through? A rejected call does NOT reject the
  // promise here: a 4xx is swallowed by the window's onServerComplain and
  // resolves as `undefined`, and a 200 carrying `error` resolves with the error
  // payload. Both used to run the success branch, so a refused edit/delete
  // (room.update / room.remove answer NOT_MEETING_OWNER to anyone but the
  // organizer) closed the modal as if it had been saved or deleted.
  _mmSucceeded(res) {
    return !!res && typeof res === "object" && !res.error;
  }

  // The failure reason never reaches the caller — handleResponse throws the
  // response, and the base class's onServerComplain swallows it — so keep the
  // last one here. Purely a record: the base behaviour (quota → upgrade) still
  // runs, for this call and every other service this window makes.
  onServerComplain(xhr) {
    this._lastServiceError = xhr;
    if (super.onServerComplain) return super.onServerComplain(xhr);
  }

  // Why the meeting call failed, in the modal's words. Only a 400 from the
  // meeting endpoints themselves is the service refusing us — that is
  // NOT_MEETING_OWNER, the one rejection room.book/update/remove raise. Being
  // offline, a 5xx, or a route that isn't deployed must NOT be reported as an
  // ownership problem, and neither must the free/busy probe, which fires on
  // the very same click (the time field blurs) and would otherwise speak for
  // the save. Everything else gets the neutral "try again".
  _mmFailureMessage(action) {
    const e = this._lastServiceError;
    const status = e && (e.status || e.error_code);
    const url = (e && e.url) || "";
    if (status == 400 && /room\.(book|update|remove)/.test(url)) {
      return LOCALE.MEETING_NOT_OWNER;
    }
    return action === "delete"
      ? LOCALE.MEETING_DELETE_FAILED
      : LOCALE.MEETING_SAVE_FAILED;
  }

  submitMeetingModal() {
    if (this._mmSubmitting) return;
    const form = this._readMeetingForm();
    if (!form) return; // no date → do nothing (field stays open)
    // An empty title does NOT create an untitled meeting: room.book substitutes
    // the localized "<name> scheduled a meeting" headline, so the calendar (and
    // every recurring occurrence of it) showed that boilerplate instead of what
    // the organizer thought they had entered. Ask for a title instead of
    // silently inventing one.
    if (!form.title) {
      this._mmBanner(LOCALE.MEETING_TITLE_REQUIRED);
      this._mmMarkTitleError(1);
      const root = this.dialogWrapper && this.dialogWrapper.el;
      const input = root && root.querySelector('[name="mm-title"]');
      if (input && input.focus) input.focus();
      return;
    }
    // Each submit re-decides the cap from the times as they stand now, so any
    // notice left over from the previous attempt goes first — otherwise a
    // shortened meeting would still be carrying the old refusal on screen.
    this._mmCapNotice = 0;
    this._mmBanner("");
    this._mmMarkTitleError(0);

    // Plan cap on meeting LENGTH. Checked on submit rather than while the time
    // fields are being edited: a half-filled form passes through every invalid
    // duration on its way to a valid one, and nagging at each of them would
    // make the card an obstacle instead of an answer. This is the click that
    // committed to those times.
    //
    // The dialog deliberately stays OPEN behind the card — the fix is to
    // shorten the meeting, and that is only possible in the form the card
    // would otherwise have closed. The banner keeps the reason on screen after
    // the card is dismissed.
    const capMins = this._meetingOverPlanCap(form);
    if (capMins) {
      this._mmCapNotice = 1;
      this._mmBanner(LOCALE.UNLOCK_MEETING_SCHEDULE_DESC.format(capMins));
      // Required here, not at module scope: the card pulls its own skin in,
      // and a folder window / calendar that never hits the cap should not be
      // paying for the upsell's CSS. Same reason Wm.openFeatureLock defers it.
      const { promptFeatureLock } = require("builtins/widget/feature-lock");
      promptFeatureLock("meeting_schedule", [capMins]);
      return;
    }

    this._mmSubmitting = 1;
    // Stale reason from an earlier call must not colour this one's message.
    this._lastServiceError = null;
    const nid = this._mmEditNid;
    const done = () => {
      this._mmSubmitting = 0;
      this.closeMeetingModal();
      this._refreshSchedule();
    };
    const fail = () => {
      this._mmSubmitting = 0;
      this._mmBanner(this._mmFailureMessage("save"));
    };

    if (nid) {
      // Edit: flag "all" updates title/agenda/when + members (uids) + recur.
      return this.fetchService((SERVICE.room && SERVICE.room.update) || "room.update", {
        flag: "all",
        nid,
        ...this._meetingScope(),
        title: form.title,
        message: form.message,
        date: form.date,
        stime: form.stime,
        etime: form.etime,
        recur: form.recur,
        attendees: form.attendees,
      }).then((res) => {
        // Keep the dialog open on a refusal instead of reporting a save that
        // never happened — the calendar would snap back on the next fetch.
        if (!this._mmSucceeded(res)) return fail();
        this._upsertLocalMeeting(nid, form);
        done();
      }, fail);
    }

    // Create: book the node (with recurrence), then attach the invited members
    // via update "member" (which notifies them in-app).
    let createdNid = null;
    return this.fetchService((SERVICE.room && SERVICE.room.book) || "room.book", {
      ...this._meetingScope(),
      title: form.title,
      message: form.message,
      date: form.date,
      stime: form.stime,
      etime: form.etime,
      recur: form.recur,
    })
      .then((node) => {
        if (!this._mmSucceeded(node)) return fail();
        createdNid = node && (node.id || node.nid);
        if (createdNid && form.attendees.length) {
          return this.fetchService((SERVICE.room && SERVICE.room.update) || "room.update", {
            flag: "member",
            nid: createdNid,
            ...this._meetingScope(),
            attendees: form.attendees,
          });
        }
      })
      .then(() => {
        // book() refused: the first stage already reported it and cleared the
        // submitting flag — don't close the dialog on top of that message.
        // Anything else keeps the previous behaviour (close + refresh).
        if (!this._mmSubmitting) return;
        if (createdNid) {
          this._upsertLocalMeeting(createdNid, form);
          // Jump the calendar to the new meeting's week so it's visible even if
          // it was scheduled outside the range currently in view.
          const st = require("./skeleton/meeting-schedule").schedState(this);
          st.anchor = Dayjs.unix(form.stime);
        }
        done();
      }, fail);
  }

  deleteMeetingModal() {
    const nid = this._mmEditNid;
    if (!nid) return this.closeMeetingModal();
    const fail = () => this._mmBanner(this._mmFailureMessage("delete"));
    // Stale reason from an earlier call must not colour this one's message.
    this._lastServiceError = null;
    return this.postService((SERVICE.room && SERVICE.room.remove) || "room.remove", {
      nid,
      ...this._meetingScope(),
    }).then((res) => {
      // room.remove answers NOT_MEETING_OWNER to anyone but the organizer.
      // Closing regardless announced a deletion that never happened — the
      // meeting came back on the next fetch, and its start-time reminder still
      // fired. Say so and keep the dialog open instead.
      if (!this._mmSucceeded(res)) return fail();
      this.closeMeetingModal();
      this._refreshSchedule();
    }, fail);
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
    const startBtn =
      this.el &&
      this.el.querySelector(`.${this.fig.family}__meeting-sched-start-btn`);
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

      // Immediate click feedback: spin the Start button until the meeting
      // window is live (or we time out) — see _awaitMeetingReady.
      this._setMeetingStartLoading(true, startBtn);
      this._awaitMeetingReady(startBtn);

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
    } catch (e) {
      // Launch failed synchronously — drop the spinner immediately.
      this._setMeetingStartLoading(false, startBtn);
      this._stopAwaitMeetingReady();
      if (this.warn) this.warn("start meeting failed", e);
    } finally {
      this._launchingMeeting = false;
    }
  }

  // Toggle the Start-meeting button's loading (spinner + click-block) state.
  // The element is resolved lazily so callers don't have to hold a reference.
  _setMeetingStartLoading(on, btnEl) {
    const el =
      btnEl ||
      (this.el &&
        this.el.querySelector(`.${this.fig.family}__meeting-sched-start-btn`));
    if (el) el.dataset.loading = on ? "1" : "0";
  }

  // Is a standalone meeting window currently live? Meetings are a global Wm
  // singleton (a second launch is blocked with "already another call"), so any
  // window_meeting means the user is in a meeting launched from here.
  _meetingWindowLive() {
    const w = Wm.getItemByKind("window_meeting");
    return !!(w && !(w.isDestroyed && w.isDestroyed()));
  }

  // The Start-meeting button label reflects three states, in priority order:
  //   1. `_meetingJoined` — the local user is in the meeting → locked "Joined"
  //   2. `_meetingActive` — a meeting is live in this room (host present) but the
  //      viewer isn't in it → "Join Meeting"
  //   3. idle → "Start a Meeting"
  _startBtnLabel() {
    if (this._meetingJoined) return LOCALE.JOINED || "Joined";
    if (this._meetingActive) return LOCALE.JOIN_MEETING || "Join meeting";
    return LOCALE.START_A_MEETING || "Start a Meeting";
  }

  // Apply the current button state to the DOM. Resolved fresh each call so a
  // rebuilt button (schedule re-render) is still updated; the skeleton reads the
  // same flags so an initial render is already correct. Only the "Joined" state
  // locks + paints the button ([data-joined="1"]); "Join Meeting" is clickable.
  _applyStartBtnState() {
    const el =
      this.el &&
      this.el.querySelector(`.${this.fig.family}__meeting-sched-start-btn`);
    if (!el) return;
    el.dataset.joined = this._meetingJoined ? "1" : "0";
    const label =
      el.querySelector(
        `.${this.fig.family}__meeting-sched-start-label .note-content`,
      ) || el.querySelector(".note-content");
    if (label) label.textContent = this._startBtnLabel();
  }

  // Local user's in-meeting state. `_meetingJoined` persists so a schedule
  // re-render keeps it (skeleton/meeting-schedule reads it).
  _setMeetingJoined(on) {
    this._meetingJoined = on ? 1 : 0;
    this._applyStartBtnState();
  }

  // "A meeting is currently live in this room" — driven by the meeting.start /
  // meeting.end chat sentinels (see onWsMessage + _refreshMeetingActiveState).
  _setMeetingActive(on) {
    const v = on ? 1 : 0;
    if (this._meetingActive === v) return;
    this._meetingActive = v;
    this._applyStartBtnState();
  }

  // This folder's meeting room nid (matches how _launchMeetingStandalone and the
  // meeting window derive room_id).
  _meetingRoomNid() {
    return `${this.mget(_a.actual_home_id) || this.mget(_a.nid) || ""}`;
  }

  // Parse a chat message body carrying the `[[MEETING:start|end:{json}]]`
  // sentinel that window_meeting posts on join/leave. Returns null otherwise.
  _parseMeetingSentinel(message) {
    if (typeof message !== "string") return null;
    const m = message.match(/^\[\[MEETING:(start|end):([\s\S]*)\]\]$/);
    if (!m) return null;
    let payload = {};
    try {
      payload = JSON.parse(m[2]);
    } catch (e) {
      payload = {};
    }
    return { action: m[1], payload };
  }

  // Does a meeting sentinel payload belong to this folder's room?
  _meetingMsgForMyRoom(payload) {
    if (!payload) return false;
    const mine = new Set(
      [
        `${this.mget(_a.actual_home_id) || ""}`,
        `${this.mget(_a.nid) || ""}`,
      ].filter(Boolean),
    );
    return [payload.room_id, payload.nid].some((x) => mine.has(`${x || ""}`));
  }

  // Subscribe to live channel posts (for realtime meeting.start/end) and seed
  // the current active state from recent history (folder opened mid-meeting).
  // Bound once; bindEvent auto-unbinds on destroy.
  _initMeetingPresence() {
    if (this._meetingPresenceInit) return;
    this._meetingPresenceInit = 1;
    this.bindEvent(_a.live);
    // Deferred: this runs while the window is still building, and its
    // channel.messages scan competed with the file listing for the same
    // endpoint. All it decides is whether the schedule button reads "Start"
    // or "Join meeting" — realtime sentinels keep it correct either way, so
    // it can wait a tick and let the grid request go first.
    _.defer(() => this._refreshMeetingActiveState());
  }

  // Best-effort initial scan: fetch this room's recent messages (newest first)
  // and adopt the most recent meeting sentinel — a `start` with no later `end`
  // means a meeting is live right now. Never throws; a failure leaves the button
  // in its default state and realtime updates still apply.
  _refreshMeetingActiveState() {
    const svc = (SERVICE.channel && SERVICE.channel.messages) || "channel.messages";
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    const api = { service: svc, hub_id, order: "desc" };
    const roomNid = this._meetingRoomNid();
    if (roomNid) api.nid = roomNid;
    Promise.resolve()
      .then(() => this.fetchService(api))
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        for (const r of rows) {
          const p = this._parseMeetingSentinel(r && r.message);
          if (!p || !this._meetingMsgForMyRoom(p.payload)) continue;
          // A finished meeting no longer posts a second `end` message: the ONE
          // start card is flipped in place (channel.meeting_end → row metadata
          // meeting_status='ended'). Reading only the sentinel therefore
          // reported every past meeting as live, so the button stayed on "Join
          // meeting" forever. The row's status wins over the sentinel verb.
          this._setMeetingActive(
            p.action === "start" && !this._meetingRowEnded(r),
          );
          return;
        }
        this._setMeetingActive(false);
      })
      .catch(() => {});
  }

  // Has this message row been flipped to "meeting ended" (channel.meeting_end)?
  // The flag lives in the ROW metadata, not in the sentinel payload.
  _meetingRowEnded(row) {
    let md = row && row.metadata;
    if (typeof md === "string") {
      try {
        md = JSON.parse(md);
      } catch (e) {
        md = null;
      }
    }
    return !!(md && md.meeting_status === "ended");
  }

  // Live channel traffic — react only to this room's meeting.start/end sentinels
  // and ignore everything else (this window also receives unrelated live posts).
  onWsMessage(service, data, options = {}) {
    const svc = options.service || service;
    const postSvc = (SERVICE.channel && SERVICE.channel.post) || "channel.post";
    // The meeting-ended flip is echoed to the whole hub as its own service, and
    // nothing here consumed it: the Start button kept offering "Join meeting"
    // after the last participant had left, until the window was reopened.
    if (svc === "channel.meeting_end") {
      if (!data) return;
      if (`${data.hub_id || ""}` !== `${this.mget(_a.hub_id) || ""}`) return;
      const ended = this._parseMeetingSentinel(data.message);
      if (!ended) return;
      const p2 = Object.assign({}, ended.payload);
      if (data.nid != null && p2.nid == null) p2.nid = data.nid;
      if (!this._meetingMsgForMyRoom(p2)) return;
      this._setMeetingActive(false);
      return;
    }
    if (svc !== postSvc || !data) return;
    if (`${data.hub_id || ""}` !== `${this.mget(_a.hub_id) || ""}`) return;
    const p = this._parseMeetingSentinel(data.message);
    if (!p) return;
    const payload = Object.assign({}, p.payload);
    if (data.room_id != null && payload.room_id == null) payload.room_id = data.room_id;
    if (data.nid != null && payload.nid == null) payload.nid = data.nid;
    if (!this._meetingMsgForMyRoom(payload)) return;
    this._setMeetingActive(p.action === "start" && !this._meetingRowEnded(data));
  }

  // Show the Start button spinning until the meeting window actually mounts,
  // then swap the spinner for the locked "Joined" state and keep polling so the
  // button is restored the moment that window closes. Keys off the window's
  // existence (not its internal data-ready, which is async and lives on a
  // sibling window) and re-resolves the button each tick, so it survives a cold
  // module load and a schedule re-render. A hard cap clears a stuck spinner if
  // the window never appears. Same-document lookup — Wm windows share the page.
  _awaitMeetingReady(btnEl) {
    this._stopAwaitMeetingReady();
    let sawWindow = false;
    this._meetingReadyPoll = setInterval(() => {
      if (this._meetingWindowLive()) {
        if (!sawWindow) {
          // Window mounted → the user is joining. Drop the spinner and lock the
          // button into its "Joined" state.
          sawWindow = true;
          this._setMeetingStartLoading(false, btnEl);
          this._setMeetingJoined(true);
        }
        return;
      }
      if (sawWindow) {
        // The meeting window we were tracking has closed → restore the button.
        this._stopAwaitMeetingReady();
        this._setMeetingJoined(false);
      }
    }, 200);
    // Safety cap — if the window never mounts, clear the spinner so it can't
    // stick. Once joined, the poll keeps running to watch for the close.
    this._meetingReadyCap = setTimeout(() => {
      this._meetingReadyCap = null;
      if (!sawWindow) {
        this._stopAwaitMeetingReady();
        this._setMeetingStartLoading(false, btnEl);
      }
    }, 20000);
  }

  _stopAwaitMeetingReady() {
    if (this._meetingReadyPoll) {
      clearInterval(this._meetingReadyPoll);
      this._meetingReadyPoll = null;
    }
    if (this._meetingReadyCap) {
      clearTimeout(this._meetingReadyCap);
      this._meetingReadyCap = null;
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
    // Programmatic entry point — reached from chat-item cards, Wm.launch, and
    // the thread rail as well as onUiEvent, so the revocation guard has to be
    // here too. Opening (or re-opening) a revoked thread is refused; clearing
    // the scope (falsy nid) is exactly what the finalizer does and must pass.
    if (fileNid && this._ftIsFileRevoked(fileNid)) return Promise.resolve();
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

    // A file that left this workspace takes its media row with it, so name and
    // type come from the lineage snapshot instead. The conversation is still
    // here and still readable — the card says where the file went rather than
    // pretending the thread is broken.
    const lineage = `${info.lineage_state || ""}`;
    const away = lineage === "unavailable";
    const gone = lineage === "orphaned";
    if ((away || gone) && !name && info.away_file_name && nameEl) {
      nameEl.textContent = `${info.away_file_name}`;
    }
    const statusEl = q("ft-info-status");
    if (statusEl) {
      let status = "";
      if (gone) {
        status = LOCALE.FILE_THREAD_FILE_DELETED;
      } else if (away) {
        const holder = `${info.holder_hub_name || ""}`.trim();
        status = holder
          ? LOCALE.FILE_THREAD_MOVED_TO.format(holder)
          : LOCALE.FILE_THREAD_MOVED_AWAY;
      }
      statusEl.textContent = status;
    }
    // Stamp the card itself, not rootEl: rootEl is the slot/panel that HOSTS
    // the card, and the styling selector is `.window__ft-info-card[...]`.
    // Hiding "Open file →" is not cosmetic — the node id it carries belongs to
    // another workspace, so the click would resolve nothing.
    const cardEl = q("ft-info-card");
    if (cardEl) {
      if (away || gone) {
        cardEl.dataset.ft_lineage = lineage;
      } else {
        delete cardEl.dataset.ft_lineage;
      }
    }

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
    // Capture the access generation: a revoke/recovery landing while this is in
    // flight must not let the response repaint the header it just tore down.
    const generation = this._ftThreadRequestGeneration();
    this.fetchService({ service: svc, hub_id, file_nid: fileNid }, { async: 1 })
      .then((info) => {
        if (!info || !bar.el || (bar.isDestroyed && bar.isDestroyed())) return;
        if (generation !== this._ftThreadRequestGeneration()) return;
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
    const generation = this._ftThreadRequestGeneration();
    this.fetchService({ service: svc, hub_id, file_nid: fileNid }, { async: 1 })
      .then((info) => {
        if (!info || !slot.el || (slot.isDestroyed && slot.isDestroyed())) return;
        // A revoke/recovery superseded this hydrate — do not restore the cached
        // filetype ("Open file →" would launch a player for a gone file).
        if (generation !== this._ftThreadRequestGeneration()) return;
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
    // No chat access → no thread to open. Feeding the panel would mount a chat
    // widget that fetches and renders the conversation behind the CSS gate.
    if (!this._privilegeGrantsChat(this.mget(_a.privilege))) {
      return Promise.resolve();
    }
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
    const generation = this._ftThreadRequestGeneration();
    this.fetchService({ service: svc, hub_id, file_nid: fileNid }, { async: 1 })
      .then((info) => {
        if (!info || !panel.el || (panel.isDestroyed && panel.isDestroyed()))
          return;
        // A revoke/recovery superseded this hydrate while it was in flight.
        if (generation !== this._ftThreadRequestGeneration()) return;
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

  // The first local file-thread post returns the child message but the server
  // intentionally does not echo its synthetic `file.thread` root card to the
  // caller. Refresh the mounted General conversation so the persisted card is
  // visible when the user closes the file-thread panel. An in-place/compact
  // file scope keeps its current child list; clearing that scope already
  // restarts the same widget against General. The rail is independent of the
  // middle widget, so refresh it in both layouts.
  onFileThreadCreated() {
    if (this.isDestroyed && this.isDestroyed()) return;
    this._populateThreadRail();
    return this.ensurePart("folder-chat")
      .then((chat) => {
        if (!chat || (chat.isFileThreadMode && chat.isFileThreadMode())) return;
        return chat.ensurePart(_a.list).then((list) => {
          if (list && _.isFunction(list.restart)) list.restart();
        });
      })
      .catch(() => {});
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

      // Access generation at request time — a revoke/recovery landing mid-fetch
      // invalidates this response, whether it succeeded or failed.
      const generation = this._ftThreadRequestGeneration();
      const render = (items, scopedNid) => {
        // The fetch (and ensurePart) resolve async — bail if the window or the
        // menu part was destroyed meanwhile, so we never feed/flag a dead node
        // or re-bind a document listener on it.
        if (this.isDestroyed && this.isDestroyed()) return;
        if (generation !== this._ftThreadRequestGeneration()) return;
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
    // A member without chat access must not read the thread list. The CSS gate
    // only obscures it; not asking for it in the first place is what keeps the
    // filenames off their screen (they are conversation content too, and some
    // are named after things the member cannot otherwise see).
    if (!this._privilegeGrantsChat(this.mget(_a.privilege))) {
      return Promise.resolve([]);
    }
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
    // Access generation at request time. Folder identity alone is not enough:
    // a revoke or recovery for the SAME folder must also invalidate an older
    // in-flight rail response, or a delayed success repaints the removed thread.
    const generation = this._ftThreadRequestGeneration();
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
          if (generation !== this._ftThreadRequestGeneration()) return;
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
    const nid = this.mget(_a.nid);
    const homeId = this.mget(_a.actual_home_id);
    const isHubWindow = this.mget(_a.filetype) === _a.hub && homeId;
    // A workspace window KEEPS filetype 'hub' after navigating into a subfolder
    // (only its nid/filename follow the navigation), so filetype alone reported
    // "I am the root" while the window was showing a subfolder — scoping the
    // task panel to the workspace root and hiding that subfolder's tasks. Treat
    // it as the root only while it is actually showing the root node; anything
    // else is a real subfolder and scopes to its own nid, exactly like a
    // plain folder window already does.
    const inSubfolder =
      isHubWindow &&
      nid &&
      `${nid}` !== "0" &&
      `${nid}` !== `${homeId}` &&
      `${nid}` !== `${this.mget(_a.hub_id)}`;
    const isRoot = isHubWindow && !inSubfolder;
    return {
      scopeNid: isRoot ? homeId : nid,
      isRoot: isRoot ? 1 : 0,
      destNid: homeId || nid,
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

  // "Organize → Link to task tracker" on one or more files: show the Task tab
  // and open a new task draft with those files already attached. Mirrors
  // openTaskDeepLink — showFolderTab returns early when the tab is already
  // active, so the scope has to be re-asserted for the mounted case.
  linkFilesToTask(nodes) {
    const files = (Array.isArray(nodes) ? nodes : [nodes]).filter(Boolean);
    if (!files.length) return;
    const mounted = this._taskPanelMounted;
    const shown = this.showFolderTab(_a.task);
    if (mounted) this.scopeTasksToFolder();
    return Promise.resolve(shown)
      .then(() => this._taskPanel || this.ensurePart("folder-task-panel"))
      .then((p) => {
        this._taskPanel = p;
        if (
          p &&
          !(p.isDestroyed && p.isDestroyed()) &&
          _.isFunction(p.openTaskWithFiles)
        ) {
          p.openTaskWithFiles(files);
        }
      });
  }

  // Deep link from a task mention/assignment notification on a window that is
  // ALREADY open: show the Task tab and open that task's detail. The mount-time
  // `open_task_id` (read in the tasks panel's initialize) only ever fires on a
  // fresh mount, so a panel that is already mounted has to be told directly.
  openTaskDeepLink(task_id) {
    const mounted = this._taskPanelMounted;
    // Not mounted yet → the panel picks the id up from the model as it mounts,
    // exactly like a freshly launched window does.
    if (task_id && !mounted) this.mset("open_task_id", task_id);
    const shown = this.showFolderTab(_a.task);
    // showFolderTab returns early when the Task tab is ALREADY the active one,
    // so the panel would keep the scope it was mounted with — the workspace
    // root, when the tab was first opened while this window sat at the root.
    // Re-assert the scope of the folder the window is on NOW. setScope is a
    // no-op when the scope is unchanged, so this costs nothing in the common
    // case (switching tabs already re-scopes via showFolderTab).
    if (mounted) this.scopeTasksToFolder();
    if (!task_id) return shown;
    return Promise.resolve(shown).then(() => {
      const p = this._taskPanel;
      if (p && !(p.isDestroyed && p.isDestroyed()) && _.isFunction(p.openTaskById)) {
        p.openTaskById(task_id);
      }
      // Consumed: a later remount of the panel (the Meeting view resets it)
      // must not reopen this task out of the blue.
      if (!mounted) this.mset("open_task_id", null);
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
    // Navigation invalidates every in-flight thread-list / hydrate response for
    // the folder we are leaving (shared generation with revoke/recovery).
    this._ftBumpThreadRequests();
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
    // super.updateTopbar → copyPropertiesFrom carries the destination node's
    // privilege into our model, so a subfolder that grants different rights
    // than its parent is already reflected there — re-read it for the button.
    this.syncNewCtrlVisibility();
  }

  showFolderTab(tab) {
    if (this.activeTab === tab) {
      this.syncNewCtrlVisibility();
      return;
    }
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
    // The list/grid view toggle lives in the Files filter row.
    const viewCtrl = this.getPart("view-ctrl");
    if (viewCtrl && viewCtrl.el) {
      viewCtrl.el.dataset.visible = tab === "files" ? "1" : "0";
    }
    // The merged "+ New" button also lives in that row and only operates on
    // Files (upload / create / gdrive-import) — hide it off the Files tab so it
    // can't be mistaken for a Chat/Task/Meeting action.
    this.syncNewCtrlVisibility();

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
              // Creating a task is an EDIT-tier action (task.create is
              // `src: write`), and the panel is a LetcBox with no privilege of
              // its own — so hand it this window's answer, the same
              // canUpload() the "+ New" gate uses. Only an explicit false
              // hides the add buttons, so any older/absent value stays as-is.
              may_write: !!(this.canUpload && this.canUpload()),
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

  /** A row of the address-book dropdown was clicked: put its address in the
   *  invite field and close the list. Sending stays a separate click. */
  pickFolderInviteContact(cmd) {
    const email = String(
      cmd?.mget?.(_a.email) || cmd?.el?.dataset?.email || "",
    ).trim();
    if (!email) return;
    require("libs/contact-lookup").fillEntry(
      this.getPart && this.getPart("invite-email"),
      email,
    );
    this._closeEmailLookup?.();
    this._setInviteError();
  }

  getFolderRoleOptions() {
    // Shared 4-level list (View → Chat → Edit → Admin) — same source the
    // settings panel and invite popup render from.
    const { roleItems } = require("builtins/skeleton/toolkit/permission");
    return roleItems;
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
    // it explicitly, so the dropdown dismisses on every pick and stays
    // reusable for the next change.
    //
    // Instantly, though — NOT changeState(0). That routes into ui-core's
    // _closeItems, which tweens the items by (items_width + trigger_width)
    // before _onClosed hides them; for a `down` menu the tween is negative y,
    // so the box visibly flies UP the screen and only then vanishes. Reported
    // as "box permission bị bay lên trên hơi khó hiểu" — and it is, because
    // the motion points away from the row the choice belongs to.
    //
    // _onClosed IS the end state that tween is animating towards: it flips the
    // dataset/state flags and gsap.set()s the transform back to 0. Calling it
    // directly lands there in one frame, and the menu stays reusable — same
    // final state, no journey. changeState remains the fallback in case a
    // future ui-core drops the hook.
    const menu = cmd.getParentByKind?.(KIND.menu.topic);
    if (_.isFunction(menu?._onClosed)) menu._onClosed();
    else if (_.isFunction(menu?.changeState)) menu.changeState(0);
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
      this._refeedFolderMembersPanel();
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
  // drag-drop, etc. live.
  //
  // Two kinds of chrome need different treatment, and both must be handled:
  //  - topbar buttons (Manage access, settings) are conditionally CREATED, so
  //    they cannot be CSS-toggled — the header is re-fed to rebuild them.
  //  - the tab-bar [+ New] button always exists and is CSS-toggled instead, and
  //    it is NOT inside the re-fed header — syncNewCtrlVisibility covers it.
  handleWsEvent(args = {}) {
    const { data, options } = args || {};
    const svc = options && options.service;
    // File-thread access lifecycle (see ./file-thread-access.js). Handled FIRST
    // and before super: the base handler removes the file from the grid, and
    // the thread must already be frozen by then — otherwise the window repaints
    // around a scope the viewer can no longer read.
    if (svc === "channel.file_thread_access_changed") {
      this.onFileThreadAccessChanged(data || {});
      // Fall through to super: this event carries no grid row, so the base
      // handler no-ops, but keeping the call preserves its bookkeeping.
    }
    if (svc === SERVICE.hub.set_privilege) {
      this._applyLivePrivilege(data || {});
    }
    // A member joined this workspace (invite redeemed via token, resolved on
    // signup, or granted directly by another admin). The permission matrix
    // reads hub_get_members_by_type, which only returns real permission rows —
    // so until the join lands there is no row to show, and nothing repaints it
    // once there is. Refetch instead of leaving the admin looking at a member
    // list missing the person they just invited. _refreshFolderMembers
    // self-guards on the panel being open, so this is a no-op when closed.
    else if (svc === "hub.member_joined") {
      this._onMemberJoined(data || {});
    }
    return super.handleWsEvent(args);
  }

  // Server-side handler: server-team/service/lib/notify-member-joined.js.
  // Broadcasts { hub_id, uid } to every online member of the hub (the joiner's
  // own sockets included — see _onMemberJoined's echo guard for why).
  _onMemberJoined(data = {}) {
    // The server cannot exclude our own sockets (entity_sockets' exclude arg
    // splices JSON straight into `s.id NOT IN (...)` and user_sockets returns
    // rows, not bare ids), so the joiner receives its own echo. Drop it here.
    // uid may be null for admin-driven multi-adds (invite_with_roles) — then
    // nobody is guarded, which is correct: the acting admin has the matrix open.
    if (data.uid && data.uid === Visitor.id) return;
    // Several folder windows can be open at once — only the one on this hub
    // refetches. Use actualNode() (what _refreshFolderMembers reads) rather
    // than mget(_a.hub_id), which differs for symlink/cross-hub nodes.
    const mine = this.actualNode() || {};
    if (data.hub_id && mine.hub_id && data.hub_id !== mine.hub_id) return;
    this._refreshFolderMembers();
  }

  _applyLivePrivilege(data = {}) {
    const { privilege, hub_id } = data;
    if (privilege == null) return;
    // A user may have several workspace windows open — only react to our own.
    if (hub_id && hub_id !== this.mget(_a.hub_id)) return;
    // A repeated payload should not rebuild the topbar, but it can still repair
    // derived chrome left stale by an earlier lifecycle transition.
    if (Number(this.mget(_a.privilege)) === Number(privilege)) {
      this.syncNewCtrlVisibility();
      return;
    }
    this.mset(_a.privilege, Number(privilege));
    // Re-feed the header (not the topbar container) so the header element and
    // its drag/raise wiring survive; only the topbar child rebuilds with the
    // new privilege. The re-feed recreates the breadcrumb part, so repopulate.
    //
    // Feeding the header spawns children that bubble up through onChildBubble,
    // which raises this window (window/core: triggerMethod('change:radio')).
    // That is right for a click, but here the user did not touch anything — an
    // admin did, elsewhere — and stealing focus would bury whatever they have
    // open on top of this workspace, e.g. a document they are editing. Suppress
    // the raise for the duration of the re-feed instead.
    this._suppressRaise = 1;
    this.feedPart("folder-header", require("./skeleton/topbar")(this))
      .catch(() => { })
      .then(() => { this._suppressRaise = 0; });
    this.refreshBreadcrumbsUI();
    this._syncChatGate();
    // Losing chat access with a thread already open leaves its conversation
    // mounted behind the gate — tear it down (feed [] unbinds the widget's WS,
    // so no new messages arrive either) and drop the rail's cached rows so a
    // re-render cannot repaint the thread list from memory.
    if (!this._privilegeGrantsChat(this.mget(_a.privilege))) {
      this._closeFileThreadPanel();
      this._threadRailItems = [];
      this._populateThreadRail();
    }
    // The [+ New] button lives on the tab bar, NOT in the topbar re-fed above,
    // so the re-feed does not reach it. Sync it explicitly, or an admin's
    // demotion leaves a working create/upload menu on a view-only member's
    // screen (and a promotion leaves them without one until they reopen).
    this.syncNewCtrlVisibility();
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
    //
    // The thread rail and the file-thread side panel are SIBLINGS of the chat
    // panel in the Chat-tab grid (their own columns), not descendants — gating
    // only .window__chat-panel left a downgraded member able to read the file
    // thread list and, on opening one, its whole conversation. Flag all three.
    this.$el
      .find(
        ".window__chat-panel, .window__file-thread-panel, .window__thread-rail",
      )
      .attr("data-chat_gated", gated);
  }

  // Gate the merged "+ New" button (upload / create / gdrive-import) on BOTH
  // the active tab and the viewer's current write permission.
  //
  // The Files filter row renders before the window knows its privilege, and a
  // build-time gate cannot react to later role or navigation changes. Every
  // source of truth for "may this viewer create things here?" therefore
  // converges on this runtime read of mget(privilege):
  //   - open             → onPartReady("new-ctrl")
  //   - opened w/o a priv → _healChatPrivilege, once the real value resolves
  //   - tab switch       → showFolderTab
  //   - model priv change → initialize's change:privilege listener
  //   - live role change → _applyLivePrivilege (admin changed our role)
  //   - walk in          → updateTopbar (a subfolder may grant other rights)
  //   - walk back        → _restoreNavState (so may an ancestor)
  //
  // Off the Files tab it hides regardless of permission: the actions only apply
  // to files, so showing it on Chat/Task/Meeting would misrepresent what it does.
  syncNewCtrlVisibility() {
    const newCtrl = this.getPart && this.getPart("new-ctrl");
    if (!newCtrl || !newCtrl.el) return;
    const onFiles = (this.activeTab || "files") === "files";
    // canUpload() returns the masked bitmask (truthy number), not a boolean.
    // Over-limit read-only trumps the node privilege: creating adds bytes,
    // and the REST clamp refuses it regardless of what this node allows.
    const mayCreate = !!(this.canUpload && this.canUpload())
      && !require("libs/over-limit").isLocked();
    const visible = onFiles && mayCreate ? 1 : 0;

    // ui-core registers sys_pn parts during onBeforeRender, before its onRender
    // reapplies the skeleton's original dataset. Persist the derived value on
    // the part model as well as the element, otherwise first mount is reset to
    // the safe skeleton default (0) immediately after this callback returns.
    const dataset = (newCtrl.mget && newCtrl.mget(_a.dataset)) || {};
    if (newCtrl.mset) {
      newCtrl.mset(_a.dataset, { ...dataset, visible });
    }
    newCtrl.el.dataset.visible = `${visible}`;
  }

  // Resolve the viewer's real privilege for this node when the window opened
  // without one (see buildContent), then re-sync the chat gate. Uses the same
  // read-only node-attributes fetch the desk reveal path uses
  // (media.attributes → mfs_access_node → user_permission(this.uid, node)); it
  // returns THIS viewer's own privilege only, so it can never elevate access —
  // a view-only member still resolves a non-chat privilege and stays gated.
  async _healChatPrivilege() {
    const nid = this.mget(_a.nid);
    const hub_id = this.mget(_a.hub_id);
    if (nid == null || `${nid}` === "" || `${nid}` === "0") return;
    try {
      const node = await this.fetchService(
        { service: SERVICE.media.attributes, nid, hub_id },
        { async: 1 },
      );
      // Apply only if a real bitmask came back AND privilege is still unset
      // (don't clobber a value a live set_privilege may have set meanwhile).
      if (node && node.privilege != null && this.mget(_a.privilege) == null) {
        this.mset(_a.privilege, Number(node.privilege));
        this.ensurePart("folder-view").then(() => this._syncChatGate());
        // The [+ New] button reads the same privilege — a window that opened
        // without one renders it hidden, so re-resolve once the real value
        // lands or a full member would be left with no way to create anything.
        this.ensurePart("new-ctrl").then(() => this.syncNewCtrlVisibility());
      }
    } catch (e) {
      if (this.warn) this.warn("[folder] chat-privilege heal failed", e && e.message);
    }
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
    // Default matches the invite row's displayed default role (Edit).
    const privilege = this._folderInviteRole?.privilege || _K.privilege.write;

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
      // Optimistic local removal: hub.get_members_by_type returns stale data
      // on immediate read-after-write (see set_privilege above), so splicing B
      // out of the cached list and re-rendering from local state is both
      // faster and correct — a refetch right after the POST would still see B.
      this._folderMembers = (this._folderMembers || []).filter(
        (r) =>
          String(r.entity_id || r.drumate_id || r.id || "") !==
          String(memberId),
      );
      this._refeedFolderMembersPanel();
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

  // Re-render the Folder settings matrix from this._folderMembers WITHOUT a
  // server refetch. Used after optimistic local mutations (role change, member
  // removal) where hub.get_members_by_type would return stale read-after-write
  // data. Mirrors the close-button wiring from switchShowFolderSettings: an
  // in-place feed destroys the old panel child, which would trip its
  // once(_e.destroy) handler and flip isShowSettings off — detach it first,
  // then re-attach an identical handler to the freshly mounted child.
  _refeedFolderMembersPanel() {
    if (!this.dialogWrapper) return;
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
    // Typing in the invite field also searches the address book by email —
    // matches land in the "invite-suggestions" part (libs/contact-lookup).
    // Installs once; the listeners are delegated from the window root, so
    // they survive the panel being re-fed on every member refresh.
    require("libs/contact-lookup").attachEmailLookup(this, {
      entryClass: `${this.fig.family}__settings-action-invite-entry`,
      listPart: "invite-suggestions",
      service: "folder-pick-invite-contact",
      itemClass: `${this.fig.family}__settings-action-invite-suggestion`,
    });
    // Reset invite role to default (Edit) on every open — otherwise a prior
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

// Rich meeting-description editor methods (@-mention, /-file, inline images).
Object.assign(__window_folder.prototype, require("./meeting-desc-editor"));

// File-thread access revocation / recovery lifecycle (proactive freeze, single
// revocation notice, idempotent teardown back to # General, recovery refresh).
Object.assign(__window_folder.prototype, require("./file-thread-access"));

module.exports = __window_folder;
