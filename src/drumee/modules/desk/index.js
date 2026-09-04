require("welcome/skin");
require("builtins/window/confirm/skin");
const { canUpgradePlan, needsAdminConsoleUpgrade } = require("libs/billing");
const billingDeepLink = require("libs/billing-deep-link");
const {
  captureUtm, campaignArrival, REWARD_CAMPAIGN, PROMO_CAMPAIGN,
} = require("libs/campaign");
const hubDeepLink = require("libs/hub-deep-link");
// "Open this file once I am signed in" — a Designation link opened by a visitor
// with no session. Armed at module scope in index.web.js, consumed below.
const fileDeepLink = require("libs/file-deep-link");
const { openSupportMail } = require("libs/support");

// Widgets that own a modal or panel Escape should close BEFORE the window that
// hosts it. Opt-in: each implements onEscape() and returns true when it consumed
// the press. See _closeEscapeModal for why this is an explicit list.
const ESCAPE_MODAL_KINDS = ["tasks_panel"];

/**
 * How long the billing chunk may take before a loader is worth showing, in ms.
 *
 * The chunk is ~280KB on a cold open and cached on every open after that, so
 * the usual case resolves in a few milliseconds. Raising a spinner for that
 * produces a flash — a window that appears and disappears inside a frame or
 * two, which reads as a glitch rather than as progress and is worse than the
 * honest nothing it replaced.
 *
 * 220ms is under the ~250ms at which a delay starts being felt as a wait, so a
 * connection fast enough to beat it never sees the loader and never needed one;
 * anything slower gets told something is happening. See _showBillingLoader.
 */
const DESK_BILLING_LOADER_DELAY = 220;

// The Inbox is a FULL-CANVAS screen in the new shell (Figma 43:32209): it
// occupies the whole centre column — a 400px conversation list beside the
// active chat — exactly like Settings / Calendar / Get help, and unlike the
// narrow right-hand slide-out it used to be. So it mounts in the same slot
// they share, which also gives it their mutual exclusion for free.
const folderIcon = require("media/grid/template/folder");

const INBOX_SLOT = "settings-main-slot";

class desk_module extends LetcBox {
  constructor(...args) {
    super(...args);
    this._updateAddmenu = this._updateAddmenu.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.mediaDragLeaveAvatar = this.mediaDragLeaveAvatar.bind(this);
    this.mediaDragOverAvatar = this.mediaDragOverAvatar.bind(this);
    this.mediaDragDropOnAvatar = this.mediaDragDropOnAvatar.bind(this);
    this._dragOver = this._dragOver.bind(this);
    this._upload = this._upload.bind(this);
    this._dragLeave = this._dragLeave.bind(this);
    this.route = this.route.bind(this);
    this.loadDefault = this.loadDefault.bind(this);
    this.onChildBubble = this.onChildBubble.bind(this);
    this.checkIntro = this.checkIntro.bind(this);
    this.dmzCopyMedia = this.dmzCopyMedia.bind(this);
    this.checkUserOnBoarding = this.checkUserOnBoarding.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.acknowledge = this.acknowledge.bind(this);
    this._openTab = this._openTab.bind(this);
    this.dmzDetailResponse = this.dmzDetailResponse.bind(this);
    this.disconnectShared = this.disconnectShared.bind(this);
    this.setModuleState = this.setModuleState.bind(this);
    this.lazyClasses = this.lazyClasses.bind(this);
    this._updateActivityBadge = this._updateActivityBadge.bind(this);
  }

  static initClass() {
    require("./skin");
    this.prototype.behaviorSet = { bhv_socket: 1 };
    this.prototype.events = { drop: "_upload" };
  }

  /**
   *
   */
  initialize(opt) {
    window.Desk = this;
    super.initialize(opt);
    localStorage.iconType = localStorage.iconType || _a.vignette;

    this._uid = Visitor.id;

    this.sbMeasures = {
      resizeIcon: 0,
    };
    this.declareHandlers();
    this._updateAvatar = this._updateAvatar.bind(this);

    RADIO_BROADCAST.on("avatar-changed", this._updateAvatar);
    Visitor.on(_e.change, this._updateAvatar);
    // Contextual tutorial tours. The trigger surfaces are spread across the
    // desk, the window manager, the sidebar workspace list and (later) the
    // folder window, none of which share a part tree with the overlay the tour
    // mounts into — so they raise one broadcast and the desk is the only
    // listener. Same shape as the over-limit channel above.
    this._onTourTrigger = this._onTourTrigger.bind(this);
    RADIO_BROADCAST.on(require("libs/tutorial-tours").CHANNEL, this._onTourTrigger);
    RADIO_BROADCAST.on("activity-update", this._updateActivityBadge, this);
    // Ctrl/Cmd+Shift+F → search. Registered here, not at bootstrap, so the
    // capture listener only exists while a desk is alive — both of its targets
    // (the topbar file search and a chat window's message search) are desk-only,
    // and a DMZ/share session gets no global key handler at all. Released in
    // onDestroy.
    const hotkeys = require("libs/hotkeys");
    this._searchHotkey = hotkeys.register({
      name: "desk-search",
      match: (e) => hotkeys.isCmdShift(e, "f"),
      run: (e) => this._focusSearch(e),
    });
    // Escape dismisses transient UI. BUBBLE phase, so it yields to every widget
    // that already answers Escape nearer the user — the share popup, file
    // rename, and the mention dropdowns all preventDefault on keydown, and
    // `defaultPrevented` tells us they claimed it. `inTextEntry` yields to the
    // other family, which answers on KEYUP where defaultPrevented cannot reach:
    // ui-core's Entry (`_e.cancel` / `removeOnEscape`, e.g. the inline rename),
    // menu-input, and the chat/task mention popups.
    this._escHotkey = hotkeys.register({
      name: "desk-escape",
      phase: "bubble",
      match: (e) =>
        e.key === "Escape" && !e.defaultPrevented && !hotkeys.inTextEntry(e.target),
      run: () => this._onEscape(),
    });
    // Cross-plugin / cross-module billing entry (admin-console upsell, Wm) →
    // open the full-page billing screen without a direct module reference.
    // `arg` (plan/cycle/tab preselect) rides through untouched — the
    // upgrade-nudge popup uses it to land on the tier it was selling.
    this._openBillingPage = (arg) => this.openBillingPage(arg);
    RADIO_BROADCAST.on("desk:open-billing-page", this._openBillingPage);
    // Downgrade over-limit (libs/over-limit): the popup and banner raise
    // these instead of reaching into the desk. open-admin-console reuses the
    // exact toggle-apps shim the promo's post-claim reload uses.
    // `arg.tab` lets a caller land on a specific console tab — the storage
    // overage sends people straight to Storage, where the per-workspace
    // cleanup lives, instead of dropping them on Member to hunt for it.
    this._openAdminConsole = (arg) => this._toggleAppsShim(arg?.tab);
    this._openOverLimitPopupBound = () => this._openOverLimitPopup();
    // Storage is resolved on the desk itself, so the popup needs somewhere to
    // send people: Home to delete, Trash to empty. Same shim shape as the
    // console — the popup is portalled to <body> and must not reach in here.
    this._openTrashPanel = () => this._deskServiceShim("toggle-trash");
    this._openHomeFromPopup = () => this._deskServiceShim(_e.home);
    this._onOverLimitChanged = this._onOverLimitChanged.bind(this);
    // The user clicked the docked call to come back to it: take down whatever
    // screen was covering the desk so the restored, full-size window is not
    // parked behind it (window/meeting _leaveCallTile).
    this._onCallReturned = () => this.closeAllPanels();
    RADIO_BROADCAST.on("call:returned", this._onCallReturned);
    RADIO_BROADCAST.on("desk:open-admin-console", this._openAdminConsole);
    RADIO_BROADCAST.on("desk:open-trash", this._openTrashPanel);
    RADIO_BROADCAST.on("desk:open-home", this._openHomeFromPopup);
    RADIO_BROADCAST.on("desk:open-over-limit-popup", this._openOverLimitPopupBound);
    RADIO_BROADCAST.on(require("libs/over-limit").CHANGED, this._onOverLimitChanged);
    // The topbar action cluster (Add new / Upload / Search / Invite) is
    // hidden while the admin console or Settings page is up (state 0, set in
    // _showPanel) and restored by loadHome/togglePanel — but OPENING A
    // WORKSPACE from one of those pages goes through the window manager and
    // touched neither, leaving the topbar dead over a file view (reported
    // 2026-07-29: "top bar của workspace bị freeze"). The wm broadcasts
    // workspace:focus whenever a hub window opens or takes focus — restore
    // the cluster on it.
    this._restoreTopbarActions = () => {
      this.ensurePart("action-cluster").then((p) => p && p.setState(1));
    };
    RADIO_BROADCAST.on("workspace:focus", this._restoreTopbarActions);

    // A WORKSPACE WAS CREATED — resync the topbar switcher.
    //
    // Both create surfaces already announce this: the desk's own dialog
    // (builtins/media/form, `.form-folder__main`) and the post-signup tour's
    // live create screen (desk/tutorial/workspace, `.tutorial-workspace__wsd-dialog`)
    // both go through libs/create-workspace, which fires `workspace:refresh`
    // with the new workspace on every one of its three types. The signal was
    // there; the desk simply never subscribed, so `.desk-module-topbar__ws-menu`
    // kept listing whatever existed at boot and a workspace you had just made
    // was missing from the only global way to switch to one.
    //
    // Subscribed HERE rather than in either dialog, and that is the point: the
    // switcher belongs to the desk, neither form has any business reaching into
    // the topbar, and a third create surface gets this for free.
    //
    // The sidebar (desk/workspace-list) already listened, which is why the row
    // appeared THERE and made the switcher look selectively broken.
    this._onWorkspaceCreated = this._onWorkspaceCreated.bind(this);
    RADIO_BROADCAST.on("workspace:refresh", this._onWorkspaceCreated);
    setTimeout(this.lazyClasses, 5000);

    // Chrome-style folder tabs in the desk topbar. One tab per open
    // folder window — added on launch, removed on destroy. Minimize
    // toggles a visual `minimized` flag on the tab but doesn't remove it.
    // Click the tab body to focus/restore; click × to destroy.
    this._openFolders = new Map();
    this._onFolderOpen = this._onFolderOpen.bind(this);
    this._onFolderClose = this._onFolderClose.bind(this);
    this._onWmMinimize = this._onWmMinimize.bind(this);
    this._onWmWake = this._onWmWake.bind(this);
    // Headless workspace panes (full-screen window tabs opened from the
    // sidebar) hide the home-section topbar while they're open. Tracked by
    // cid so switching between two panes never momentarily restores the bar.
    this._openWorkspaces = new Set();
    this._onWorkspaceOpen = this._onWorkspaceOpen.bind(this);
    this._onWorkspaceClose = this._onWorkspaceClose.bind(this);
    // A zoomed folder window claims the desk body the same way a sidebar
    // workspace pane does — including the header row.
    this._onFolderZoom = this._onFolderZoom.bind(this);
    this._bindFolderTabs();
    this._onWorkspaceWsEvent = this._onWorkspaceWsEvent.bind(this);
    this._bindWorkspaceWsSync();

    // [Reload] Persist desk UI (sidebar screen + workspace + floating
    // folder windows) so a browser reload lands back where the user was.
    // Written on pagehide — the one hook that reliably fires right before
    // a reload. See _restoreDeskState, called from loadDefault.
    this._persistDeskState = this._persistDeskState.bind(this);
    window.addEventListener("pagehide", this._persistDeskState);
  }

  /**
   * Keep the topbar switcher honest about REMOVALS (and renames).
   *
   * `workspace:refresh` covers creation, but nothing broadcasts it when a
   * workspace goes away, so a deleted one sat in
   * `.desk-module-topbar__ws-menu` until a reload — reported as "some items
   * have been removed but still display".
   *
   * The signal that does exist is Wm's `ws:event`. Wm emits it for remote
   * changes from the websocket dispatcher AND echoes it locally the moment a
   * delete is confirmed (see the delete_hub flow in desk/wm), so one
   * subscription covers both "I deleted it" and "someone else did". The
   * sidebar workspace list has listened to it all along, which is exactly why
   * removals corrected THERE and not here.
   *
   * Same wait-for-Wm shape as _bindFolderTabs below: this runs from initialize,
   * which is before window/manager.js assigns the global.
   */
  _bindWorkspaceWsSync() {
    if (this._workspaceWsBound) return;
    if (!window.Wm || !_.isFunction(Wm.on)) {
      _.delay(() => this._bindWorkspaceWsSync(), 100);
      return;
    }
    Wm.on("ws:event", this._onWorkspaceWsEvent);
    this._workspaceWsBound = 1;
  }

  /**
   * One `ws:event`. Resync the switcher if — and only if — it was about a
   * workspace.
   *
   * A FULL FORCED RE-RENDER, not the surgical add/remove/rename the sidebar
   * does. The two lists are not alike: the sidebar's rows own expandable file
   * trees and a selection highlight, so it has to patch in place, while this
   * menu is a flat list rebuilt from scratch every time anyway. Mirroring three
   * delta paths here would be three more things to keep in step with the
   * sidebar for no gain.
   *
   * THE `media.*` GATE IS THE POINT OF THIS FUNCTION. Those services fire for
   * EVERY node — every file created, renamed or deleted inside any workspace —
   * so resyncing on all of them would put a `desk.home` request behind ordinary
   * file activity. Only two media shapes are workspace rows: a hub, and a
   * FOLDER SITTING AT THE HOME ROOT (that is what a Personal workspace is).
   * Same test, and same reason, as the sidebar's handleWsEvent.
   */
  /**
   * Does this websocket payload name a workspace the switcher is showing?
   *
   * WHY THIS EXISTS. A trash broadcast carries almost nothing. The server sends
   * it with `keys: [Attr.nid, Attr.hub_id]` (service/private/media.js `trash`),
   * so `filetype` and `pid` — the two fields the gate above would rather use —
   * are simply not in the payload. Judged on those alone, trashing a workspace
   * looks exactly like deleting a file, and the switcher kept showing the
   * workspace: the reported bug.
   *
   * `nid` IS always there, and it is enough, because the cache already holds
   * the rows on screen. If the removed node is one of them, it is a workspace
   * by definition — no request needed to decide, and no guessing.
   *
   * MATCHED ON `nid`, NEVER ON `hub_id`. For a hub row the two are the same
   * value, so nothing is lost; for a PERSONAL workspace row `hub_id` is the
   * user's own id, shared by every personal row and by every file in the user's
   * home — matching on it would resync on ordinary file activity, which is the
   * exact cost the gate exists to avoid.
   */
  _namesAWorkspace(d) {
    const rows = this._workspaces;
    if (!d || !rows || !rows.length) return false;
    // `nid` can arrive as a scalar (the broadcast) or as a list of
    // {nid, hub_id} (the request shape) — accept both rather than trusting one.
    const raw = _.isArray(d.nid) ? d.nid : [d.nid, d.id, d.node_id];
    const ids = raw
      .map((v) => (v && v.nid != null ? v.nid : v))
      .filter((v) => v != null && v !== "")
      .map((v) => `${v}`);
    if (!ids.length) return false;
    return rows.some((r) => {
      if (!r) return false;
      if (r.nid != null && ids.includes(`${r.nid}`)) return true;
      return r.id != null && ids.includes(`${r.id}`);
    });
  }

  _onWorkspaceWsEvent(args = {}) {
    const { data, options } = args || {};
    const service = (options && options.service) || "";
    if (!service) return;

    // Adds, removes and renames all change what this menu should show.
    // `hub.invite_received` is an ADD from the other direction — someone put
    // the user in a workspace — and the sidebar full-refreshes on it too.
    //
    // TRASHING ARRIVES AS `media.remove`, not as `media.trash`. The context
    // menu's "Move to trash" row and the switcher ⋯ menu's Delete both end at
    // media/core `trash()` → `putIntoTrash` → `SERVICE.media.trash`, but the
    // server answers that request by BROADCASTING `media.remove`
    // (service/private/media.js `trash()`), so that is the name that reaches a
    // client. `media.trash` is deliberately absent from this list: it is the
    // request name and never appears on the wire.
    if (
      !/^(hub\.(delete_hub|update_name|add_contributors|invite_received)|desk\.(create_hub|leave_hub)|media\.(new|remove|rename))$/.test(
        service,
      )
    ) {
      return;
    }

    if (/^media\./.test(service)) {
      const d = data || {};
      const filetype = args.filetype || d.filetype;
      // Not a hub, and the payload does not name a row this menu is showing →
      // fall back to "is it a folder at the home root", which is what a
      // Personal workspace is. A file or a nested folder fails all three.
      if (filetype !== _a.hub && !this._namesAWorkspace(d)) {
        const pid = `${d.pid || d.parent_id || ""}`;
        const homeId = `${Visitor.get(_a.home_id) || ""}`;
        if (!pid || !homeId || pid !== homeId) return;
      }
    }

    // Coalesced. Deleting a workspace emits more than one of these (the local
    // echo, then the server's), and each would otherwise cost its own
    // cache-busted request.
    if (this._wsSyncTimer) clearTimeout(this._wsSyncTimer);
    this._wsSyncTimer = setTimeout(() => {
      this._wsSyncTimer = null;
      this._onWorkspaceCreated();
    }, 250);
  }

  _bindFolderTabs() {
    if (this._folderTabsBound) return;
    if (!window.Wm || !Wm.$el) {
      _.delay(() => this._bindFolderTabs(), 100);
      return;
    }
    Wm.$el.on("folder:open", this._onFolderOpen);
    Wm.$el.on("folder:close", this._onFolderClose);
    Wm.$el.on("workspace:open", this._onWorkspaceOpen);
    Wm.$el.on("workspace:close", this._onWorkspaceClose);
    Wm.$el.on("folder:zoom", this._onFolderZoom);
    Wm.$el.on(_e.minimize, this._onWmMinimize);
    Wm.$el.on(_e.wake, this._onWmWake);
    this._folderTabsBound = true;
  }

  _onFolderOpen(event, winInstance) {
    if (!winInstance || !winInstance.isFolder) return;
    if (this._openFolders.has(winInstance.cid)) return;
    this._openFolders.set(winInstance.cid, {
      win: winInstance,
      minimized: !!winInstance.mget(_a.minimize),
    });
    // A folder opened from a notification (or any deep-link) launches before its
    // real name is known — the window resolves its title asynchronously
    // (get_path → change:hub_name/filename → _syncWindowTitle). Re-render the tab
    // when that lands so it stops showing the generic LOCALE.FOLDER fallback.
    // listenTo is auto-scoped to this view + released in _onFolderClose.
    if (winInstance.model) {
      this.listenTo(
        winInstance.model,
        "change:filename change:hub_name change:name",
        this._renderFolderTabs,
      );
    }
    this._renderFolderTabs();
  }

  _onFolderClose(event, winInstance) {
    if (!winInstance) return;
    if (winInstance.model) this.stopListening(winInstance.model);
    if (this._openFolders.delete(winInstance.cid)) {
      this._renderFolderTabs();
    }
  }

  _onWorkspaceOpen(event, winInstance) {
    if (!winInstance) return;
    this._openWorkspaces.add(winInstance.cid);
    // The headless pane gets a tab too: every open window (workspace pane or
    // popup) must stay reachable once another window covers it, and the tab
    // strip is the only switch affordance while the pane hides the home topbar.
    if (!this._openFolders.has(winInstance.cid)) {
      this._openFolders.set(winInstance.cid, {
        win: winInstance,
        minimized: !!winInstance.mget(_a.minimize),
      });
      if (winInstance.model) {
        this.listenTo(
          winInstance.model,
          "change:filename change:hub_name change:name",
          this._renderFolderTabs,
        );
      }
    }
    this._renderFolderTabs();
  }

  _onWorkspaceClose(event, winInstance) {
    if (!winInstance) return;
    if (winInstance.model) this.stopListening(winInstance.model);
    if (this._openFolders.delete(winInstance.cid)) {
      this._renderFolderTabs();
    }
    if (this._openWorkspaces.delete(winInstance.cid)) {
      this._syncWorkspaceTopbar();
    }
  }

  _onFolderZoom() {
    this._syncWorkspaceTopbar();
  }

  /**
   * Read live off the windows instead of a tracked Set: zoom state also flips
   * on tile/reframe/destroy, and a stale entry would strand the header hidden.
   * Minimized windows don't count — they're not on screen.
   */
  _hasZoomedFolder() {
    for (const entry of this._openFolders.values()) {
      const win = entry && entry.win;
      if (!win || (win.isDestroyed && win.isDestroyed())) continue;
      if (entry.minimized || win.mget(_a.minimize)) continue;
      if (win.mget(_a.headless)) continue;
      if (win._zoomed) return true;
    }
    return false;
  }

  // The home-section topbar is only meaningful on the home grid. A headless
  // workspace pane fills the desk body and brings its own window topbar, so
  // hide the home topbar while any workspace pane is open and restore it once
  // the last one closes (back to home). A zoomed folder window (the home-grid
  // route opens a floating window, not a pane) fills the same area and gets
  // the same treatment. With more than one window open the bar comes back in
  // strip-only mode (data-tabstrip): every non-active window is fully covered
  // by the active one, so the tab strip is the only way to reach it —
  // breadcrumb/actions stay hidden (the pane has its own).
  _syncWorkspaceTopbar() {
    const part = this.getPart("top-bar");
    if (!part || !part.el) return;
    // The desk topbar now ALWAYS stays up.
    //
    // It used to hide behind an open workspace because the pane rendered its
    // own window topbar, making the desk one a duplicate. In the new shell
    // (Figma 43:23955) the pane has no chrome — skeleton/index.js drops the
    // header for a headless pane — so this bar IS the workspace's header, and
    // hiding it left the screen with no header at all AND no way to switch
    // workspace, since the switcher lives in it.
    //
    // A ZOOMED floating folder window is a different case: it is still a real
    // window with its own titlebar, so it keeps the old treatment.
    if (this._hasZoomedFolder()) {
      part.el.dataset.headless = "1";
    } else {
      delete part.el.dataset.headless;
    }
    if (this._openFolders.size > 1) {
      part.el.dataset.tabstrip = "1";
    } else {
      delete part.el.dataset.tabstrip;
    }
    // Zoomed windows are inline-pixel geometry, so they must re-fit whenever
    // the header resizes the container. Fire only on an actual change — this
    // runs on every tab render.
    const state = `${part.el.dataset.headless || ""}|${part.el.dataset.tabstrip || ""}`;
    if (state !== this._topbarChromeState) {
      this._topbarChromeState = state;
      if (window.Wm && Wm.$el) Wm.$el.trigger("desk:chrome");
    }
  }

  _onWmMinimize(event, winInstance) {
    if (!winInstance || !winInstance.isFolder) return;
    const entry = this._openFolders.get(winInstance.cid);
    if (!entry) return;
    entry.minimized = true;
    this._renderFolderTabs();
  }

  _onWmWake(event, winInstance) {
    if (!winInstance || !winInstance.isFolder) return;
    const entry = this._openFolders.get(winInstance.cid);
    if (!entry) return;
    entry.minimized = false;
    this._renderFolderTabs();
  }

  /**
   * DEPRECATED — the desk topbar's window-tab strip.
   *
   * The new shell (Figma 43:23955) has no window-tab model: a workspace fills
   * the canvas and subfolders navigate inside it, so there is nothing for a
   * per-window tab to represent. The strip is hidden in the skin
   * (__folder-tabs, display:none) and workspace tiles no longer open windows
   * at all (desk/wm openContent -> loadWorkspace).
   *
   * Kept, not deleted: "Open in Window" and share/player parents still launch
   * real floating windows, and this is the only affordance that reaches one
   * once it is covered. Remove it when that path goes too.
   */
  _renderFolderTabs() {
    // Tab-count changes flip the strip-only topbar on/off (see
    // _syncWorkspaceTopbar). Sync here so the popup open/close path
    // (folder:open / folder:close) updates it too, not just workspace events.
    this._syncWorkspaceTopbar();
    if (!this._folderTabsBox || (this._folderTabsBox.isDestroyed && this._folderTabsBox.isDestroyed())) {
      return;
    }
    const pfx = `${this.fig.family}-topbar`;
    const tabs = [];
    for (const entry of this._openFolders.values()) {
      const win = entry && entry.win;
      if (!win || (win.isDestroyed && win.isDestroyed())) continue;
      tabs.push(this._buildFolderTab(win, entry.minimized, pfx));
    }
    this._folderTabsBox.feed(tabs);
  }

  _buildFolderTab(winInstance, minimized, pfx) {
    const cn = `${pfx}__folder-tab`;
    // Mirror the window's own title resolution (_syncWindowTitle uses
    // filename || hub_name) so an empty-filename workspace root shows its
    // workspace name here too, instead of the generic LOCALE.FOLDER fallback.
    const name =
      winInstance.mget(_a.filename) ||
      winInstance.mget(_a.name) ||
      winInstance.mget("hub_name") ||
      LOCALE.FOLDER ||
      "Folder";
    const area = winInstance.mget(_a.area);
    const dataset = { state: minimized ? 0 : 1 };
    if (area) dataset.area = area;
    // Note: do NOT use `kidsOpt: { active: 0 }` here — _.merge(kid, kidsOpt)
    // overrides each child's own props, which would zero out the close
    // button's `active: 1` and silently drop its click handler. Set
    // `active: 0` directly on the icon + label instead so the close
    // button stays interactive.
    return Skeletons.Box.X({
      className: cn,
      uiHandler: [this],
      service: "focus-folder-tab",
      wincid: winInstance.cid,
      dataset,
      kids: [
        Skeletons.Button.Svg({
          ico: "folder-header",
          active: 0,
          className: `${cn}-icon`,
          dataset: area ? { area } : undefined,
        }),
        Skeletons.Note({
          content: name,
          active: 0,
          className: `${cn}-label`,
        }),
        Skeletons.Button.Svg({
          ico: "cross",
          className: `${cn}-close`,
          service: "close-folder-tab",
          uiHandler: [this],
          wincid: winInstance.cid,
          bubble: 0,
        }),
      ],
    });
  }

  /**
   *
   */
  onDestroy() {
    if (this._usageTimer) {
      clearInterval(this._usageTimer);
      this._usageTimer = null;
    }
    window.removeEventListener("pagehide", this._persistDeskState);
    if (this._restoreClearTimer) {
      clearTimeout(this._restoreClearTimer);
      this._restoreClearTimer = null;
    }
    RADIO_BROADCAST.off("desk:open-billing-page", this._openBillingPage);
    RADIO_BROADCAST.off("call:returned", this._onCallReturned);
    RADIO_BROADCAST.off("desk:open-admin-console", this._openAdminConsole);
    RADIO_BROADCAST.off("desk:open-trash", this._openTrashPanel);
    RADIO_BROADCAST.off("desk:open-home", this._openHomeFromPopup);
    RADIO_BROADCAST.off("desk:open-over-limit-popup", this._openOverLimitPopupBound);
    RADIO_BROADCAST.off(require("libs/over-limit").CHANGED, this._onOverLimitChanged);
    RADIO_BROADCAST.off("avatar-changed", this._updateAvatar);
    RADIO_BROADCAST.off("workspace:refresh", this._onWorkspaceCreated);
    // A pending "open the workspace once the access panel closes" listener
    // lives on Wm's collection, which outlives this desk — leaving it attached
    // would fire a loadWorkspace into a destroyed desk on the next dialog that
    // empties that wrapper.
    if (this._onAccessPanelClosed && window.Wm && _.isFunction(Wm.getPart)) {
      const wrap = Wm.getPart("wrapper-modal");
      if (wrap && wrap.collection) {
        wrap.collection.off("update reset", this._onAccessPanelClosed);
      }
      this._onAccessPanelClosed = null;
      this._awaitingAccessClose = 0;
    }
    if (this._accessPanelTimer) {
      clearTimeout(this._accessPanelTimer);
      this._accessPanelTimer = null;
    }
    if (this._wsSyncTimer) {
      clearTimeout(this._wsSyncTimer);
      this._wsSyncTimer = null;
    }
    if (this._workspaceWsBound && window.Wm && _.isFunction(Wm.off)) {
      Wm.off("ws:event", this._onWorkspaceWsEvent);
      this._workspaceWsBound = 0;
    }
    RADIO_BROADCAST.off(require("libs/tutorial-tours").CHANNEL, this._onTourTrigger);
    Visitor.off(_e.change, this._updateAvatar);
    if (this._searchHotkey || this._escHotkey) {
      const hk = require("libs/hotkeys");
      if (this._searchHotkey) hk.unregister(this._searchHotkey);
      if (this._escHotkey) hk.unregister(this._escHotkey);
      this._searchHotkey = null;
      this._escHotkey = null;
    }
    if (this._searchInputEl && this._searchInputHandler) {
      this._searchInputEl.removeEventListener(
        "input",
        this._searchInputHandler,
      );
    }
    if (this._searchBoxInner?.el && this._searchFocusHandler) {
      this._searchBoxInner.el.removeEventListener(
        "focusin",
        this._searchFocusHandler,
      );
    }
    RADIO_BROADCAST.off("activity-update", this._updateActivityBadge, this);
    RADIO_BROADCAST.off("breadcrumb:content", this._updateAddmenu);
    if (this._folderTabsBound && window.Wm && Wm.$el) {
      Wm.$el.off("folder:open", this._onFolderOpen);
      Wm.$el.off("folder:close", this._onFolderClose);
      Wm.$el.off("workspace:open", this._onWorkspaceOpen);
      Wm.$el.off("workspace:close", this._onWorkspaceClose);
      Wm.$el.off("folder:zoom", this._onFolderZoom);
      Wm.$el.off(_e.minimize, this._onWmMinimize);
      Wm.$el.off(_e.wake, this._onWmWake);
      this._folderTabsBound = false;
    }
  }

  /**
   *
   */
  async loadDefault() {
    this._pending = { available: false };
    await Kind.waitFor("window_manager");
    await Kind.waitFor("panel_activity");
    await Kind.waitFor("activity_item");
    // Snapshot once before feed: Wm.onDomRefresh may consume hubDeepLink /
    // secure-share keys, and a second read later would wrongly treat a
    // deep-link boot as a plain restore.
    this._bootDeepLink = this._hasDeepLink();
    this._bootSavedState = this._readSavedDeskState();
    // Raise the restore flag BEFORE feeding the skeleton: the breadcrumb's
    // mount-time loadHome() fires during the render pass and must know a
    // saved screen / workspace / deep-link is about to be restored (see
    // loadHome) — otherwise Wm.reload() wipes the target we just opened.
    // ALWAYS true now, not just for a deep link or a saved screen: the desk
    // always lands on something — the remembered screen, the deep-link target,
    // or (new shell) the default workspace. It used to be false on a cold boot
    // with nothing saved, which let the breadcrumb's mount-time loadHome() run
    // Wm.reload() and paint the home workspace-tile grid; that then raced the
    // default-workspace open, and the grid usually won.
    //
    // _restoreDeskState clears it on every path, including the one where no
    // workspace could be opened (a brand-new account with none yet) — which is
    // the only case that should still land on the home grid.
    this._restoreInFlight = true;
    this.feed(require("./skeleton")(this));
    await this.ensurePart("desk-content");
    this._restoreDeskState().catch((e) => {
      this._restoreInFlight = false;
      this.warn && this.warn("[Reload] restore failed", e);
    });
    // There used to be an `await this.ensurePart("wrapper-popup")` here, with
    // a note warning that the skeleton has no such part so the promise never
    // resolves. The note was right and the await stayed anyway — which made
    // BOTH lines below dead code. ensurePart has no timeout (ui-core
    // collection-view): a part that never renders leaves the promise pending
    // for the life of the desk.
    //
    // So `_e.ready` had never fired, and LAUNCH30's "Start exploring now"
    // never reached the Admin Console: it sets its flags, reloads, and the
    // reader below was simply never called. Nothing listens for `_e.ready`
    // today, so letting it fire is inert; the promo handler is the point.
    this.trigger(_e.ready);
    // LAUNCH30 "Start exploring now" reloads so org_provision's domain move
    // is picked up by get_env; then open Admin Console (+ Invite via
    // apps-main's own sessionStorage flag).
    this._maybeOpenPromoAdminAfterClaim();
  }

  /**
   * "#/desk/billing" — a shareable link that lands on Billing & subscription.
   *
   * Called from two places because there are two ways to arrive. Boot covers
   * the cold load and the return from sign-in (the intent was stored by the
   * router before the hash was replaced); route() covers clicking the link in
   * a tab that already has the desk mounted, where nothing re-boots.
   *
   * Gated by canUpgradePlan for the same reason the sidebar's own
   * "upgrade-plan" is: an install with no payment backend, or a member who is
   * not the org owner, would land on a page that can only dead-end. A link
   * anyone can forward is exactly the "stray trigger" that gate was written
   * for, so it is honoured here rather than trusted.
   *
   * @returns {Boolean} whether the billing screen was opened
   */
  _maybeOpenBillingDeepLink() {
    // PEEK, NOT CONSUME. Both gates below can refuse, and a refusal must leave
    // the destination exactly as it found it: consuming first made every
    // refusal permanent, so a wrong-account sign-in destroyed a link written
    // for somebody else, who then signed in and found nothing.
    const preselect = billingDeepLink.peek();
    if (!preselect) return false;
    // Addressed to somebody else. A campaign CTA carries an opaque marker for
    // the recipient it was written for (analytics-server _recipientTag), and a
    // mail gets forwarded, screenshotted, and opened on machines already signed
    // in as a colleague. Without this, any of those walks that person into a
    // discounted checkout with a partner code applied that was never offered to
    // them.
    //
    // A link with no marker passes — see isForCurrentUser, which treats absent
    // as "not bound" rather than "refuse", so every link written before this
    // existed still works.
    // KEPT, not consumed: this session is not the one the link was written for,
    // so the recipient has not had their chance yet. They may sign in on this
    // very tab a moment from now — which is the case this whole ordering exists
    // for.
    if (!billingDeepLink.isForCurrentUser(preselect)) return false;
    // KEPT for the same reason, and this one can genuinely change underneath:
    // ownership, or a payment backend that had not finished loading. Throwing
    // the destination away on a verdict that is not final is the harsher answer.
    if (!canUpgradePlan()) return false;
    // Committed. Taking it here — and only here — is what keeps the destination
    // SINGLE-USE: it must not replay for this account after a later sign-out.
    // The value is already in hand from the peek above, so the return is
    // deliberately discarded.
    billingDeepLink.consume();
    // Don't let desk-state restore pull the screen back to the remembered one.
    this._restoreInFlight = false;
    this.openBillingPage(preselect);
    return true;
  }

  /**
   * Open the file a signed-out visitor arrived on, now that they are in.
   *
   * A Designation link is sent TO somebody, so it is usually opened without a
   * session. The hash does not survive that: the router replaces it with
   * "#/welcome/signin" and sign-in reloads the document, so wm.route()'s
   * `locationOnStart` holds the sign-in screen by the time it looks. The link is
   * captured at module scope in index.web.js instead and replayed here — the
   * same shape, and the same reason, as _maybeOpenBillingDeepLink above.
   *
   * Consumed exactly once, here: reading clears the intent, so it can never
   * reopen the file over whatever the visitor does next. The warm path (already
   * signed in, wm.route() opens it directly) clears it there instead.
   *
   * @returns {Boolean} whether this boot carried such a link
   */
  _maybeOpenFileDeepLink() {
    const hash = fileDeepLink.consume();
    if (!hash) return false;
    // Same as billing: the remembered screen must not pull focus off the file.
    this._restoreInFlight = false;
    try {
      Wm.openDeepLinkHash(hash);
    } catch (e) {
      // A malformed or unresolvable link must never break the desk boot; the
      // visitor simply lands on home, which is what happened before this existed.
      this.warn && this.warn("[file-deep-link] could not open", e);
      return false;
    }
    return true;
  }

  /**
   * Is a workspace armed for the prompt, without consuming it?
   *
   * Read-only on purpose: the loader must not eat the intent the prompt is going
   * to need. Both sources are checked, the guest-landing key and the CTA's
   * hub-deep-link, so the loader appears for exactly the arrivals that end in a
   * prompt.
   *
   * @returns {Boolean}
   */
  _hasInvitedWorkspaceIntent() {
    try {
      if (
        localStorage.getItem("drumee_guest_join") ||
        sessionStorage.getItem("drumee_guest_join")
      ) {
        return true;
      }
    } catch (e) {
      /* storage unavailable — fall through to the lib, which handles its own */
    }
    return hubDeepLink.has();
  }

  /** The live loader window, or null. */
  _invitedWorkspaceLoader() {
    try {
      const all = (window.Wm && Wm.getItemsByKind && Wm.getItemsByKind("window_info")) || [];
      for (const w of all) {
        if (!w || (w.isDestroyed && w.isDestroyed())) continue;
        if (w.mget && w.mget("guest_join_loading")) return w;
      }
    } catch (e) {
      /* Wm not answering */
    }
    return null;
  }

  /**
   * "Preparing your workspace…" — shown while the desk works its way toward the
   * invited-workspace prompt, so an invitee who just clicked a link in their mail
   * is told something is happening instead of being handed a bare desk.
   *
   * No-op unless a workspace is actually armed, so an ordinary sign-in never sees
   * it.
   *
   * Two things make it safe to raise this BEFORE the reward / LAUNCH30 flows:
   *
   *  - it hides itself whenever _homePopupsBusy() says one of them is up (the skin
   *    hides [data-busy="1"]), so it cannot repeat the stacking bug that put the
   *    prompt at the end of the chain in the first place. Hidden, not unmounted —
   *    remounting on every toggle would flicker and lose its place in the pool.
   *  - `dismiss_after` is a hard backstop. Every path that ends the wait calls
   *    _hideInvitedWorkspaceLoader, but a loader with no footer cannot be
   *    dismissed by a button, so it must not be able to outlive its own reason to
   *    exist even if a new path forgets.
   *
   * mode "hb" = header + body, no footer: there is nothing to confirm, and the
   * header keeps the drumee/✕ bar so it can always be closed by hand.
   */
  _showInvitedWorkspaceLoader() {
    if (this._invitedLoaderShown) return;
    if (!this._hasInvitedWorkspaceIntent()) return;
    if (!window.Wm || !Wm.info) return;
    this._invitedLoaderShown = true;
    const fig = "window-info";
    Wm.info({
      variant: "notice",
      mode: "hb",
      guest_join_loading: 1,
      dismiss_after: 30000,
      message: [
        Skeletons.Box.X({
          className: `${fig}__loader`,
          kids: [
            Skeletons.Element({ className: `${fig}__loader-spinner` }),
            Skeletons.Note({
              className: `${fig}__loader-label`,
              content:
                LOCALE.PREPARING_INVITED_WORKSPACE || "Preparing your workspace…",
            }),
          ],
        }),
      ],
    });
    // Wm.info cannot hand back a handle (window/info/index.js documents why: the
    // view is built after append returns), so the window is found by its model
    // flag on each tick. Same 250ms step as _waitForHomePopups, since it is the
    // same state being watched.
    //
    // `seen` is what tells "not built yet" (keep polling) apart from "gone"
    // (stop): the window can leave without this method being the one to remove
    // it — the ✕ in its header, or its own dismiss_after — and the interval must
    // not outlive it, which for a wait that can legitimately last minutes would
    // otherwise mean minutes of pointless ticking.
    const STEP = 250;
    let seen = false;
    this._invitedLoaderTimer = setInterval(() => {
      const w = this._invitedWorkspaceLoader();
      if (!w || !w.el) {
        if (seen) this._hideInvitedWorkspaceLoader();
        return;
      }
      seen = true;
      w.el.dataset.guestJoinLoading = "1";
      w.el.dataset.busy = this._homePopupsBusy() ? "1" : "0";
    }, STEP);
  }

  /**
   * Take the loader down. Idempotent, and called from every path that ends the
   * wait — the prompt appearing, giving up on Wm, a stale intent, popups that
   * never cleared, a failure in the chain — because none of those leave anything
   * else on screen to explain the loader.
   */
  _hideInvitedWorkspaceLoader() {
    if (this._invitedLoaderTimer) {
      clearInterval(this._invitedLoaderTimer);
      this._invitedLoaderTimer = null;
    }
    const w = this._invitedWorkspaceLoader();
    if (w && w.goodbye) w.goodbye();
  }

  /**
   * After a guest signs in from a shared-workspace landing page, offer to open
   * the workspace they were invited to.
   *
   * The signin plugin writes drumee_guest_join before it leaves for the form
   * (see signin_guest._armJoinIntent); this reads it once, here, because Home
   * is the first point where Wm exists and the desk has settled. The workspace-
   * invite CTA arms the same offer through libs/hub-deep-link instead.
   *
   * Consumed unconditionally — read and removed in the same breath, whether or
   * not the dialog ends up shown — so a stale key can never re-prompt on the
   * next load. No key means a normal sign-in, and nothing happens.
   *
   * Mirrors _maybeOpenPromoAdminAfterClaim above, including standing down
   * _restoreInFlight so desk-state restore does not race the dialog.
   */
  _maybeOfferInvitedWorkspace() {
    let intent = null;
    try {
      // localStorage, not session: the email-and-password signup sends the user
      // out to their mail client and back through a NEW TAB on the verify link,
      // which a session-scoped key does not survive. Same shape as the signup
      // router's captureRef (drumee_ref), which persists across that flow for
      // the same reason. sessionStorage is still read so an intent armed by the
      // previous build is not stranded.
      const raw =
        localStorage.getItem("drumee_guest_join") ||
        sessionStorage.getItem("drumee_guest_join");
      if (raw) {
        localStorage.removeItem("drumee_guest_join");
        sessionStorage.removeItem("drumee_guest_join");
        intent = JSON.parse(raw);
      }
    } catch (e) {
      // Unreadable storage or malformed JSON. Fall through rather than return:
      // the hub-deep-link intent below is a separate key with its own error
      // handling, and a corrupt guest_join value must not suppress it.
      intent = null;
    }
    // The workspace-invite CTA arms this one instead (?hub_id=&name= -> welcome ->
    // libs/hub-deep-link). Checked second so a guest-landing intent, which is the
    // older and more specific signal, still wins if both somehow exist. Its own
    // age guard lives in the lib.
    if (!intent || !intent.hub_id) intent = hubDeepLink.consume();
    // Every return below takes the loader with it: it promised a prompt, and
    // these are the paths where there will not be one.
    if (!intent || !intent.hub_id) return this._hideInvitedWorkspaceLoader();
    // Outliving the session means it can also outlive the user's interest. A
    // signup that stalls at the verify email for days should not open with a
    // workspace prompt; the invite itself is unaffected, it stays in the
    // activity list either way. Undated intents (previous build) are honoured.
    const AGE_LIMIT = 7 * 24 * 3600 * 1000;
    if (intent.ts && Date.now() - Number(intent.ts) > AGE_LIMIT) {
      return this._hideInvitedWorkspaceLoader();
    }
    this._restoreInFlight = false;
    const workspace = (intent.name || "").trim();
    const message = workspace
      ? (LOCALE.GUEST_JOIN_OPEN_WORKSPACE_MSG || "You can now open the workspace you were invited to: %s").replace("%s", workspace)
      : (LOCALE.GUEST_JOIN_OPEN_WORKSPACE_MSG_PLAIN || "You can now open the workspace you were invited to.");
    // Wm may not exist yet — loadDefault can run before window.Wm is assigned
    // (see the cold-boot note further down this file). Bailing here would lose
    // the prompt for good, since the key has already been consumed, so wait for
    // it instead and give up only after a few seconds.
    let waited = 0;
    const show = () => {
      if (this.isDestroyed && this.isDestroyed()) {
        return this._hideInvitedWorkspaceLoader();
      }
      if (!window.Wm || !Wm.info) {
        waited += 200;
        if (waited > 6000) {
          this._hideInvitedWorkspaceLoader();
          this.warn && this.warn("[guest-join] Wm never became available");
          return;
        }
        return setTimeout(show, 200);
      }
      this._invitedHubId = intent.hub_id;
      // Hand over: the loader comes down as the prompt goes up, so the two are
      // never on screen together and there is no gap between them.
      this._hideInvitedWorkspaceLoader();
      Wm.info({
        variant: "notice",
        message,
        // Tags this window_info so the Open handler closes THIS dialog and not
        // some other notice that happens to be up.
        guest_join: 1,
        actions: [
          {
            label: LOCALE.OPEN_WORKSPACE || "Open Workspace",
            priority: "primary",
            service: "guest-join-open-workspace",
            uiHandler: this,
          },
          {
            label: LOCALE.CANCEL || "Cancel",
            priority: "secondary",
            service: _e.close,
          },
        ],
      });
    };
    setTimeout(show, 400);
  }

  /**
   * Legacy path for promo-launch30's "Start exploring now".
   *
   * That button no longer reloads — it broadcasts desk:open-admin-console and
   * the console opens in place, which is ~1.7s cheaper (see the note on
   * _exploreAfterClaim). Nothing sets drumee_promo_open_admin any more.
   *
   * Kept for one case only: a tab that clicked the button on the previous
   * build, set the flag, and reloaded into this one. sessionStorage dies with
   * that tab, so this can be deleted after a deploy cycle.
   */
  _maybeOpenPromoAdminAfterClaim() {
    let open = false;
    try {
      open = sessionStorage.getItem("drumee_promo_open_admin") === "1";
      if (open) sessionStorage.removeItem("drumee_promo_open_admin");
    } catch (e) {
      return;
    }
    if (!open) return;
    // Don't fight desk-state restore back to Home.
    this._restoreInFlight = false;
    setTimeout(() => this._toggleAppsShim(), 400);
  }

  /**
   * Open the Admin Console the way the sidebar item does — a synthetic
   * toggle-apps command through the desk's own onUiEvent. Shared by the
   * promo post-claim reload above and the over-limit popup's "Resolve now"
   * (seats are resolved on the Members page).
   */
  _toggleAppsShim(tab) {
    this._deskServiceShim("toggle-apps", tab ? { tab } : undefined);
  }

  /**
   * Raise one of the desk's own sidebar services from code.
   *
   * The over-limit popup is portalled to <body> and deliberately owns no
   * reference to the desk, so it broadcasts; this turns the broadcast back
   * into the exact command the sidebar item would have sent, rather than a
   * second navigation path that could drift from it.
   *
   * @param {String} service  e.g. "toggle-apps", "toggle-trash", _e.home
   * @param {Object} [args]   extra args merged into the event payload
   */
  _deskServiceShim(service, args) {
    if (this.isDestroyed && this.isDestroyed()) return;
    this.onUiEvent(
      {
        mget: (k) => (k === _a.service || k === "service" ? service : null),
        get(k) {
          return this.mget(k);
        },
      },
      { service, ...args },
    );
  }

  // ── [Reload] keep the desk where the user left it across a browser reload ──
  //
  // Sidebar panels never write location.hash, and workspace / folder windows
  // live only in RAM (Wm.headlessLayer / windowsLayer). A reload used to always
  // land on Home. We snapshot the live desk on pagehide into sessionStorage
  // and replay it after loadDefault remounts the skeleton.
  //
  // sessionStorage is deliberate: reload of THIS tab restores; a brand-new tab
  // still starts on Home; two tabs never overwrite each other.

  static get _DESK_STATE_KEY() {
    return "drumee.desk.lastScreen";
  }

  /** service string ↔ sidebar nav item (sys_pn) for the restorable screens */
  static get _RESTORABLE_SCREENS() {
    return {
      "toggle-apps": "sidebar-apps",
      "toggle-settings": "sidebar-settings",
      "toggle-help": "sidebar-help",
      "upgrade-plan": "sidebar-upgrade",
      "toggle-trash": "sidebar-trash",
      "toggle-contacts": "sidebar-contacts",
      "toggle-inbox": "sidebar-inbox",
      "toggle-activity": "sidebar-notifications",
      "toggle-calendar": "sidebar-calendar",
    };
  }

  /**
   * Which sidebar screen is currently on top? Reads the live slot state
   * (not just _pendingKinds — keep-alive slots stay mounted when closed
   * with data-anim="out", and destroy-on-close children may already be
   * goodbye()'d while their pending kind lingers). Returns the sidebar
   * service string, or null when the user is on plain Home.
   */
  _currentScreenService() {
    const kinds = this._pendingKinds || {};
    const topChild = (pn) => {
      const p = this.getPart && this.getPart(pn);
      const child = p && p.children && p.children.last && p.children.last();
      if (!child || (child.isDestroyed && child.isDestroyed()) || !child.el)
        return null;
      return child;
    };
    const childKind = (child, pendingKey) =>
      (child && child.mget && child.mget(_a.kind)) ||
      (child && child.el && child.el.dataset && child.el.dataset.kind) ||
      kinds[pendingKey];

    // Full-page slot (Apps / Settings / Billing) — destroyed on close, so a
    // live child that isn't animating out means the screen is showing.
    const mainChild = topChild("settings-main-slot");
    if (mainChild && mainChild.el.dataset.anim !== "out") {
      switch (childKind(mainChild, "settings-main-slot")) {
        case "apps_main":
          return "toggle-apps";
        case "settings_main":
          return "toggle-settings";
        case "help_main":
          return "toggle-help";
        case "settings_billing":
          return "upgrade-plan";
        // The Inbox is a full-canvas screen now (Figma 43:32209), so it is
        // detected here with its slot-mates rather than among the slide-outs.
        case "chat_p2p":
          return "toggle-inbox";
      }
    }

    // Keep-alive slots — widget stays mounted when hidden; only
    // data-anim="in" means visible.
    const trashChild = topChild("trash-panel");
    if (trashChild && trashChild.el.dataset.anim === "in") {
      return "toggle-trash";
    }
    const chatChild = topChild("chat-panel");
    if (chatChild && chatChild.el.dataset.anim === "in") {
      // Contacts still slides out from the right; the Inbox moved to the
      // full-canvas slot and is detected below.
      const kind = childKind(chatChild, "chat-panel");
      if (kind === "address_book") return "toggle-contacts";
    }


    // Notifications side panel (predates the anim pattern, uses data-state).
    const act = this.getPart && this.getPart("activity-panel");
    if (act && ~~act.mget(_a.state) === 1) {
      return "toggle-activity";
    }

    return null;
  }

  /** Headless workspace pane currently mounted in Wm, or null. */
  _snapshotWorkspace() {
    if (!window.Wm || !Wm.headlessLayer || !Wm.headlessLayer.children) {
      return null;
    }
    const views = Wm.headlessLayer.children.toArray().filter((view) => {
      if (!view || (view.isDestroyed && view.isDestroyed())) return false;
      return (
        view.mget(_a.kind) === "window_folder" && !!view.mget(_a.headless)
      );
    });
    const view = views[views.length - 1];
    if (!view) return null;
    const hub_id = view.mget(_a.hub_id);
    const nid =
      view.mget(_a.nid) ||
      view.mget(_a.actual_home_id) ||
      view.mget(_a.home_id);
    if (!hub_id || !nid) return null;
    return {
      hub_id,
      nid,
      area: view.mget(_a.area),
      filename:
        view.mget(_a.filename) ||
        view.mget(_a.name) ||
        view.mget("hub_name") ||
        "",
    };
  }

  /** Floating (non-headless) folder windows currently open. */
  _snapshotFloatingWindows() {
    if (!window.Wm || !Wm.windowsLayer || !Wm.windowsLayer.children) {
      return [];
    }
    const out = [];
    for (const view of Wm.windowsLayer.children.toArray()) {
      if (!view || (view.isDestroyed && view.isDestroyed())) continue;
      if (view.mget(_a.kind) !== "window_folder") continue;
      if (view.mget(_a.headless)) continue;
      const hub_id = view.mget(_a.hub_id);
      const nid =
        view.mget(_a.nid) ||
        view.mget(_a.actual_home_id) ||
        view.mget(_a.home_id);
      if (!hub_id || !nid) continue;
      out.push({
        kind: "window_folder",
        hub_id,
        nid,
        area: view.mget(_a.area),
        filename:
          view.mget(_a.filename) ||
          view.mget(_a.name) ||
          view.mget("hub_name") ||
          "",
        minimize: ~~view.mget(_a.minimize) ? 1 : 0,
        focused:
          view.el && view.el.dataset && view.el.dataset.state === "1" ? 1 : 0,
        wm_unique_id:
          view.mget("wm_unique_id") || `window_folder-${hub_id}-${nid}`,
      });
    }
    return out;
  }

  _savedStateIsRestorable(state) {
    if (!state || typeof state !== "object") return false;
    if (
      state.service &&
      desk_module._RESTORABLE_SCREENS[state.service]
    ) {
      return true;
    }
    if (state.workspace && state.workspace.hub_id && state.workspace.nid) {
      return true;
    }
    if (Array.isArray(state.windows) && state.windows.length) return true;
    return false;
  }

  /**
   * Pure read of the persisted desk snapshot. Does NOT apply deep-link
   * gating — callers decide whether deep-link wins.
   */
  _readSavedDeskState() {
    try {
      const raw = sessionStorage.getItem(desk_module._DESK_STATE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return saved && typeof saved === "object" ? saved : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * The saved sidebar service from the previous page load, or null when
   * nothing valid was saved / a deep-link must win.
   */
  _savedScreenService() {
    const saved = this._bootSavedState || this._readSavedDeskState();
    const service = saved && saved.service;
    if (!desk_module._RESTORABLE_SCREENS[service]) return null;
    if (this._bootDeepLink || this._hasDeepLink()) return null;
    return service;
  }

  /** pagehide hook — must stay synchronous. */
  _persistDeskState() {
    try {
      const service = this._currentScreenService();
      const workspace = this._snapshotWorkspace();
      const windows = this._snapshotFloatingWindows();
      const state = {};
      if (service) state.service = service;
      if (workspace) state.workspace = workspace;
      if (windows.length) state.windows = windows;
      if (Object.keys(state).length) {
        sessionStorage.setItem(
          desk_module._DESK_STATE_KEY,
          JSON.stringify(state),
        );
      } else {
        sessionStorage.removeItem(desk_module._DESK_STATE_KEY);
      }
    } catch (e) {
      /* private mode / quota — reload will just land on Home */
    }
  }

  /** Backward-compatible alias used by older call sites / tests. */
  _persistLastScreen() {
    return this._persistDeskState();
  }

  /**
   * True when the current URL / session carries a real deep-link that must
   * win over the remembered screen. `#/desk/wm/home` is NOT a deep-link —
   * wm.route() rewrites the hash to it a few seconds after any navigation,
   * so it's the resting hash of a normal session.
   */
  _hasDeepLink() {
    try {
      // has(), not a raw getItem: an armed workspace intent now also has a dated
      // localStorage copy (libs/hub-deep-link), and desk-state restore must stand
      // down for that one too or it races the workspace about to open.
      if (hubDeepLink.has()) return true;
      // Same reasoning for a file link a signed-out visitor arrived on: the
      // remembered screen must not race the file about to open. peek(), not
      // consume() — _maybeOpenFileDeepLink is the single consumer.
      if (fileDeepLink.peek()) return true;
      if (sessionStorage.getItem("drumee_secure_share_return")) {
        return true;
      }
    } catch (e) {
      /* sessionStorage unavailable — fall through to the hash check */
    }
    const path = Visitor.parseModule() || [];
    if (path[1] === "wm") {
      // Compare against the literal resting segment — `_a.home` is not
      // always defined in the attribute lex.
      return !!(path[2] && path[2] !== "home" && path[2] !== _a.home);
    }
    // e.g. #@desk/folder?hub_id=… (direct folder URL handled by wm)
    return !!(path[1] && path[1] !== "home" && path[1] !== _a.home);
  }

  _clearRestoreInFlight(delayMs = 0) {
    if (this._restoreClearTimer) {
      clearTimeout(this._restoreClearTimer);
      this._restoreClearTimer = null;
    }
    if (!delayMs) {
      this._restoreInFlight = false;
      return;
    }
    this._restoreClearTimer = setTimeout(() => {
      this._restoreClearTimer = null;
      this._restoreInFlight = false;
    }, delayMs);
  }

  async _waitForWm(maxTries = 50) {
    for (let i = 0; i < maxTries && !window.Wm; i++) {
      if (this.isDestroyed && this.isDestroyed()) return null;
      await new Promise((r) => setTimeout(r, 100));
    }
    return window.Wm || null;
  }

  /**
   * Restore floating folder windows into windowsLayer (never via
   * getWindowsPool — that routes into headlessLayer when a workspace is
   * already open).
   */
  async _restoreFloatingWindows(windows = []) {
    if (!windows.length || !window.Wm || !Wm.windowsLayer) return;
    await Kind.waitFor("window_folder");
    if (this.isDestroyed && this.isDestroyed()) return;

    const ordered = [...windows];
    // Launch unfocused first, focused last so raise() wins Z-order.
    ordered.sort((a, b) => (a.focused ? 1 : 0) - (b.focused ? 1 : 0));

    for (const item of ordered) {
      if (!item || !item.hub_id || !item.nid) continue;
      const payload = {
        kind: "window_folder",
        hub_id: item.hub_id,
        nid: item.nid,
        area: item.area,
        filename: item.filename,
        headless: 0,
        wm_unique_id:
          item.wm_unique_id || `window_folder-${item.hub_id}-${item.nid}`,
      };
      Wm.windowsLayer.append(payload);
    }

    // Let folder:open handlers register tabs, then apply minimize / focus.
    await new Promise((r) => setTimeout(r, 400));
    if (!window.Wm || !Wm.windowsLayer) return;

    for (const item of windows) {
      const view = Wm.windowsLayer.children.toArray().find((v) => {
        if (!v || (v.isDestroyed && v.isDestroyed())) return false;
        return (
          v.mget(_a.kind) === "window_folder" &&
          v.mget(_a.hub_id) === item.hub_id &&
          (v.mget(_a.nid) === item.nid ||
            v.mget(_a.actual_home_id) === item.nid ||
            v.mget(_a.home_id) === item.nid)
        );
      });
      if (!view) continue;
      if (item.minimize && typeof view.minimize === "function") {
        view.minimize();
      } else if (item.focused && typeof view.raise === "function") {
        view.raise();
      }
    }
  }

  async _restoreWorkspace(workspace) {
    if (!workspace || !workspace.hub_id || !workspace.nid || !window.Wm) {
      return false;
    }

    // DOES IT STILL EXIST? The snapshot is taken on `pagehide` from whatever
    // pane was mounted, and a workspace can be gone by the time it is read
    // back — deleted in this tab (which is the bug this was reported with) or
    // in another one, or access revoked while the tab was closed.
    //
    // Without this, loadWorkspace is called for a dead hub: media.attributes
    // resolves nothing, it warns "cannot resolve workspace root", releases the
    // context — and the desk is left on NO workspace, because _restoreDeskState
    // already spent its one restore attempt here instead of falling back to
    // _openDefaultWorkspace. Which is exactly "on refresh it tries to open
    // test(1)".
    //
    // _fetchWorkspaces is the switcher's own cached list, so on a warm cache
    // this costs nothing; on a cold boot it is one request the boot default
    // shares anyway. A FAILED fetch returns [] — do not treat that as "the
    // workspace is gone" and throw the user's place away over a network blip.
    try {
      const rows = await this._fetchWorkspaces();
      if (rows && rows.length) {
        const alive = rows.some(
          (r) => `${r.hub_id || r.id}` === `${workspace.hub_id}`,
        );
        if (!alive) {
          this.warn &&
            this.warn(
              `[restore] workspace ${workspace.hub_id} no longer exists;`
                + " opening the default instead",
            );
          this._forgetSavedWorkspace();
          return false;
        }
      }
    } catch (e) {
      // Fall through and try: an unreachable list is not evidence of deletion.
      this.warn && this.warn("[restore] could not verify workspace", e);
    }

    await Kind.waitFor("window_folder");
    if (this.isDestroyed && this.isDestroyed()) return false;
    // loadWorkspace accepts any nid (root or subfolder) and mounts a
    // headless window_folder at that node — enough to restore both a
    // workspace root and an in-workspace folder navigation. Server-side
    // media.attributes fills actual_home_id / home_id correctly.
    Wm.loadWorkspace({
      hub_id: workspace.hub_id,
      nid: workspace.nid,
      area: workspace.area,
      filename: workspace.filename,
      name: workspace.filename,
      hub_name: workspace.filename,
    });
    // Wait until the headless pane is actually mounted before returning so
    // a subsequent sidebar restore (Settings over workspace) doesn't race.
    for (let i = 0; i < 40; i++) {
      if (this.isDestroyed && this.isDestroyed()) return false;
      const ready =
        Wm.headlessLayer &&
        Wm.headlessLayer.children &&
        Wm.headlessLayer.children.toArray().some(
          (v) =>
            v &&
            v.mget(_a.kind) === "window_folder" &&
            v.mget(_a.headless) &&
            v.mget(_a.hub_id) === workspace.hub_id,
        );
      if (ready) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    // Timed out waiting for the pane. Report it so the caller can fall back
    // rather than leave the desk on nothing.
    return false;
  }

  /**
   * Drop the saved workspace from the persisted desk state.
   *
   * Called when a restore is refused because the workspace is gone: without
   * this the same dead hub_id is re-read on every subsequent reload, and each
   * one pays the verification before falling back. The rest of the state (the
   * remembered screen, floating windows) is deliberately kept.
   */
  _forgetSavedWorkspace() {
    if (this._bootSavedState) delete this._bootSavedState.workspace;
    try {
      const raw = sessionStorage.getItem(desk_module._DESK_STATE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state || !state.workspace) return;
      delete state.workspace;
      if (Object.keys(state).length) {
        sessionStorage.setItem(
          desk_module._DESK_STATE_KEY,
          JSON.stringify(state),
        );
      } else {
        sessionStorage.removeItem(desk_module._DESK_STATE_KEY);
      }
    } catch (e) {
      /* private mode / quota — the guard above already did the useful half */
    }
  }

  async _restoreSidebarService(service) {
    if (!service || !desk_module._RESTORABLE_SCREENS[service]) return;
    const sidebarPn = desk_module._RESTORABLE_SCREENS[service];

    if (service === "toggle-activity") {
      // Open-only: the live toggle would close the panel if state is already 1.
      this._dismissWmModal();
      this._parkLiveCall();
      const p = await this.ensurePart("activity-panel");
      if (p && ~~p.mget(_a.state) !== 1) {
        p.activityState = 1;
        p.setState(1);
        this.closeOtherSidebarPanels("activity-panel");
        if (typeof p.refreshFeed === "function") p.refreshFeed();
      }
    } else {
      await this.onUiEvent({ mget: () => null }, { service });
    }

    this.ensurePart(sidebarPn)
      .then((p) => {
        if (p) RADIO_BROADCAST.trigger("sidebar-radio", p);
      })
      .catch(() => {});
  }

  /**
   * Replay the persisted desk state after the skeleton mounts.
   * Deep-links win over saved workspace/windows. Sidebar panels can still
   * restore on top when there is no deep-link.
   */
  async _restoreDeskState() {
    if (this._screenRestored) {
      // A second loadDefault in the same page must not leave the suppress
      // flag stuck true (which would permanently no-op loadHome).
      this._clearRestoreInFlight(0);
      return;
    }
    this._screenRestored = true;

    const deepLink = this._bootDeepLink;
    const saved = this._bootSavedState;
    const hasSaved = this._savedStateIsRestorable(saved);

    if (!deepLink && !hasSaved) {
      // Nothing to restore — land on a workspace rather than an empty desk.
      // The new shell's rail (Files / Chat / Task / Meet / Access) all act on
      // an OPEN workspace, so "no workspace" is not a state it can render.
      // Keep the restore flag up across the open, or the breadcrumb's
      // mount-time loadHome() fires Wm.reload() and wipes it.
      const opened = await this._openDefaultWorkspace();
      this._clearRestoreInFlight(opened ? 2500 : 0);
      return;
    }

    try {
      const wm = await this._waitForWm();
      if (!wm || (this.isDestroyed && this.isDestroyed())) return;

      // Let mount-time renders (breadcrumb loadHome, wm skeleton) settle
      // before feeding panels / windows, so nothing re-clears afterwards.
      await new Promise((r) => setTimeout(r, 300));
      if (this.isDestroyed && this.isDestroyed()) return;

      if (deepLink) {
        // Cold boot often reaches loadDefault before window.Wm exists, so
        // desk.route() skipped Wm.route(). Re-dispatch now that Wm is ready.
        // Suppressing loadHome above keeps Wm.reload() from wiping the
        // workspace / folder that route() (or onDomRefresh hub bootstrap)
        // opens.
        if (typeof wm.route === "function") wm.route();
        // Hold suppress a bit so async media.attributes + headless feed finish
        // before a late breadcrumb loadHome can run.
        this._clearRestoreInFlight(2500);
        return;
      }

      // Order matters: floating windows first (windowsLayer), then headless
      // workspace, then sidebar overlay on top.
      if (saved.windows && saved.windows.length) {
        await this._restoreFloatingWindows(saved.windows);
      }
      if (saved.workspace) {
        // `false` means it could not be restored — gone, or the pane never
        // mounted. Falling through to the default is the whole point of
        // verifying: this used to leave the desk on no workspace at all.
        const restored = await this._restoreWorkspace(saved.workspace);
        if (!restored) await this._openDefaultWorkspace();
      } else {
        // Restorable state that names a SCREEN but no workspace (the user was
        // on Contacts / Settings / a floating window last time). The new shell
        // has no "no workspace" state to fall back to behind that screen, so
        // seed one underneath it. Runs BEFORE _restoreSidebarService so the
        // remembered screen still ends up on top.
        await this._openDefaultWorkspace();
      }
      if (saved.service) {
        await this._restoreSidebarService(saved.service);
      }
    } finally {
      // Hold the flag a beat longer than the feed so late mount-time
      // loadHome stragglers (breadcrumb renders async) stay suppressed.
      this._clearRestoreInFlight(2000);
    }
  }

  /** Backward-compatible alias. */
  _restoreLastScreen() {
    return this._restoreDeskState();
  }

  /**
   *
   * @param {*} args
   * @returns
   */
  async openP2Pchat(args = {}) {
    const { drumate_id, message_id } = args;
    let p = await this.ensurePart(INBOX_SLOT);
    let widget = p.children.last();
    if (!widget || widget.isDestroyed()) {
      this.togglePanel("chat_p2p", INBOX_SLOT, true);
    } else if (widget.mget(_a.kind) !== "chat_p2p") {
      this.togglePanel("chat_p2p", INBOX_SLOT, true);
    }
    if (!drumate_id) return;
    p = await this.ensurePart(INBOX_SLOT);
    this.debug("AAA:122", this);
    widget = p && p.children && p.children.last && p.children.last();
    if (widget && widget.openChatByPeerId)
      widget.openChatByPeerId(drumate_id, message_id);
  }

  /**
   *
   * @param {*} args
   * @returns
   */
  async openContactPanel(args = {}) {
    let p = await this.ensurePart("chat-panel");
    let widget = p.children.last();
    if (!widget || widget.isDestroyed()) {
      this.togglePanel("address_book", "chat-panel");
    } else if (widget.mget(_a.kind) === "address_book") {
      if (widget.el.dataset.anim === "in") {
        return;
      } else {
        this.togglePanel("address_book", "chat-panel");
      }
    }
    this.togglePanel("address_book", "chat-panel");
    p = await this.ensurePart("chat-panel");
    widget = p && p.children && p.children.last && p.children.last();
    if (widget && widget.switchTab) widget.switchTab(_a.pending);
  }

  /**
   *
   */
  async onDomRefresh() {
    // Campaign attribution for a signed-IN click on a marketing CTA — the
    // common case for the claim-reward mail, whose recipients all have
    // accounts and so never pass through the welcome/signup routers. Must land
    // before onPartReady("overlay") gets to _maybeStartRewardFlow(), which it
    // does comfortably: that call is delayed 2s.
    captureUtm();
    this.route();
    RADIO_BROADCAST.on("breadcrumb:content", this._updateAddmenu);
    // Post-onboarding handoff for users who picked Google Drive in the
    // tools step. Delayed so workspace renders first.
    setTimeout(() => this._maybeAutoLaunchGDriveMigration(), 1500);
    // PMF rating survey: accumulate active usage; popup fires at 30 min.
    this._initRatingSurveyTimer();
    // Daily reminder card. Delayed like the migration prompt so the workspace
    // renders first — the card is a greeting, not a gate.
    setTimeout(() => this._maybeShowDailyReminder(), 2000);
    // Warm the support-account lookup so screens that need it can answer
    // synchronously: the Get help screen hides Contact Support for the
    // support account itself, and the inbox badges support conversations.
    // Failure is already swallowed into null — nothing here depends on it.
    this.supportContact();
  }


  /**
   * Daily reminder card — Round 3 / Sprint 1 row 7.
   *
   * Fires on the FIRST DESK LOAD OF THE DAY, keyed in localStorage on the
   * viewer's LOCAL date. Per device on purpose: a two-device user seeing it
   * twice is accepted, and it costs no schema.
   *
   * The day window is computed HERE, from the viewer's own clock, and sent to
   * the server — "today" is whatever the person in front of the screen calls
   * today, and the server has no way to know their timezone.
   *
   * The day is marked consumed BEFORE the request, not after. Two desk loads
   * in quick succession would otherwise both pass the check and fan out across
   * every workspace twice; and a card that failed to load is not worth
   * retrying all day.
   *
   * An all-zero day renders nothing. A card announcing three zeroes is noise,
   * and the day is still marked so it does not re-query on every load.
   */
  async _maybeShowDailyReminder() {
    let Popup;
    try {
      Popup = require("builtins/widget/daily-reminder-popup");
    } catch (e) {
      return; // widget not in this build — nothing to show
    }
    const key = Popup.dayKey();
    if (Popup.alreadyShownToday(key)) return;
    Popup.markShownToday(key);

    // Local midnight → next local midnight. Built from the date parts rather
    // than by adding 86400s, so the window stays correct across a daylight
    // saving change.
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    let counts;
    try {
      counts = await this.fetchService({
        // SERVICE.activity is NOT in lex/services.json — it exists only in the
        // backend map merged in at bootstrap, so the whole namespace can be
        // undefined and `SERVICE.activity.daily_digest` would throw. The
        // activity panel already guards its calls this way; same idiom here.
        service:
          (SERVICE.activity && SERVICE.activity.daily_digest) ||
          "activity.daily_digest",
        hub_id: Visitor.id,
        day: key,
        stime: Math.floor(start.getTime() / 1000),
        etime: Math.floor(end.getTime() / 1000),
      });
    } catch (e) {
      return;
    }
    // fetchService resolves undefined (or an error payload) rather than
    // rejecting when a call does not complete, so a non-object IS the failure
    // path — see _loadTasks in the task panel for the same shape.
    if (!counts || typeof counts !== "object" || Array.isArray(counts)) return;

    // A day with nothing due still shows the card, reading "nothing due
    // today" instead of three zeroes. It used to return here, and the first
    // consequence was the feature looking BROKEN: you open the desk, see
    // nothing, and cannot tell "quiet day" apart from "it didn't work". A
    // morning greeting that is silent exactly when there is nothing to report
    // is indistinguishable from one that failed, and "you're clear today" is
    // real information. The card renders nothing only when the request itself
    // did not come back, which is handled above.
    await Kind.waitFor("daily_reminder_popup");
    Wm.launch(
      {
        kind: "daily_reminder_popup",
        hub_id: Visitor.id,
        nid: Visitor.get(_a.home_id),
        counts,
        wm_unique_id: "daily_reminder_popup",
      },
      { explicit: 1, singleton: 1 },
    );
  }

  /**
   * After the user lands on the Desk, if onboarding said they use Google
   * Drive AND they haven't interacted with the migration prompt yet,
   * auto-launch the migrate popup once.
   *
   * "Interacted" = either clicked Start (which sets
   * profile.tools_migration_skipped.google_drive=1 inside start_migration)
   * or clicked "Skip for now" (calls dismiss_post_onboarding which sets
   * the same flag). Once the flag is set, no more auto-launches —
   * Settings → Linked accounts is the manual re-entry point.
   *
   * The popup respects `autoFromOnboarding` to render the "Skip for now"
   * link in addition to the normal flow.
   */
  async _maybeAutoLaunchGDriveMigration() {
    const profile = (Visitor.profile && Visitor.profile()) || {};
    const tools = profile.tools || [];
    if (!Array.isArray(tools) || !tools.includes("google_drive")) return;
    const skipped = (profile.tools_migration_skipped || {}).google_drive;
    if (skipped) return;

    await Kind.waitFor("migrate_gdrive_popup");
    Wm.launch({
      kind: "migrate_gdrive_popup",
      hub_id: Visitor.id,
      nid: Visitor.get(_a.home_id),
      autoFromOnboarding: 1,
      wm_unique_id: "migrate_gdrive_popup",
    }, { explicit: 1, singleton: 1 });
  }

  /**
   * PMF rating survey trigger. Server state gates everything (cross-device):
   *   done         → user already responded — never again.
   *   snooze_until → "remind later" active — stay silent until it passes.
   * Eligible users accumulate ACTIVE usage time (tab visible) into
   * localStorage across sessions; at 30 cumulative minutes the popup launches
   * once (singleton). SERVICE.survey ships from the backend ACL — guard its
   * absence so a UI deployed ahead of the backend fails safe (no timer).
   */
  async _initRatingSurveyTimer() {
    if (!SERVICE.survey || !SERVICE.survey.get_state) return;
    // Users still inside onboarding (profile.onboarded explicitly 0) are
    // not surveyed; legacy accounts without the flag are eligible.
    const profile = (Visitor.profile && Visitor.profile()) || {};
    if (String(profile.onboarded) === "0") return;
    let state;
    try {
      state = await this.fetchService(SERVICE.survey.get_state, { hub_id: Visitor.id });
    } catch (e) {
      return;
    }
    if (!state || state.done) return;
    const now = Math.floor(Date.now() / 1000);
    if (state.snooze_until && Number(state.snooze_until) > now) return;
    this._startUsageAccumulator();
  }

  /**
   * Counts ACTIVE seconds (document visible) in 5s ticks, persisted to
   * localStorage so the total survives reloads and sessions (per device —
   * the server `done` flag is the cross-device source of truth). At 1800s
   * the gate is re-checked (another tab/device may have responded while we
   * counted) before the singleton popup launches.
   */
  _startUsageAccumulator() {
    const KEY = "drumee-usage-seconds";
    const THRESHOLD = 1800;
    const TICK = 5;
    let seconds = parseInt(localStorage.getItem(KEY), 10) || 0;
    if (this._usageTimer) clearInterval(this._usageTimer);

    const fire = async () => {
      clearInterval(this._usageTimer);
      this._usageTimer = null;
      let state;
      try {
        state = await this.fetchService(SERVICE.survey.get_state, { hub_id: Visitor.id });
      } catch (e) {
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      if (!state || state.done) return;
      if (state.snooze_until && Number(state.snooze_until) > now) return;
      await Kind.waitFor("rating_survey_popup");
      Wm.launch({
        kind: "rating_survey_popup",
        hub_id: Visitor.id,
        nid: Visitor.get(_a.home_id),
        wm_unique_id: "rating_survey_popup",
      }, { explicit: 1, singleton: 1 });
    };

    if (seconds >= THRESHOLD) return fire();
    this._usageTimer = setInterval(() => {
      if (document.hidden) return;
      seconds += TICK;
      try { localStorage.setItem(KEY, String(seconds)); } catch (e) { /* quota/private mode */ }
      if (seconds >= THRESHOLD) fire();
    }, TICK * 1000);
  }

  /**
   *
   */
  restart() {
    wsRouter.resetSocket();
    this.onDomRefresh();
  }

  /**
   *
   */
  _updateAvatar(model) {
    // Refresh the sidebar-bottom avatar + user name after the user updates
    // their avatar/profile in Account settings. Fires on the "avatar-changed"
    // broadcast (no model arg) and on Visitor model changes.
    const changed = model && model.changed;
    if (changed && !(changed.profile || changed.avatar || changed.mtime))
      return;
    this.ensurePart("sidebar-avatar").then((p) => {
      if (p && _.isFunction(p.restart)) p.restart(1);
    });
    this.ensurePart("sidebar-username").then((p) => {
      if (p && p.el) {
        const el = p.el.querySelector(".note-content") || p.el;
        el.textContent = Visitor.firstname() || "";
      }
    });
  }

  /**
   * Write the unread figure to EVERY badge that shows it.
   *
   * There are two since the topbar gained its utility cluster (Figma
   * 43:23955): the rail row's numeric pill and the bell's dot. They read the
   * same number, so they are filled from one place — updating only the rail
   * left the bell permanently unmarked.
   */
  _writeActivityCount(unread) {
    const n = parseInt(unread, 10) || 0;
    const content = n > 99 ? "99+" : String(n);
    // Three surfaces: the desktop cluster's bell, the phone bar's bell, and
    // the go-to sheet's notifications tile. (The old drawer's 'activity-count'
    // is gone with the drawer.) They read the same number, so they are filled
    // from one place — updating only some left the others permanently unmarked.
    ["activity-count-top", "activity-count-mobile", "activity-count-sheet"].forEach((pn) => {
      this.ensurePart(pn).then((p) => {
        if (!p || !p.el) return;
        // Blank at zero, matching the existing badge convention — the skin
        // hides it on data-count="0" AND on :empty, so both agree.
        p.el.innerText = n === 0 ? "" : content;
        p.el.dataset.count = content;
      });
    });
  }

  // ── Workspaces ─────────────────────────────────────────────────────────────

  /**
   * The workspaces this user can open, newest-ranked first.
   *
   * Same `desk.home type=node` payload the sidebar list used, and the same
   * filter it applied in prepareData: hubs only in a collaborative area, plus
   * home-root FOLDERS (a Personal workspace is a personal-area folder, not a
   * hub) which get area=personal stamped because desk.home leaves it null.
   * Hubs sort above folders, mirroring the list's comparator.
   *
   * Cached: both the switcher menu and the boot default read it, and it is a
   * network call. Refreshed on demand via `force`.
   */
  async _fetchWorkspaces(force) {
    if (this._workspaces && !force) return this._workspaces;
    let rows = [];
    try {
      rows = await this.fetchService(SERVICE.desk.home, {
        hub_id: Visitor.id,
        type: "node",
        // Cache-buster, on the FORCED path only.
        //
        // `fetchService` is a GET and ui-essentials builds it with
        // `cache: "default"` (socket/utils.js), so a repeat of this exact URL
        // can be answered from the browser's HTTP cache. Every forced refetch
        // here is a read-after-WRITE — a workspace was just created — which is
        // precisely the case that gets served the pre-create response and
        // leaves the new workspace missing from the switcher until a reload.
        // A scalar param makes the URL unique and forces the miss.
        //
        // Only when forced: the boot read wants the cache, and busting it there
        // would cost a request on every desk mount for nothing.
        ...(force ? { _ts: Date.now() } : {}),
      });
    } catch (e) {
      this.warn && this.warn("[workspaces] desk.home failed", e);
      return [];
    }
    // A list service with exactly one row answers with the object itself, not
    // a one-element array — normalise before filtering or the switcher empties.
    if (rows && !_.isArray(rows)) rows = [rows];
    if (!_.isArray(rows)) rows = [];

    const list = rows
      .filter((it) => {
        if (!it) return false;
        // GONE, BUT STILL SENT. `desk.home` can answer with a row whose
        // workspace no longer exists, and nothing here used to drop it — which
        // is why deleted workspaces stayed in the switcher until a reload.
        //
        // It is a server-side asymmetry in mfs_show_node_by (common/procedures/
        // mfs), the proc `desk.home` runs. For a hub it FILTERS on the media
        // placeholder's status:
        //
        //   WHERE ... m.`status` NOT IN ('hidden', 'deleted')
        //
        // but RETURNS the entity's:
        //
        //   COALESCE(he.status, m.status) AS status
        //
        // A hub whose entity is deleted or frozen keeps an `active` placeholder
        // row under the user's home, so it passes the filter and comes back
        // carrying `status: "deleted"`. Verified against the deployed proc, not
        // just the repo copy.
        //
        // So trust the status field the server does send. Allow-list rather
        // than deny-list on `deleted`: the same asymmetry leaks `frozen` and
        // `system` (the "System" public hub is one, and it was being listed as
        // a user workspace), and there is no reason to enumerate every value
        // the entity table may hold.
        //
        // A MISSING status still passes. Every row the proc emits carries one
        // — `m.status` is NOT NULL and the COALESCE always resolves — but if a
        // server ever stops sending it, an allow-list read strictly would blank
        // the entire switcher, and an over-full menu beats an empty one.
        if (it.status && it.status !== "active") return false;
        if (it.filetype === _a.folder) return true;
        if (it.filetype === _a.hub) {
          return /^(share|private|restricted|public)$/.test(it.area);
        }
        return false;
      })
      .map((it) =>
        it.filetype === _a.folder && !it.area ? { ...it, area: _a.personal } : it,
      );
    // Stable: hubs (0) before folders (1), server rank preserved within each.
    this._workspaces = _.sortBy(list, (it) =>
      it.filetype === _a.folder ? 1 : 0,
    );
    return this._workspaces;
  }

  /**
   * The payload Wm.loadWorkspace wants for one row.
   *
   * The rules moved to libs/workspace-target so the home grid's tile click
   * resolves rows exactly as this does — a tile and its switcher row are the
   * same workspace, fed from the same desk.home payload.
   */
  _workspaceTarget(row) {
    return require("libs/workspace-target").workspaceTarget(row);
  }

  /**
   * One workspace's identity in the switcher.
   *
   * NOT hub_id. A Personal workspace is a home-root FOLDER, and every one of
   * them carries the USER's own hub_id — so keyed on hub_id alone, all of a
   * user's personal workspaces are the same workspace. That is what made
   * selecting one row under "Personal" light every row in the section, and it
   * made clicking any of them open the first one, because the lookup found
   * whichever matched that shared id first.
   *
   * The sidebar has always keyed these correctly (workspace-list
   * `getWorkspaceKey`, with the reason written out); this is the same rule, in
   * the one place the switcher can share it.
   *
   * Prefixed so a folder nid can never collide with a hub id, and so a null
   * key is obviously null rather than an accidental "".
   *
   * @param {Object} row a desk.home row, or Wm._curWorkspace
   * @returns {String|null}
   */
  _workspaceKey(row) {
    if (!row) return null;
    // THREE SIGNALS, because no single one survives both shapes.
    //
    //   filetype   a desk.home row has it; Wm._curWorkspace does not.
    //   area       libs/workspace-target pins `personal` on a folder TARGET,
    //              but loadWorkspace then overwrites _curWorkspace.area from
    //              media.attributes — and a home-root folder's area is NULL in
    //              the database. So an OPEN personal workspace arrives here
    //              with no area at all, and area alone read it as a hub: its
    //              key came out `hub:<user id>`, matched none of the
    //              `folder:<nid>` rows, and the switcher header went blank.
    //   hub_id     the reliable one. A personal workspace IS the user, so its
    //              hub_id is Visitor.id; a real hub's is its own.
    //
    // Not `nid !== hub_id`, which looks like a structural test and is not: an
    // open HUB's nid is the workspace ROOT node, so the two differ there too.
    const isFolder =
      row.filetype === _a.folder ||
      row.area === _a.personal ||
      (row.hub_id != null && `${row.hub_id}` === `${Visitor.id}`);
    const id = isFolder ? row.nid || row.id : row.hub_id || row.id;
    if (id == null || id === "") return null;
    return `${isFolder ? "folder" : "hub"}:${id}`;
  }

  /**
   * Split the switcher's rows into the types the user chose when creating them.
   *
   * The vocabulary is the CREATE DIALOG's, not a new one invented here —
   * tutorial/skeleton/toolkit/workspace-dialog TYPES maps internal -> private,
   * external -> share, personal -> a home-root folder. Listing a workspace
   * under the type it was created as is the whole point; a second, different
   * taxonomy would be worse than none.
   *
   * `dmz` joins External because it is the share area's variant — window/hub.js
   * openSettings already treats the two as one case. `restricted` joins
   * Internal: wm/index.js calls {share, private, restricted, public} the
   * collaborative set, and restricted is the one that is not outward-facing.
   *
   * FOLDERS are personal whatever their area says: _fetchWorkspaces only
   * defaults a missing area to `personal`, so filetype is the reliable test.
   *
   * Nothing is ever dropped. A row matching no rule keeps the generic
   * "Workspaces" heading at the end rather than vanishing — this menu is the
   * only global way to change workspace, so an unlisted one is unreachable,
   * not merely unlabelled. That is what makes a new area on the server a
   * cosmetic problem here instead of a functional one.
   *
   * @param {Array} rows desk.home workspaces, already ordered
   * @returns {Array} [{ label, rows }] — empty groups omitted
   */
  _groupWorkspaces(rows) {
    const isFolder = (r) => r.filetype === _a.folder;
    const inArea = (...areas) => (r) => !isFolder(r) && areas.includes(r.area);
    const defs = [
      { label: LOCALE.INTERNAL, match: inArea(_a.private, _a.restricted) },
      { label: LOCALE.EXTERNAL, match: inArea(_a.share, _a.dmz) },
      { label: LOCALE.PUBLIC, match: inArea(_a.public) },
      { label: LOCALE.PERSONAL, match: isFolder },
    ];
    const groups = defs.map((d) => ({ label: d.label, rows: [] }));
    const rest = [];
    for (const r of rows || []) {
      const i = defs.findIndex((d) => d.match(r));
      if (i === -1) rest.push(r);
      else groups[i].rows.push(r);
    }
    if (rest.length) groups.push({ label: LOCALE.WORKSPACES, rows: rest });
    return groups.filter((g) => g.rows.length);
  }

  /**
   * Fill the switcher's header: the open workspace's glyph, its name, then
   * the link and overflow actions.
   *
   * Its own method because the highlight sync needs JUST this — the header
   * NAMES the current workspace, so it has to change when the workspace does,
   * while the rows below only need an attribute flipped. Re-feeding the whole
   * menu to repaint one row would rebuild every row on every navigation.
   *
   * The link opens Manage access and the ⋯ opens the workspace menu; both are
   * Buttons, since image_svg views raise no ui event. The link is rendered
   * only for external workspaces — see below.
   *
   * `cur` carries only what Wm tracks, so the name and the area come from the
   * matching row in the payload the list is built from — the row is what knows
   * the area the glyph is tinted by.
   */
  _feedWorkspaceHead(head, rows, cur) {
    const cn = "desk-module-topbar";
    // By KEY. Matching on hub_id put the FIRST personal workspace in the header
    // whichever one was open, because they all carry the user's own — the same
    // collision that lit the whole "Personal" section at once.
    const curKey = this._workspaceKey(cur);
    const curRow =
      (curKey && (rows || []).find((r) => this._workspaceKey(r) === curKey)) ||
      null;
    if (!curRow) return head.feed([]);
    return head.feed([
      Skeletons.Element({
        className: `${cn}__ws-head-icon ${curRow.area || ""}`,
        content: folderIcon({
          area: curRow.area,
          filetype: curRow.filetype === _a.folder ? _a.folder : _a.hub,
          role: curRow.filetype === _a.folder ? "" : "desk",
          widgetId: _.uniqueId("ws-head-icon-"),
          isAttachment: 1,
        }),
      }),
      Skeletons.Box.X({
        className: `${cn}__ws-head-name`,
        kids: [
          Skeletons.Note({
            className: `${cn}__ws-head-name-text`,
            content: curRow.filename || curRow.name || "",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${cn}__ws-head-actions`,
        kids: [
          // EXTERNAL workspaces only. The chain link stands for the share link
          // that lets someone outside reach the workspace, and only an external
          // one has such a link — an internal (private/team) workspace is
          // reached by being a member. Same split that decides which panel the
          // rail's Access opens (window/folder _manageAccessIsInternal), and
          // the pair window/hub.js openSettings treats as external.
          //
          // Rendering it everywhere offered a link that does not exist for most
          // workspaces. The ⋯ beside it is NOT gated — rename, duplicate and
          // delete apply to every workspace.
          //
          // A Button, not an Image.Svg: image_svg views raise no ui event, so a
          // service on one would never reach a handler — the same reason the ⋯
          // beside it had to become one.
          [_a.share, _a.dmz].includes(curRow.area)
            ? Skeletons.Button.Svg({
                className: `${cn}__ws-head-action`,
                ico: "apps-link-simple",
                service: "workspace-access",
                uiHandler: [this],
              })
            : null,
          // A real Button: an Image.Svg raises no ui event, so the ⋯ could
          // never open anything. The link icon beside it stays an Image.Svg —
          // its behaviour is still undecided, and a control that looks
          // clickable and does nothing is worse than one that looks inert.
          Skeletons.Button.Svg({
            className: `${cn}__ws-head-action ${cn}__ws-head-action--more`,
            ico: "ph-dots-three",
            service: "workspace-menu",
            uiHandler: [this],
          }),
          // The link above is null on a non-external workspace.
        ].filter(Boolean),
      }),
    ]);
  }

  /**
   * Fill the switcher dropdown.
   *
   * Takes the part when the caller already has it (onPartReady hands over the
   * child) — getPart is not reliable at that moment, the part is still being
   * registered, and returning early there left the menu permanently empty.
   *
   * @param {Object} [target] the ws-list part, when the caller holds it
   * @param {Boolean} [force] refetch instead of serving the cached rows. Set by
   *   the workspace:refresh handler, where the cache is known to be one
   *   workspace out of date.
   */
  async _renderWorkspaceMenu(target, force) {
    const part = target || (this.getPart && this.getPart("ws-list"));
    // Two parts are filled from here now (the list and the header), and they
    // become ready in no fixed order, so each caches itself on arrival and this
    // runs once per arrival. Re-checking `alive` rather than trusting the cache
    // matters because the menu is rebuilt on every topbar render — a stale part
    // from the previous tree is destroyed but still referenced.
    const alive = (p) => !!(p && p.el && !(p.isDestroyed && p.isDestroyed()));
    if (alive(part)) this._wsListPart = part;
    const list = alive(this._wsListPart) ? this._wsListPart : null;
    const head = alive(this._wsHeadPart) ? this._wsHeadPart : null;
    if (!list && !head) return;
    const rows = await this._fetchWorkspaces(force);
    if (!rows.length) {
      if (head) head.clear();
      return list
        ? list.feed([
            Skeletons.Note({
              className: "desk-module-topbar__ws-empty",
              content: LOCALE.NO_CONTENT || "",
            }),
          ])
        : undefined;
    }
    // window.Wm, NOT a bare `Wm`: this runs from onPartReady during the first
    // topbar render, which happens BEFORE window/manager.js:53 assigns the
    // global. A bare identifier throws ReferenceError there; window.Wm is
    // merely undefined.
    // window.Wm, NOT a bare `Wm`: this runs from onPartReady during the first
    // topbar render, which happens BEFORE window/manager.js:53 assigns the
    // global. A bare identifier throws ReferenceError there.
    const cur = (window.Wm && window.Wm._curWorkspace) || null;

    // The workspace's OWN icon — the area-tinted folder shape from
    // media/grid/template/folder, the same module the sidebar's workspace_item
    // renders through getFolderIcon.
    //
    // This previously used raw-drumee-folder-blue/purple/orange/green, copied
    // from desk_breadcrumb. Those names exist in NEITHER sprite: the breadcrumb
    // computes them into a `folderIcon` variable it never uses, so the mapping
    // is dead code there and these rows were drawing nothing at all.
    const glyph = (row) =>
      folderIcon({
        area: row.area,
        filetype: row.filetype === _a.folder ? _a.folder : _a.hub,
        role: row.filetype === _a.folder ? "" : "desk",
        widgetId: _.uniqueId("ws-menu-icon-"),
        isAttachment: 1,
      });

    const cn = "desk-module-topbar";
    const curKey = this._workspaceKey(cur);
    const rowFor = (row) => {
      const hubId = row.hub_id || row.id;
      const wsKey = this._workspaceKey(row);
      // By KEY, not by hub_id: personal workspaces all share the user's, so
      // comparing ids marked every one of them current at once.
      const isCurrent = !!wsKey && wsKey === curKey;
      return Skeletons.Box.X({
        className: `${cn}__ws-item`,
        service: "switch-workspace",
        uiHandler: [this],
        wsKey,
        // Kept alongside wsKey: other per-row consumers read it (the phone's
        // sheet re-dispatch carries the cmd along for exactly this).
        wsHubId: hubId,
        attrOpt: {
          "data-current": isCurrent ? "1" : "0",
          "data-area": row.area || "",
        },
        kidsOpt: { active: 0 },
        kids: [
          // Element + content, NOT Image.Svg + ico: media/grid/template/folder
          // returns an HTML STRING, while `ico` names a sprite symbol. Passing
          // the markup as a name built `<use href="#<markup>">`, which resolves
          // to nothing and rendered as a broken oversized glyph. Same treatment
          // the inbox's workspace rows use (chatcontact-item skeleton).
          Skeletons.Element({
            className: `${cn}__ws-item-icon ${row.area || ""}`,
            content: glyph(row),
          }),
          Skeletons.Note({
            className: `${cn}__ws-item-name`,
            content: row.filename || row.name || "",
          }),
        ],
      });
    };

    // Personal workspaces are home-root FOLDERS, hub workspaces are hubs.
    // _fetchWorkspaces already sorts hubs first, so a single boundary splits
    // them and each group gets a heading instead of one undifferentiated list.
    // `group`, not `list` — the outer `list` is the part being fed, and
    // shadowing it here would read as though the section fed itself.
    const section = (label, group) =>
      group.length
        ? [
            Skeletons.Note({
              className: `${cn}__ws-section`,
              content: label,
            }),
            ...group.map(rowFor),
          ]
        : [];

    if (list) {
      list.feed(
        this._groupWorkspaces(rows).flatMap((g) => section(g.label, g.rows)),
      );
    }

    // ── Header (Figma 48:36991) ──────────────────────────────────────────
    if (head) this._feedWorkspaceHead(head, rows, cur);
  }

  /**
   * Show the open workspace's name on the switcher.
   *
   * A no-op in the current shell: the trigger is a caret only, because
   * desk_breadcrumb already renders [folder icon] + workspace name right
   * beside it and two copies read as a duplicate. Kept (and kept harmless via
   * the missing-part guard) so a trigger that does carry a label — a narrow
   * breakpoint, say — needs no new wiring.
   */
  _setWorkspaceLabel(name) {
    const p = this.getPart && this.getPart("ws-current");
    if (!p || !p.el) return;
    const el =
      p.el.querySelector(".note-content .root-node") ||
      p.el.querySelector(".note-content") ||
      p.el;
    el.textContent = name || LOCALE.WORKSPACES;
  }

  /**
   * Resolve the open workspace's name from the window manager's context and
   * show it on the switcher. Falls back to the generic label when none is open.
   *
   * window.Wm, never a bare `Wm`: this is reached from the breadcrumb:content
   * broadcast, which the window manager emits from inside its own initialize —
   * BEFORE manager.js:53 assigns the global. A bare identifier throws
   * ReferenceError there.
   */
  /**
   * Close the switcher's ⋯ menu if one is open.
   *
   * Shared, because two paths end here: the toggle below, and the menu's own
   * destruction — which happens without us when the user clicks anywhere else
   * (`volatility: 4`). Both must clear the button's active mark, or a dismissed
   * menu leaves the ⋯ lit.
   *
   * @returns {Boolean} whether there was a menu to close
   */
  _closeWorkspaceMenu() {
    const menu = this._wsMenu;
    const btn = this._wsMenuBtn;
    this._wsMenu = null;
    this._wsMenuBtn = null;
    // The header is re-fed whenever the workspace changes, which destroys the
    // button along with it — so a tracked ref can outlive its view.
    if (btn && !(btn.isDestroyed && btn.isDestroyed()) && _.isFunction(btn.setState)) {
      btn.setState(0);
    }
    if (!menu || (menu.isDestroyed && menu.isDestroyed())) return !!menu;
    if (_.isFunction(menu.goodbye)) menu.goodbye({ now: true });
    else if (_.isFunction(menu.destroy)) menu.destroy();
    return true;
  }

  /**
   * The switcher header's ⋯ — toggles the open workspace's own menu.
   *
   * Built the way a right-click builds one (ui-core letc.js buildContextmenu):
   * rows from builtins/contextmenu/skeleton/items, a `.drumee-contextmenu` box
   * fed into the global drumeeDialog part, `volatility: 4` so a click elsewhere
   * dismisses it, and the same viewport clamp. Position comes from the button's
   * own rect rather than a pointer event — media/grid dispatchUiEvent does the
   * same for its kebab, because a synthetic 'contextmenu' event does not reach
   * property-style oncontextmenu handlers.
   *
   * NOT the home tile's menu, though that was the obvious thing to borrow:
   * loadWorkspaceNode repoints the grid's list to media.show_node_by and
   * resets its collection, so the tile for the open workspace is not reliably
   * mounted — and its items act on a media row, not on the workspace.
   *
   * `uiHandler` is the WINDOW, not this module: window_folder already
   * implements every service these rows raise, so nothing new handles them.
   *
   * The two gates are the desk's existing ones, which fail OPEN by design —
   * they can only ever remove a row from someone provably lacking the right,
   * never block a member whose privilege could not be read.
   */
  _toggleWorkspaceMenu(cmd, retried) {
    // Second click: shut it and stop. `volatility: 4` listens on POINTERDOWN,
    // which precedes this click, so the menu has already queued its own
    // destroy — but on a 300ms timeout, so it is still alive right now. Without
    // closing here the click would fall through and feed a second menu on top.
    //
    // Not on the RETRY below: that is the same press continuing, and closing
    // there would answer a menu this press never opened.
    if (!retried && this._closeWorkspaceMenu()) return;

    const w = this._activeWorkspace();
    // Every row acts on an open workspace; with none there is nothing to act
    // on, so no menu rather than an empty one.
    if (!w) return;
    const dialog = window.drumeeDialog;
    if (!dialog || (dialog.isDestroyed && dialog.isDestroyed())) return;

    // Act on the workspace's MEDIA item, never on the pane.
    //
    // loadWorkspace() feeds window_folder with no `media` and no `trigger`, so
    // getFolderActionTarget() falls back to the window — which is scoped to the
    // workspace's ROOT FOLDER (its own nid, pid "0", no filename) and is not a
    // media widget at all: no move(), no trash(), no delete(). Every row of this
    // menu was inert for that reason, and Download threw outright because
    // ui-core's download() calls filename.replace() unguarded.
    //
    // The media widget is the object the folder context menu has always acted
    // on, and it carries the HUB node: real nid, real pid, real filename.
    // The nid too: for a personal workspace hub_id is the user's own and names
    // every one of them at once. Wm._curWorkspace is the workspace ROOT, which
    // the pane's own nid is not once the user has browsed into a subfolder.
    const _cur = (window.Wm && window.Wm._curWorkspace) || null;
    const _wsHub = w.mget && w.mget(_a.hub_id);
    const media = this._workspaceMediaItem(
      _wsHub,
      _cur && `${_cur.hub_id}` === `${_wsHub}` ? _cur.nid : w.mget && w.mget(_a.nid),
    );
    const target = media || w;

    // Trashing a workspace removes its tile from the grid (media/core.js
    // answers the media.trash broadcast with `_e.deleted` + suppress), but the
    // switcher reads its OWN cached list and the pane keeps showing a workspace
    // that no longer exists — a blank screen until a reload. Listen for that
    // signal here. Attached at most once per tile: the menu can be opened any
    // number of times before a delete ever happens.
    if (media && !media.__wsDeleteHooked && _.isFunction(media.once)) {
      media.__wsDeleteHooked = 1;
      media.once(_e.deleted, () => this._onWorkspaceDeleted(media));
    }

    // Rows come from the canonical builder (media/core.js
    // contextmenuItemsForFolder, "Sectioned Folder menu spec 2026-06-10") —
    // the same list the grid's right-click menu renders, already privilege-
    // gated and already carrying the labels Lexis asked for: makeACopy is
    // "Make a copy", trash is "Move to trash", info is "Get info".
    //
    // Building a parallel vocabulary here is what broke this menu once: those
    // rows duplicated items that already existed and raised services the pane
    // could not answer.
    const item = require("builtins/contextmenu/skeleton/items");

    // Removing a row can leave the divider that framed it, so the list is
    // tidied rather than trusted: no leading rule, no trailing rule, never two
    // in a row. The builder's own sectioning is otherwise passed through.
    const tidy = (list) => {
      const out = [];
      for (const k of list) {
        if (k === "separator" && (!out.length || out[out.length - 1] === "separator")) continue;
        out.push(k);
      }
      while (out.length && out[out.length - 1] === "separator") out.pop();
      return out;
    };

    const keys = media && _.isFunction(media.contextmenuItemsForFolder)
      ? tidy(
          media
            .contextmenuItemsForFolder()
            // Lexis' menu (Figma wd3) shows Move as a FLAT row. `organize` is
            // the submenu wrapping Move + "Link to task tracker" (items.js).
            // Swapped here only — the grid's own menu keeps its submenu.
            .map((k) => (k === "organize" ? "move" : k))
            // Not in Lexis' menu. The builder adds a secure-share row on a
            // `share` workspace, but sharing already has two doors — the
            // header's chain icon and the rail's Access — and a third one here
            // is the duplication this menu was just cleared of.
            .filter((k) => k !== "secureShare" && k !== _a.share),
        )
      : [];

    // NO MEDIA ITEM. Every row would be inert, and a menu whose rows do nothing
    // is the bug this replaced — so rather than show one, go and get the grid.
    //
    // _refreshHomeGrid explains why it can be missing: a workspace created
    // while another is open never gets a tile, so the ⋯ was dead until a page
    // reload. That is now repaired at the source, on the create; this is what
    // makes a stale grid cost a beat instead of a dead click, whatever emptied
    // it — a session that booted straight into a restored workspace, say.
    //
    // ONCE. A second miss means the workspace genuinely is not in the grid
    // (it is beyond the list's first page, or gone), and re-fetching for every
    // press would be a request per click with nothing to show for it.
    if (!keys.length) {
      if (retried) return;
      this._refreshHomeGrid().then(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        if (!cmd || (cmd.isDestroyed && cmd.isDestroyed())) return;
        this._toggleWorkspaceMenu(cmd, 1);
      });
      return;
    }

    // THE TRIGGER IS THE MEDIA ITEM, not the ⋯ button.
    //
    // ui-core's buildContextmenu calls `p.contextmenuSkeleton(p, trigger, e)`
    // with the tile as BOTH, and builtins/contextmenu/skeleton then passes that
    // same pair down to every row. Handing `cmd` here made this menu the only
    // caller in the app whose rows are built against a different trigger than
    // their handler. No row reads it today, so this changes nothing that runs —
    // it removes a difference that would decide the behaviour the day one does.
    const kids = keys.map((k) => item(target, target, k)).filter(Boolean);
    if (_.isEmpty(kids)) return;

    const rect = cmd && cmd.el && _.isFunction(cmd.el.getBoundingClientRect)
      ? cmd.el.getBoundingClientRect()
      : { left: 0, right: 0, top: 0, bottom: 0 };
    // ANCHORED TO THE CARD, NOT TO THE ⋯ (Figma: the menu sits beside the
    // switcher panel, its top level with the panel's).
    //
    // The ⋯ is the last chip of __ws-head, which is the first row INSIDE the
    // switcher card — so anchoring to the button drops the menu over the very
    // workspace list the user is choosing from. Beside the card it covers
    // nothing, and it reads as what it is: a flyout off that panel.
    //
    // .menu-topic-items is the card that paints the border and background
    // (topbar.scss __ws-wrapper); the wrapper around it and __ws-menu inside it
    // are the fallbacks, then the button itself if the ⋯ is ever mounted
    // outside a card at all.
    const WS_MENU_GAP = 8;
    const card =
      (cmd &&
        cmd.el &&
        _.isFunction(cmd.el.closest) &&
        (cmd.el.closest(".menu-topic-items") ||
          cmd.el.closest(".menu-topic-items__wrapper") ||
          cmd.el.closest(".desk-module-topbar__ws-menu"))) ||
      null;
    const anchor =
      card && _.isFunction(card.getBoundingClientRect)
        ? card.getBoundingClientRect()
        : rect;
    dialog.feed(
      Skeletons.Box.Y({
        volatility: 4,
        // `drumee-contextmenu <family> desk-module-topbar`: the family is what
        // buildContextmenu stamps (`drumee-contextmenu ${p.fig.family}`), so a
        // rule written for the grid's menu reaches this one too — the two are
        // the same menu on the same target, opened from two places. The topbar
        // token stays last for this module's own positioning rules.
        className: `drumee-contextmenu ${
          (target.fig && target.fig.family) || "media-grid"
        } desk-module-topbar`,
        uiHandler: [target],
        kids,
        style: {
          // The final placement is applied below, once the panel has a size to
          // measure. This is the same position minus the clamps, so a panel
          // that somehow never gets measured still lands beside the card
          // rather than at 0,0.
          left: anchor.right + WS_MENU_GAP + (window.scrollX || 0),
          top: anchor.top + (window.scrollY || 0),
          zIndex: 100000,
        },
      }),
    );
    const l = dialog.children && dialog.children.last();
    if (!l || !l.el) return;

    // Lit while the menu is up. Cleared from the menu's own destroy so that
    // EVERY way out clears it — the volatility dismissal never comes back
    // through this module.
    this._wsMenu = l;
    this._wsMenuBtn = cmd;
    if (_.isFunction(cmd.setState)) cmd.setState(1);
    if (_.isFunction(l.once)) {
      l.once(_e.destroy, () => {
        if (this._wsMenu === l) this._closeWorkspaceMenu();
      });
    }

    // BESIDE THE CARD: its left edge a hair off the card's right, tops level.
    //
    // It used to be fed `left: rect.right` against the BUTTON, which puts the
    // panel's left edge on the ⋯'s right edge — 200px of menu hanging into
    // empty topbar, clear of the card and attached to nothing.
    //
    // offsetWidth / offsetHeight, not jQuery's .width() / .height(): those
    // return the CONTENT box, and this panel carries 6px of padding and a 1px
    // border on each side, so measuring that way placed it 14px off.
    const mw = l.el.offsetWidth;
    const mh = l.el.offsetHeight;
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const EDGE = 8;

    // Right of the card, or LEFT of it when there is no room — never spilling
    // off the viewport, and never back over the card it belongs to.
    let left = anchor.right + WS_MENU_GAP + scrollX;
    if (left + mw > scrollX + window.innerWidth - EDGE) {
      const flipped = anchor.left - WS_MENU_GAP - mw + scrollX;
      left = flipped >= scrollX + EDGE
        ? flipped
        : Math.max(scrollX + EDGE, scrollX + window.innerWidth - EDGE - mw);
    }
    l.el.style.left = `${left}px`;

    // Tops level with the card, slid up only as far as a tall menu needs.
    let top = anchor.top + scrollY;
    if (top + mh > scrollY + window.innerHeight - EDGE) {
      top = Math.max(scrollY + EDGE, scrollY + window.innerHeight - EDGE - mh);
    }
    l.el.style.top = `${top}px`;
  }

  /**
   * Move the switcher's tick to whichever workspace is now open.
   *
   * `data-current` is computed in rowFor at FEED time, so it only ever reflects
   * the workspace that was open when the list was last built. Every entry point
   * other than the switcher itself — a home-grid tile, a sidebar row, a deep
   * link, reload-restore — changes the workspace without re-feeding, and the
   * tick stayed on the previous one.
   *
   * In place, not a re-feed: rebuilding the list destroys and recreates every
   * row plus the header on each navigation, and would yank the ground out from
   * under an open menu. Only the header is re-fed — it NAMES the current
   * workspace, so it genuinely has to change.
   *
   * `==`, not `===`: hub ids arrive as strings from desk.home and as numbers
   * from some deep links, exactly as rowFor's own isCurrent test allows for.
   */
  _syncWorkspaceHighlight() {
    const list = this._wsListPart;
    if (!list || !list.el || (list.isDestroyed && list.isDestroyed())) return;
    const cur = (window.Wm && window.Wm._curWorkspace) || null;
    const curKey = this._workspaceKey(cur);
    if (list.children && _.isFunction(list.children.each)) {
      list.children.each((row) => {
        // Section headings are children too and carry no key.
        if (!row || !row.el || !row.el.dataset || !row.mget) return;
        const rowKey = row.mget("wsKey");
        if (rowKey == null) return;
        // Same key comparison as rowFor — the two must agree, or a re-render
        // and an in-place pass would disagree about which row is current.
        row.el.dataset.current = curKey && rowKey === curKey ? "1" : "0";
      });
    }
    // The header alone — NOT _renderWorkspaceMenu, which re-feeds the rows too
    // and would undo the point of the in-place pass above. _workspaces is the
    // cache _fetchWorkspaces fills, so this needs no request.
    const head = this._wsHeadPart;
    if (head && head.el && !(head.isDestroyed && head.isDestroyed())) {
      this._feedWorkspaceHead(head, this._workspaces || [], cur);
    }
  }

  /**
   * `workspace:refresh` — a workspace was created; rebuild the switcher.
   *
   * Fired by libs/create-workspace for all three types, so this is the one
   * place that has to know a workspace list went stale. See the subscription in
   * initialize for why it lives on the desk and not in the two dialogs.
   *
   * FORCED, and that word is the whole fix. `_fetchWorkspaces` caches, and the
   * two existing callers are mount-time — so without `force` this would re-feed
   * the rows from the same pre-create array and change nothing visible. Forcing
   * also REPLACES `this._workspaces`, which is what makes a later unforced
   * render correct too: the topbar is rebuilt when a workspace opens, and its
   * `onPartReady` render reads the cache.
   *
   * `_syncWorkspaceLabel` after, because its "not in the cached index (…created
   * since boot)" fallback is now answerable from the index itself.
   *
   * Deliberately does NOT switch to the new workspace. Who opens it differs per
   * surface — the dialog chains to the members panel, the tour's host opens it
   * once the walkthrough is done — and a switcher that navigated on a broadcast
   * would fight both.
   */
  async _onWorkspaceCreated(payload = {}) {
    // Was the desk on the no-workspace screen? Read the stamp BEFORE anything
    // refetches, because that is what decides whether the user needs taking
    // into the workspace they just made.
    const wasEmpty = !!(
      this.el && this.el.dataset && this.el.dataset.noWorkspace === "1"
    );

    // No part yet (created before the topbar mounted, or during a rebuild):
    // dropping the cache is still the right move, so the mount-time render
    // that follows fetches fresh instead of serving the stale array.
    const alive = (p) => !!(p && p.el && !(p.isDestroyed && p.isDestroyed()));
    if (!alive(this._wsListPart) && !alive(this._wsHeadPart)) {
      this._workspaces = null;
    } else {
      await this._renderWorkspaceMenu(this._wsListPart, true);
      this._syncWorkspaceLabel();
    }

    // The HOME GRID has to be refreshed too, and not for its own sake: its
    // tiles are what the workspace ⋯ menu is built from, and a create while a
    // workspace is open never reaches it. See _refreshHomeGrid.
    //
    // Not awaited — nothing below depends on the tiles, and this handler is on
    // the path that opens a freshly created workspace.
    this._refreshHomeGrid();

    // CREATED FROM THE EMPTY SCREEN → open it. Forced, because the create
    // happened after the cache was read and step 1 must see the new workspace
    // rather than the empty list it was built from.
    //
    // Only from empty. Every other create surface decides its own follow-up —
    // the dialog chains to the members panel, the tour's host opens it once the
    // walkthrough ends — and opening one here would fight both.
    if (wasEmpty) {
      // A PERSONAL workspace raises no follow-up panel — it is a home-root
      // folder, not a hub, so media/form finishes as soon as it exists. Nothing
      // to wait for, so open it now.
      if (payload.personal) {
        await this._openWorkspaceOrEmptyScreen({ force: true });
        return;
      }
      // INTERNAL / EXTERNAL: wait for "Who has access" to be dismissed first.
      // See _openWorkspaceAfterAccessPanel for why it cannot be done now.
      this._openWorkspaceAfterAccessPanel();
      return;
    }

    // Otherwise just keep the screen honest: a create cannot make the desk
    // empty, but a REMOVAL reaches this same handler (ws:event) and can.
    await this._showEmptyWorkspaceScreen(
      !((await this._fetchWorkspaces()) || []).length,
    );
  }

  /**
   * REFETCH THE HOME GRID.
   *
   * The grid's tiles are not just decoration — the workspace ⋯ menu is built
   * from one (_workspaceMediaItem), because only a media widget carries the
   * privilege-gated row list and can be the target the rows act on. So a stale
   * grid is a dead ⋯ button.
   *
   * And the grid goes stale on every create, always. Wm inherits newContent
   * from window/utils, whose first test is
   *
   *     if (this.mget(_a.nid) != pid) return;
   *
   * — only add what belongs to the folder you are showing. While a workspace is
   * open, loadWorkspace's `apply()` has done `this.mset(data)` with that
   * WORKSPACE's attributes, so Wm's nid is the workspace root while the new
   * workspace's pid is the HOME root. They never match, the tile is never
   * appended, and the ⋯ stayed dead until a reload put Wm's nid back to
   * home_id (Wm.reload) and the List.Smart fetched from scratch. That is
   * exactly the reported "must refresh to open it".
   *
   * A restart rather than a targeted append: the list owns its own paging and
   * ordering, and desk.home is the same request it made to build itself.
   *
   * @returns {Promise} settles when the list has answered, or after 2s
   */
  _refreshHomeGrid() {
    const wm = window.Wm;
    const list = wm && wm.iconsList;
    if (!list || !list.el || (list.isDestroyed && list.isDestroyed())) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      let done = 0;
      const finish = (v) => {
        if (done) return;
        done = 1;
        resolve(v);
      };
      // The collection answering is the signal; the timer is the floor, because
      // a fetch that fails or returns nothing raises no update at all and the
      // caller must not be left hanging on it.
      try {
        if (list.collection && _.isFunction(list.collection.once)) {
          list.collection.once("update", () => finish(true));
        }
        list.restart();
      } catch (e) {
        this.warn && this.warn("[home-grid] restart failed", e);
        return finish(false);
      }
      setTimeout(() => finish(false), 2000);
    });
  }

  /**
   * MAKE THE ADDRESS CHIP THE SWITCHER'S BUTTON.
   *
   * A CAPTURE-phase DOM listener, which is the only thing that works here.
   * The widget way — a `service` on __crumb-group — cannot see these clicks:
   * el.onclick is bound by every widget between the box and the pointer (the
   * breadcrumb root, the menu root, and the menu's own `.menu-trigger` part,
   * none of which ui-core marks inert), and __handleClick calls
   * stopPropagation. A click on the caret or on the workspace name was
   * swallowed there, and only the chip's few pixels of bare padding ever
   * reached the box. Capture runs root-down, before any of them.
   *
   * A CRUMB WITH SOMEWHERE TO GO STILL GOES THERE. The chip holds the whole
   * address, so a deeper path shows folders in it, and those must navigate.
   * The one the user is already on is not a destination — clicking it moves
   * nowhere — so it counts as chip, which is the common case: the address is
   * just the workspace.
   */
  _bindCrumbGroupTrigger(child) {
    const el = child && child.el;
    if (!el || !_.isFunction(el.addEventListener)) return;
    if (el.__wsTriggerBound) return;
    el.__wsTriggerBound = 1;
    el.addEventListener(
      "click",
      (e) => {
        if (!this._crumbClickOpensSwitcher(e.target)) return;
        // Nothing else answers this click: not the crumb underneath, and not
        // the menu's own RADIO_CLICK outside-close, which only runs off a
        // widget's triggerHandlers. That is what lets the toggle below be a
        // plain read of the state.
        e.preventDefault();
        e.stopPropagation();
        this._toggleWorkspaceSwitcher();
      },
      true,
    );
  }

  /**
   * Did this click land on the chip, or on a crumb that has somewhere to go?
   *
   * @param {Element} target
   * @returns {Boolean} true when the switcher should open
   */
  _crumbClickOpensSwitcher(target) {
    if (!target || !_.isFunction(target.closest)) return true;
    // THE PANEL IS NOT THE CHIP, even though it is inside it.
    //
    // .menu-topic-items__wrapper is a DESCENDANT of __crumb-group — the
    // dropdown is absolutely positioned, not detached — so every click in the
    // open panel passes through this capture listener on its way down: the ⋯,
    // the rename pencil, the share link, a workspace row, "New workspaces".
    // Treated as chip, each of them shut the panel and swallowed the click
    // that was meant for the control the user actually pressed. Reported for
    // the ⋯: it opened nothing and closed the switcher.
    //
    // Both spellings, because the wrapper is ui-core's and __ws-menu is ours;
    // a fed part that ends up outside the wrapper is still panel, not chip.
    if (
      target.closest(".menu-topic-items__wrapper") ||
      target.closest(".desk-module-topbar__ws-menu")
    ) {
      return false;
    }
    const crumb = target.closest(".breadcrumb-item__main");
    if (!crumb) return true;
    // A SECTION label carries no service — there is nothing to browse to — so
    // it is not a destination either. It is handled again in the toggle, which
    // refuses to open a workspace list over Settings or Trash.
    if (crumb.classList && crumb.classList.contains("breadcrumb-item__main--section")) {
      return true;
    }
    return crumb.dataset && crumb.dataset.current === "1";
  }

  /**
   * OPEN OR CLOSE THE WORKSPACE SWITCHER.
   *
   * The menu widget used to open itself: its caret lived in its own `trigger`
   * part, and menu_topic answers any ui event raised in there. The caret is
   * inert now and the chip around it is the button, so the toggle is driven
   * from here.
   */
  _toggleWorkspaceSwitcher() {
    const menu = this._wsSwitcher;
    if (!menu || !menu.el || (menu.isDestroyed && menu.isDestroyed())) return;
    // A SECTION screen has no workspace in the bar for the panel to hang off,
    // and the chip paints no ground there — see the `:has()` rule in
    // desk/skin/topbar.scss. Offering the list would be a control the chip is
    // not drawing.
    if (this.el && this.el.querySelector) {
      const bc = this.el.querySelector(".desk-breadcrumb__ui[data-section='1']");
      if (bc) return;
    }
    if (_.isFunction(menu._triggerToggle)) menu._triggerToggle();
  }

  _syncWorkspaceLabel() {
    const wm = window.Wm;
    const cur = wm && wm._curWorkspace;
    if (!cur || !cur.hub_id) return this._setWorkspaceLabel(null);
    const row = (this._workspaces || []).find(
      (r) => (r.hub_id || r.id) == cur.hub_id,
    );
    if (row) return this._setWorkspaceLabel(row.filename || row.name);
    // Not in the cached index (reached by deep link, or created since boot) —
    // take the name the window manager resolved for it.
    this._setWorkspaceLabel(
      _.isFunction(wm.mget) && (wm.mget(_a.hub_name) || wm.mget(_a.filename)),
    );
  }

  /** Switcher row -> open that workspace, then refresh the menu's current mark. */
  async _switchWorkspace(wsKey) {
    if (!wsKey) return;
    const rows = await this._fetchWorkspaces();
    // Matched on the KEY the row was built with. Finding by hub_id opened the
    // FIRST personal workspace whichever one was clicked, because they all
    // carry the user's own hub_id — the same collision that lit the whole
    // "Personal" section at once.
    const row = (rows || []).find((r) => this._workspaceKey(r) === wsKey);
    if (!row) return;
    if (!window.Wm || !_.isFunction(window.Wm.loadWorkspace)) return;
    // Is this row the workspace that is ALREADY open? Asked before the call,
    // because loadWorkspace overwrites _curWorkspace on its way in.
    //
    // By the same KEY the rows are marked `data-current` with, so "the row that
    // looks current" and "the row that counts as current" cannot disagree — and
    // so the personal-workspace collision _workspaceKey exists for (they all
    // carry the user's own hub_id) is not reintroduced here.
    const wasOpen = this._workspaceKey(window.Wm._curWorkspace) === wsKey;
    window.Wm.loadWorkspace(this._workspaceTarget(row));
    // ONLY on a real change of workspace. Re-picking the open one makes
    // loadWorkspace an early return that merely raises the pane, so the window
    // keeps the tab it was on — resetting the rail there would invent the very
    // mismatch this removes, in the opposite direction (a Files-lit rail over a
    // Task board).
    if (!wasOpen) this._resetRailToFiles();
    this._setWorkspaceLabel(row.filename || row.name);
    return this._renderWorkspaceMenu(this._wsListPart);
  }

  /**
   * Open a workspace on boot when nothing else claimed the screen.
   *
   * The desk used to land on an empty home grid, which the new shell has no
   * screen for — the rail's Files/Chat/Task/Meet all act on an OPEN workspace.
   * Only runs when there is no deep link and no restorable saved state, so it
   * never overrides where the user actually was.
   */
  /**
   * OPEN A WORKSPACE, OR PUT UP THE SCREEN THAT SAYS THERE ARE NONE.
   *
   * Two steps, in this order:
   *
   *   1. is there any workspace left? The list is the same one the topbar
   *      switcher (`.desk-module-topbar__ws-menu`) is fed from — so "what the
   *      switcher would show" and "what this opens" cannot disagree. If there
   *      is one, open it.
   *   2. if there is not, show desk/home-empty: logo, title, and the button
   *      that opens the create dialog.
   *
   * With 1, 2 and 3, deleting 1 lands on 2 and deleting 3 lands on 2 — step 1
   * all the way. Delete 2 as well and step 2 is the only answer left; before
   * this it returned false into six callers that all ignored it, leaving the
   * desk on a shape its own chrome cannot draw.
   *
   * REVERSIBLE, both ways. A workspace can appear without this tab doing
   * anything (someone adds you to one), so the screen has to come down again
   * without a reload — hence the state is keyed on the COUNT every time rather
   * than on "did a delete just happen".
   *
   * @param {Object} [opt]
   * @param {Boolean} [opt.force] refetch instead of serving the cached list.
   *   Set by the removal path: the cache still holds the workspace that was
   *   just deleted, and step 1 must not "find" and reopen it.
   * @returns {Promise<Boolean>} whether a workspace was opened
   */
  async _openWorkspaceOrEmptyScreen(opt = {}) {
    let rows;
    try {
      rows = await this._fetchWorkspaces(opt.force);
    } catch (e) {
      // An unreachable list is not evidence of an empty account. Leave the
      // screen as it is rather than throwing "create your first workspace" at
      // someone who has ten.
      this.warn && this.warn("[workspaces] default open failed", e);
      return false;
    }
    if (this.isDestroyed && this.isDestroyed()) return false;

    const first = rows && rows[0];
    await this._showEmptyWorkspaceScreen(!first);
    if (!first) return false;

    try {
      const wm = await this._waitForWm();
      if (!wm || !_.isFunction(wm.loadWorkspace)) return false;
      if (this.isDestroyed && this.isDestroyed()) return false;
      wm.loadWorkspace(this._workspaceTarget(first));
      return true;
    } catch (e) {
      this.warn && this.warn("[workspaces] default open failed", e);
      return false;
    }
  }

  /**
   * Show or hide the no-workspace screen.
   *
   * The stamp is what the skin reads — one rule instead of reaching into the
   * rail's five parts — and it is also how _onWorkspaceCreated learns that the
   * desk was empty before a create.
   *
   * @param {Boolean} empty
   */
  async _showEmptyWorkspaceScreen(empty) {
    if (this.el && this.el.dataset) {
      this.el.dataset.noWorkspace = empty ? "1" : "0";
    }

    // CLEAR THE TOPBAR TRACK. `.desk-module-topbar__left-cluster` holds the
    // breadcrumb, and with a workspace to fall back to it repaints itself —
    // opening one calls updateBreadcrumb. With NONE, nothing repaints it, so it
    // was left naming the workspace that had just been deleted.
    //
    // Called on the part directly, not through the `breadcrumb:content`
    // broadcast. That route reads `data.event` and compares it against
    // `_a.home`, while the desk's own existing caller sends `_e.home` — two
    // ambient lexicons, and whether they resolve to the same string is not
    // something this should be betting the clear on. `loadDefault()` is the
    // method the breadcrumb uses for this case anyway (it calls _buildContent
    // with no data, which empties the track).
    if (empty) {
      const crumb = this.getPart && this.getPart("breadcrumb");
      if (crumb && !(crumb.isDestroyed && crumb.isDestroyed())
        && _.isFunction(crumb.loadDefault)) {
        crumb.loadDefault();
      }
    }
    const slot = await this.ensurePart("home-empty-slot");
    if (!slot || !slot.el) return;
    const mounted = !!(slot.collection && slot.collection.length);
    if (empty) {
      // Guarded so re-running this while already empty cannot stack a second
      // copy.
      if (mounted) return;
      await Kind.waitFor("desk_home_empty");
      if (this.isDestroyed && this.isDestroyed()) return;
      slot.feed({ kind: "desk_home_empty", persistence: _a.once });
      return;
    }
    if (mounted) slot.clear();
  }

  /**
   * OPEN THE NEW WORKSPACE ONCE THE ACCESS PANEL IS CLOSED.
   *
   * Creating an internal or external workspace from the empty screen ends on
   * `.permission-restricted__main` — media/form chains to it on success, into
   * Wm's wrapper-modal. Opening the workspace cannot happen alongside that,
   * because loadWorkspace CLEARS the wrapper-modal on its way in
   * (wm/index.js): open first and the panel the user was about to invite people
   * from is destroyed under them. So the order is the user's — panel, then
   * dismiss, then the workspace.
   *
   * THE SIGNAL is the wrapper-modal's collection emptying, which is the same
   * one Wm's own `_closeWhenEmpty` waits for and for the same stated reason:
   * media_form chains to permission_* via parent.feed(), and "update" fires
   * once after that swap so the length reflects the FINAL state. Watching a
   * child destroy instead would fire mid-swap, i.e. the moment the form is
   * replaced by the panel — which is precisely not what "closed" means here.
   *
   * Note on ordering: libs/create-workspace announces `workspace:refresh` from
   * inside createWorkspace, BEFORE media/form's `.then` feeds the panel. So at
   * the moment this runs the wrapper still holds the FORM, and the transition
   * being waited for is the one after the panel goes.
   *
   * Already empty is treated as "there is nothing to wait for" rather than as
   * an error: a create that raised no panel at all (no hub in the response, or
   * a caller whose post_override is falsy) still ends with a workspace that
   * wants opening.
   */
  _openWorkspaceAfterAccessPanel() {
    const openNow = () => this._openWorkspaceOrEmptyScreen({ force: true });
    if (!window.Wm || !_.isFunction(Wm.ensurePart)) return openNow();
    if (this._awaitingAccessClose) return;
    this._awaitingAccessClose = 1;

    Wm.ensurePart("wrapper-modal").then((p) => {
      if (!p || !p.collection) {
        this._awaitingAccessClose = 0;
        return openNow();
      }

      // TWO STAGES: SEE THE PANEL, THEN SEE IT GO.
      //
      // Deciding on the collection's state at arm time is what let the
      // workspace open while the panel was still up. This runs from
      // `workspace:refresh`, which libs/create-workspace fires from INSIDE
      // createWorkspace — before media/form's `.then` has fed the panel. So at
      // arm time the wrapper holds whatever the create left there, and reading
      // "empty" as "no panel to wait for" is a guess about a state that has not
      // happened yet. Any moment where it reads empty — the form having closed
      // itself, a swap observed between events — opened the workspace
      // immediately and destroyed the panel a beat later (loadWorkspace clears
      // this very wrapper).
      //
      // So track it as a state machine instead: nothing opens until a panel has
      // been SEEN, and then gone. `seen` only ever goes false→true, so no later
      // empty reading can be mistaken for the panel's departure.
      let seen = !!p.collection.length;

      const stop = () => {
        p.collection.off("update reset", this._onAccessPanelClosed);
        if (this._accessPanelTimer) {
          clearTimeout(this._accessPanelTimer);
          this._accessPanelTimer = null;
        }
        this._onAccessPanelClosed = null;
        this._awaitingAccessClose = 0;
      };

      this._onAccessPanelClosed = () => {
        // A desk torn down while the panel was up must not open a workspace
        // into it, and must not leave a listener on Wm's collection either.
        if (this.isDestroyed && this.isDestroyed()) return stop();
        if (p.collection.length) {
          // The panel arrived (or the form was swapped for it). Now there is
          // something to wait for.
          seen = true;
          return;
        }
        // Empty. Only a departure if something was there to depart.
        if (!seen) return;
        stop();
        openNow();
      };
      p.collection.on("update reset", this._onAccessPanelClosed);

      // BOUNDED. If no panel ever appears — a create that raised none, or one
      // whose chain never reached this wrapper — the workspace still has to
      // open. Long enough to cover the create round-trip that feeds the panel,
      // and it is cancelled the moment a panel is seen.
      this._accessPanelTimer = setTimeout(() => {
        this._accessPanelTimer = null;
        if (this.isDestroyed && this.isDestroyed()) return stop();
        if (seen) return; // a panel is up; wait for it properly
        stop();
        openNow();
      }, 4000);
    });
  }

  /**
   * Kept as the name six call sites already use. Step 1 + step 2 both live in
   * _openWorkspaceOrEmptyScreen; this is the plain entry point.
   */
  async _openDefaultWorkspace(opt = {}) {
    return this._openWorkspaceOrEmptyScreen(opt);
  }

  /**
   * Current unread figure, read from whichever badge is mounted.
   *
   * Which one that is depends on the device: the desktop rail no longer has a
   * notifications row (it moved to the topbar cluster), so 'activity-count'
   * exists only in the mobile drawer, and 'activity-count-top' only on
   * desktop. getPart is used rather than ensurePart deliberately — ensurePart
   * NEVER resolves for a part that will not mount on this device, which would
   * hang the caller forever.
   */
  _readActivityCount() {
    for (const pn of ["activity-count-top", "activity-count-mobile", "activity-count-sheet"]) {
      const p = this.getPart && this.getPart(pn);
      if (p && p.el) {
        return parseInt(p.el.dataset.count || p.el.innerText || "0", 10) || 0;
      }
    }
    return 0;
  }

  /** Drop the unread figure by `by`, floored at zero, on every badge. */
  _decrementActivityCount(by = 1) {
    this._writeActivityCount(Math.max(0, this._readActivityCount() - by));
  }

  _updateActivityBadge(args = {}) {
    if (args.unread_count == null) return;
    this._writeActivityCount(args.unread_count);
  }

  /**
   * The workspace window the rail acts on, or null when the desk is showing
   * its home grid with nothing open.
   *
   * Wm.getActiveWindow(1) answers the raised folder/team/sharebox window, and
   * falls back to returning Wm ITSELF when none is open — hence the
   * showFolderTab check rather than a truthiness test, which would hand the
   * rail the window manager and throw on the first click.
   */
  _activeWorkspace() {
    if (typeof Wm === "undefined" || !_.isFunction(Wm.getActiveWindow)) return null;
    const w = Wm.getActiveWindow(1);
    if (!w || w === Wm || w.isDestroyed?.()) return null;
    return _.isFunction(w.showFolderTab) ? w : null;
  }

  /**
   * Rail → folder-window tab. With no workspace open there is nothing to show
   * a tab OF, so OPEN one — the legacy all-workspaces grid this used to fall
   * back to is retired (it is the same screen the Home crumb reached, and the
   * rail cannot render a "no workspace" state anyway). The workspace opens on
   * its own default tab, which beats landing on a screen we no longer ship.
   */
  _railTab(tab) {
    // The active tab, stamped for the skin: the phone's Files action row
    // (search + "+ New") shows only while the files view is up — Chat has its
    // composer and Task its own "+ New". No stamp (first paint) reads as
    // files, which is also the boot view.
    if (this.el) this.el.dataset.mtab = tab === "files" ? "files" : `${tab}`;
    const w = this._activeWorkspace();
    // BEFORE the tab is shown, and on both branches — see _leaveSectionScreen.
    this._leaveSectionScreen(w);
    if (!w) return this._openDefaultWorkspace();
    w.showFolderTab(tab);
    return w.raise && w.raise();
  }

  /**
   * PUT THE RAIL BACK ON FILES, because the workspace that just opened is.
   *
   * Opening another workspace mounts a BRAND NEW window_folder (Wm.loadWorkspace
   * re-feeds headlessLayer), and a fresh one starts with `activeTab` unset —
   * which showFolderTab, the view stamp and syncNewCtrlVisibility all read as
   * "files". So the screen always lands on Files.
   *
   * The rail does not: it is desk chrome, it is not rebuilt with the window, and
   * nothing in the switch path touches its radio group. Switching workspace from
   * Chat / Task / Meet / Access therefore left the previous tab lit over the new
   * workspace's file grid — the rail claiming a screen that is not up, which is
   * exactly what Lexis reported (a Task-lit rail over a Files view).
   *
   * `mtab` is the SAME stamp _railTab writes, not a second one: the phone's Files
   * action row (search + "+ New") is keyed on it, so leaving it on "task" would
   * hide those controls on a files screen.
   *
   * getPart, NEVER ensurePart. The two rails are per-device — `sidebar-files`
   * mounts only on the desktop rail, `mrail-files` only in the phone's bottom bar
   * (skeleton/index.js, and it has its own radio group so the two cannot mark each
   * other) — and ensurePart NEVER RESOLVES for a part that will not mount on this
   * device, which would hang this caller forever. Same reason, same idiom as
   * _readActivityCount. Both are re-asserted rather than one; which of them is on
   * screen is not this method's business.
   */
  _resetRailToFiles() {
    if (this.el) this.el.dataset.mtab = "files";
    if (!_.isFunction(this.getPart)) return;
    const light = (pn, channel) => {
      const p = this.getPart(pn);
      if (!p || !p.el || (p.isDestroyed && p.isDestroyed())) return;
      RADIO_BROADCAST.trigger(channel, p);
    };
    light("sidebar-files", "sidebar-radio");
    light("mrail-files", "mobile-rail-radio");
  }

  /**
   * Rail navigation is about to show workspace content — get whatever SECTION
   * SCREEN is in front of the workspace out of the way, and put the breadcrumb
   * back on the workspace it is navigating in.
   *
   * This is what made Files / Task / Meet read as dead clicks. Settings, Get
   * help, Plan, Calendar, Inbox and the Admin console all mount in
   * `settings-main-slot`, which is `position:absolute; inset:0; z-index:1500`
   * (skin/index.scss) — it FULLY covers the workspace pane. _railTab only
   * talks to the workspace window underneath it, so the tab really did switch,
   * invisibly, behind the panel: nothing on screen moved, the breadcrumb kept
   * reading "Get help", and the rail highlight jumped to the row that appeared
   * to do nothing (the rail's own Plan row shares its radio group with
   * Files…Access, which is why the lit row and the screen could disagree).
   *
   * closeMainPanels(), not closeAllPanels(): the three main slots are exactly
   * the screens that occlude the pane AND the ones that retitle the breadcrumb
   * (`breadcrumb:context`), while the activity/notification side panels do
   * neither — closing those too would be an unrelated change. It is the same
   * cleanup Wm.loadWorkspace already runs when opening a workspace, and it is
   * a no-op when no such panel is up.
   *
   * Called even when there is NO workspace window: Wm.loadWorkspace returns
   * early when the requested workspace is already the current one, so leaving
   * the close to _openDefaultWorkspace() would strand the panel on exactly the
   * path that has nothing else to show.
   *
   * @param {Object} [w]  the workspace window the rail is about to act on
   */
  _leaveSectionScreen(w) {
    // Asked BEFORE the close, and getPart rather than ensurePart: this answers
    // synchronously with what is mounted right now, which is what a rail click
    // needs. A breadcrumb that has not mounted yet reads as "no section to
    // leave", which is correct — it has nothing on it to be stale.
    const crumb = _.isFunction(this.getPart) ? this.getPart("breadcrumb") : null;
    const wasSection = !!(crumb && _.isFunction(crumb.isSectionMode) && crumb.isSectionMode());
    this.closeMainPanels();
    // Closing the panel does not un-stamp the crumbs — they still read
    // "Get help". Only a fresh `breadcrumb:content` whose SOURCE is Wm rebuilds
    // the workspace path (desk_breadcrumb._updateContent ignores every other
    // source), which is the same broadcast Wm makes on a workspace switch.
    //
    // Only when the bar really was on a section: that broadcast costs a
    // get_path round trip, and folder-to-folder rail clicks inside one
    // workspace already have the right crumbs.
    if (!wasSection) return;
    if (!w || !w.model || !window.Wm || !_.isFunction(Wm.updateBreadcrumb)) return;
    // Exactly the four keys _onBrowse reads, not the whole window model: that
    // model accumulates whatever every mset() along the window's life put on
    // it, and _updateContent SWITCHES on a payload's `event` (closed → ignore,
    // home → clear the track). Handing it a filtered payload is what keeps an
    // unrelated key on the window from clearing the crumbs.
    const { nid, hub_id, actual_home_id, filetype } = w.model.toJSON();
    Wm.updateBreadcrumb(
      { nid, hub_id, actual_home_id, filetype, service: "change-workspace" },
      Wm,
    );
  }

  /**
   * The switcher header's link icon → Manage access, with a loading state.
   *
   * The wait is real and specific: `window_secure_share` is a LAZY dynamic
   * import (seeds.js), so the first click pays a chunk fetch and parse before
   * anything appears on screen. Awaiting Kind.waitFor covers exactly that span
   * — the same handle wm/index.js onPartReady uses to warm the tutorial kinds.
   *
   * Cleared in `finally`, and the whole thing is guarded: a dropped chunk must
   * leave the button usable rather than spinning for the rest of the session,
   * and a desk that boots before `Kind` exists must still open the panel.
   *
   * The flag is still up when _railAccess runs, which is the point — clearing
   * it first would cover nothing.
   */
  _workspaceAccessFromHeader(cmd) {
    const el = cmd && cmd.el;
    const set = (v) => {
      if (!el || !el.dataset) return;
      if (v) el.dataset.loading = "1";
      else delete el.dataset.loading;
    };
    set(1);
    const warm =
      typeof Kind !== "undefined" && Kind && _.isFunction(Kind.waitFor)
        ? Promise.resolve(Kind.waitFor("window_secure_share")).catch(() => {})
        : Promise.resolve();
    return warm.then(() => {
      this._railAccess();
      set(0);
    });
  }

  /** Rail → the workspace's manage-access panel (the Permission Matrix). */
  /**
   * @param {Object} [opt]
   * @param {boolean} [opt.members] force the workspace-MEMBERS panel (invite row
   *   + permissions matrix) regardless of the workspace's area.
   *
   * The rail's Access passes it: Natrix' ruling is that Access always means
   * "who can get in", so an EXTERNAL workspace must show the same matrix an
   * internal one does rather than the secure-share link builder.
   *
   * The header's chain icon (_workspaceAccessFromHeader) calls this WITHOUT it
   * on purpose — that control is the Manage Access link button, it is rendered
   * only for external workspaces, and the link builder is exactly what it is
   * for. Sharing this method is why the flag is a parameter and not a change
   * inside openManageAccess, which four other surfaces also reach.
   */
  _railAccess(opt) {
    if (this.el) this.el.dataset.mtab = "access";
    const w = this._activeWorkspace();
    // Same as _railTab: Access is workspace content, so it cannot be reached
    // from behind a section screen either.
    this._leaveSectionScreen(w);
    // Same as _railTab: open a workspace rather than the retired home grid.
    if (!w) return this._openDefaultWorkspace();
    if (_.isFunction(w.onUiEvent)) {
      return w.onUiEvent(w, {
        service: "folder-manage-access",
        members: opt && opt.members ? 1 : 0,
      });
    }
  }

  /** Keep the topbar actions enabled when the breadcrumb context changes. */
  /**
   * May the viewer create things in the workspace they are currently in?
   *
   * The desk topbar's "+ New" writes into the CURRENT workspace, but the desk
   * itself holds no privilege — the open workspace window does, and it already
   * keeps it live (folder/index.js: change:privilege, _applyLivePrivilege,
   * _healChatPrivilege). So ask that window, which is the same source its own
   * "+ New" gate (syncNewCtrlVisibility) trusts, instead of caching a second copy.
   *
   * FAIL-OPEN in every unknown case — no workspace context (desk home / the
   * user's own space), no window yet, or an unexpected shape — so this can only
   * ever remove an option from someone provably lacking write, never block a
   * member whose privilege we simply could not read.
   */
  _curWorkspaceCanWrite() {
    try {
      const ws = (window.Wm && Wm._curWorkspace) || null;
      if (!ws || !ws.hub_id) return true;
      const win = Wm._findWorkspaceWindow && Wm._findWorkspaceWindow(ws.hub_id);
      if (!win || typeof win.canUpload !== "function") return true;
      return !!win.canUpload();
    } catch (e) {
      return true;
    }
  }

  /**
   * May the viewer manage the members of the workspace they are currently in?
   * Same resolution and same fail-open posture as _curWorkspaceCanWrite; the
   * server asks for the ADMIN bit on hub.invite / set_privilege / delete_contributor,
   * so view, chat and edit would only ever meet a refusal.
   *
   * canAdmin() (the bare admin bit) rather than canManageAccess(), which also
   * requires area === private and would therefore hide Invite from the owner of
   * a SHARED workspace.
   */
  _curWorkspaceCanManage() {
    try {
      const ws = (window.Wm && Wm._curWorkspace) || null;
      if (!ws || !ws.hub_id) return true;
      const win = Wm._findWorkspaceWindow && Wm._findWorkspaceWindow(ws.hub_id);
      if (!win || typeof win.canAdmin !== "function") return true;
      return !!win.canAdmin();
    } catch (e) {
      return true;
    }
  }

  /**
   * The MEDIA widget for a workspace — the object the folder context menu has
   * always acted on, and the one that carries the HUB node (real nid, real pid,
   * real filename) plus move() / trash() / delete() / download().
   *
   * Read from the home grid (`__icons-list`, wm/skeleton/index.js), which is fed
   * `kind: "media"` rows from desk.home and stays mounted BELOW the headless
   * layer — so it still resolves while a workspace pane is open.
   *
   * Deliberately NOT the pane: loadWorkspace() feeds window_folder without
   * `media`/`trigger`, so the pane answers for the workspace's root FOLDER and
   * implements none of those methods. Returns null rather than throwing; the
   * caller shows no menu in that case, because every row would be inert.
   */
  /**
   * A workspace was trashed — put the desk back into a valid state.
   *
   * Three things go stale at once and none of them fix themselves:
   *   - `_workspaces` is a cache nothing ever invalidates, so the switcher
   *     keeps offering the deleted workspace until the page is reloaded;
   *   - the headless pane is still rendering it, which reads as a blank screen;
   *   - `Wm._curWorkspace` still names it, and loadWorkspace() no-ops when the
   *     hub_id it is given matches — so opening a replacement would do nothing
   *     unless that context is cleared first.
   */
  async _onWorkspaceDeleted(media) {
    try {
      const gone = media && media.mget && media.mget(_a.hub_id);
      // Force past the cache — this is the one moment it is known to be wrong.
      this._workspaces = null;
      await this._fetchWorkspaces(true);
      if (this._wsListPart) this._renderWorkspaceMenu(this._wsListPart);

      const cur = (window.Wm && Wm._curWorkspace) || null;
      if (!gone || !cur || String(cur.hub_id) !== String(gone)) return;

      // The open pane is the one that just went. Clear it and the context it
      // set, then fall back the same way boot does.
      if (Wm.headlessLayer && _.isFunction(Wm.headlessLayer.clear)) {
        Wm.headlessLayer.clear();
      }
      Wm._curWorkspace = null;
      await this._openDefaultWorkspace();
    } catch (e) {
      this.warn && this.warn("[workspaces] post-delete recovery failed", e);
    }
  }

  _workspaceMediaItem(hub_id, nid) {
    try {
      if (!hub_id || typeof Wm === "undefined") return null;
      const list = Wm.getPart && Wm.getPart(_a.list);
      const kids = list && list.children ? list.children.toArray() : [];
      const live = (k) =>
        k && !(k.isDestroyed && k.isDestroyed()) && _.isFunction(k.mget);
      // BY KEY, not by hub_id.
      //
      // hub_id alone cannot tell two personal workspaces apart: they are
      // folders in the user's own home, so ALL of them report hub_id ===
      // Visitor.id (verified in desk.home for vowaw91171@robustq.com — rrr,
      // 111 and 222(1) all carry it, while every hub carries its own id).
      // This returned whichever came first, so the ⋯ menu of an open personal
      // workspace was built from — and acted on — a different one.
      //
      // Same collision, and the same key, as the switcher's _workspaceKey.
      const want = this._workspaceKey({ hub_id, nid });
      if (want) {
        const byKey = kids.find(
          (k) =>
            live(k) &&
            this._workspaceKey({
              hub_id: k.mget(_a.hub_id),
              nid: k.mget(_a.nid),
              filetype: k.mget(_a.filetype),
            }) === want,
        );
        if (byKey) return byKey;
      }
      // A hub is unambiguous by id, and this is the path a caller that knows
      // only a hub_id still needs.
      return (
        kids.find(
          (k) => live(k) && String(k.mget(_a.hub_id)) === String(hub_id),
        ) || null
      );
    } catch (e) {
      return null;
    }
  }

  /**
   * Refuse a create/upload the current workspace privilege does not allow, with
   * words, BEFORE the file picker or editor opens. Returns true when the caller
   * must stop — same contract as over-limit's guardWrite, so the two read alike
   * at every call site.
   *
   * The server already refuses these (media.upload / make_dir / save ask for the
   * write bit), so this is not the enforcement — it exists so a view/chat member
   * is never offered a picker whose result can only be a 403.
   */
  _guardWorkspaceWrite() {
    if (this._curWorkspaceCanWrite()) return false;
    this._sayWeakPrivilege();
    return true;
  }

  /**
   * The one place this batch says "you don't have the right for that".
   * Mirrors over-limit's notifyBlocked: Butler first, Wm.alert as the fallback,
   * and never allowed to throw into the caller's own path.
   * LOCALE.WEAK_PRIVILEGE already exists in all six locales — no new key.
   */
  _sayWeakPrivilege() {
    try {
      if (typeof Butler !== "undefined" && Butler.say) Butler.say(LOCALE.WEAK_PRIVILEGE);
      else if (typeof Wm !== "undefined" && Wm.alert) Wm.alert(LOCALE.WEAK_PRIVILEGE);
    } catch (e) {
      /* a toast must never break the caller's own path */
    }
  }

  _updateAddmenu() {
    this.ensurePart("action-cluster").then((p) => {
      p.setState(1);
    });
    // The switcher trigger names the open workspace, and this broadcast is the
    // one signal every path to a workspace shares — sidebar row, switcher row,
    // deep link and reload-restore all end in updateBreadcrumb.
    //
    // The try/catch is load-bearing, not habit. The window manager emits this
    // broadcast from inside its OWN initialize (window/utils.js
    // __window_mfs.initialize -> updateBreadcrumb), which runs BEFORE
    // manager.js:53 sets `window.Wm`. Anything thrown here unwinds into that
    // initialize and aborts it before the global is assigned — after which
    // every `Wm.` reference in the app throws ReferenceError and the window
    // manager's own 10s watchdog suppresses it. That is exactly what a missing
    // method here caused once already.
    try {
      this._syncWorkspaceLabel();
      // Same broadcast, same guard: this is the one signal every path to a
      // workspace shares, and a throw here would unwind the same initialize.
      this._syncWorkspaceHighlight();
    } catch (e) {
      this.warn && this.warn("[workspaces] label sync failed", e);
    }
    // Navigating into (or out of) a workspace can change whether the create /
    // upload rows apply at all. Re-feed the topbar only when the answer actually
    // flips, so ordinary folder-to-folder navigation inside one workspace costs
    // nothing. Same re-feed mechanism _onOverLimitChanged already uses.
    const may = this._curWorkspaceCanWrite();
    const manage = this._curWorkspaceCanManage();
    if (this._addmenuMayWrite === may && this._addmenuMayManage === manage) return;
    this._addmenuMayWrite = may;
    this._addmenuMayManage = manage;
    this.ensurePart("top-bar").then((part) => {
      if (part && !(part.isDestroyed && part.isDestroyed())) {
        part.feed(require("./skeleton/topbar")(this));
      }
    });
  }

  closeDeskNewMenu(cmd) {
    // On mobile the same five services are reached from the create SHEET
    // instead of a menu, and mobile-sheet-go already closes it before the
    // re-dispatch — this is the belt for any path that lands here directly.
    if (Visitor.isMobile()) this._closeMobileSheet();
    const menu = cmd && cmd.getParentByKind?.(KIND.menu.topic);
    if (!menu) return;
    const group = menu.el?.querySelector(
      ".desk-module-topbar__new-menu-create-group",
    );
    if (group) group.dataset.submenu = _a.closed;
    if (menu.changeState) menu.changeState(0);
  }

  toggleDeskNewCreateMenu(cmd) {
    if (!cmd || !cmd.el) return;
    cmd.el.dataset.submenu =
      cmd.el.dataset.submenu === _a.open ? _a.closed : _a.open;
  }

  /**
   *
   */
  loadHome(data = {}) {
    // [Reload] The breadcrumb calls Desk.loadHome() when it mounts, which
    // happens WHILE loadDefault is restoring the pre-reload desk state —
    // its closeMainPanels() / Wm.reload() would wipe the restored
    // workspace, folder windows, or deep-link target. Skip this mount-time
    // reset when a restore is in flight; the restore path drives the desk.
    if (this._restoreInFlight) return;
    this._dismissWmModal();
    this.closeMainPanels();
    this.ensurePart("action-cluster").then((p) => p && p.setState(1));
    Wm.reload();
  }

  /**
   *
   */
  onPartReady(child, pn) {
    switch (pn) {
      // Switcher dropdown body. Populated on mount rather than on open: the
      // menu's items render once, and the desk.home payload is cached, so
      // filling it here costs one fetch that the boot default shares.
      case "ws-list":
        // Pass the child: getPart cannot resolve it yet at part-ready time.
        this._renderWorkspaceMenu(child);
        break;

      // The switcher's header (Figma 48:36991) names the CURRENT workspace, so
      // it is filled by the same pass that builds the rows — that pass already
      // resolves Wm._curWorkspace and the area-tinted folder glyph, and doing
      // it here would be a second copy of both. Which part arrives first is not
      // fixed, so each one caches itself and re-runs the fill; whichever lands
      // second finds the other already stored.
      case "ws-head":
        this._wsHeadPart = child;
        this._renderWorkspaceMenu(this._wsListPart);
        break;

      // The switcher widget itself. Held because the CHIP opens it now, and
      // the chip is not inside it — the caret it used to open itself from is
      // inert (desk/skeleton/topbar workspaceSwitcher).
      case "wsmenu":
        this._wsSwitcher = child;
        break;

      // The address chip. It is the switcher's button now, and it cannot be
      // one through a `service` — see _bindCrumbGroupTrigger.
      case "crumb-group":
        this._bindCrumbGroupTrigger(child);
        break;

      case "ref-avatar":
        /** wait for  $el.droppable*/
        this.ensurePart("desk-content").then(() => {
          child.$el.droppable({
            tolerance: "touch",
            over: this.mediaDragOverAvatar,
            out: this.mediaDragLeaveAvatar,
            drop: this.mediaDropOnAvatar,
            greedy: true,
          });
        });

        this.avatar = child;
        return Visitor.on(_e.change, (m) => {
          if (m.changed && m.changed.mtime) {
            return child.reload();
          }
        });

      case "avatar-listener":
        return (this._avatarListener = child);

      case "folder-tabs":
        this._folderTabsBox = child;
        this._renderFolderTabs();
        return;

      case "search-container":
        this._searchContainer = child;
        return;

      case "search-box":
        if (this._searchInputEl && this._searchInputHandler) {
          this._searchInputEl.removeEventListener(
            "input",
            this._searchInputHandler,
          );
        }
        if (this._searchBoxInner?.el && this._searchFocusHandler) {
          this._searchBoxInner.el.removeEventListener(
            "focusin",
            this._searchFocusHandler,
          );
        }
        this._searchBoxInner = child;
        this._searchInputEl =
          child.el.querySelector("input, textarea") || child.el;
        this._searchInputHandler = () => {
          if (this._timer) clearTimeout(this._timer);
          this._timer = setTimeout(() => {
            this._updateSearchSuggestions(child);
            this._timer = null;
          }, 300);
        };
        this._searchFocusHandler = () => this._updateSearchSuggestions(child);
        this._searchInputEl.addEventListener("input", this._searchInputHandler);
        child.el.addEventListener("focusin", this._searchFocusHandler);
        return;

      case "search-suggestions":
        this._searchSuggestions = child;
        return;

      // Mobile only — the card that hosts search-box / search-suggestions when
      // the desktop topbar is display:none. Its absence is how
      // _closeMobileSearch knows there is no card to close.
      case "mobile-search-card":
        this._mobileSearchCard = child;
        return;

      case "suggestions-list":
        // Topbar search must not surface the user's hidden personal hub
        // (area='personal') or the auto-created wicket/dmz. Filter hub
        // rows to the collaborative set {share, private, restricted}.
        // Folders/files (filetype !== _a.hub) always pass — they may
        // physically live INSIDE the personal hub but they're legitimate
        // hits. Same predicate as the home-grid filter in wm/index.js.
        if (child && !child._suggestionsFilterInstalled) {
          child._suggestionsFilterInstalled = 1;
          const original = child.prepareData.bind(child);
          child.prepareData = function (data) {
            const prepared = original(data) || [];
            return prepared.filter((it) => {
              if (!it || it.filetype !== _a.hub) return true;
              return (
                it.area === _a.share ||
                it.area === _a.private ||
                it.area === _a.restricted
              );
            });
          };
        }
        return;

      case "add-menu":
        this._addMenu = child;
        return;

      case "main-menu":
        return (this._mainMenu = child);

      case "logo-block":
        let mascott = require("assets/mascot.png").default;
        child.el.style.backgroundImage = `url(${mascott})`;
        return;

      case "desk-content":
        this.content_wrapper = child;
        return;

      case "desk-wrapper":
        return (this.desk_wrapper = child);

      case "desk-tooltip":
        return (this.tooltip = child);

      case "sidebar-home":
        child.setState(1);
        child.el.dataset.radiotoggle = _a.on;
        return;

      case "user-menu-trigger":
        this._userMenuTrigger = child;
        return;

      case "user-menu-items":
        this._userMenuItems = child;
        return;

      // "+ New" dropdown. The button that opens it
      // (desk-module-topbar__new-workspace-btn) is the Menu's `trigger` and
      // carries no service, so desk onUiEvent never sees it — the menu's own
      // open event is the signal. _e.open fires only on open, never on close,
      // so re-opening the menu cannot re-trigger.
      //
      // Re-bound automatically: _updateAddmenu and _onOverLimitChanged re-feed
      // the whole topbar fragment, which lands here again with a new menu
      // widget. Nothing is remembered on the node or the widget — every gate
      // lives in libs/tutorial-tours — so a rebuild can neither lose nor
      // duplicate the trigger.
      case "addmenu": {
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

      case "overlay":
        // `?tutorial=reset` is a QA affordance, not a tour: it clears the
        // seen-set so every contextual tour becomes triggerable again on this
        // account. The server re-checks profile.devel, so this is only the
        // client half. It deliberately does NOT mount anything.
        if (Visitor.parseModuleArgs().tutorial === "reset") {
          require("libs/tutorial-tours").reset(this);
          setTimeout(() => {
            this._afterHomeSettled();
          }, 2000);
          return;
        }
        if (
          Visitor.parseModuleArgs().tutorial ||
          this._postOnboardingTutorial
        ) {
          this._postOnboardingTutorial = false;
          const explicit = !!Visitor.parseModuleArgs().tutorial;
          const forced = this._forcedTourId();
          setTimeout(() => {
            if (this._launchHomeTutorial(explicit, forced)) return;
            // Nothing mounted, and nothing is going to: the post-onboarding
            // tour was gated (already seen, mobile, or the switch is off in a
            // way that produced no tour). The 20s net below exists for a
            // tutorial that was LAUNCHED and failed to report in; waiting it
            // out here would delay the reward flow, LAUNCH30 and the
            // invited-workspace prompt by 18 seconds for — among others —
            // every mobile signup. Settle now, exactly as the else-branch does.
            clearTimeout(this._homeSettledFallback);
            this._homeSettledFallback = null;
            this._afterHomeSettled();
          }, 2000);
          // Safety net. In this branch the ONLY route to _afterHomeSettled is
          // the "desk-tutorial" part becoming ready, so if desk_tutorial fails
          // to mount — kind not loaded, widget throws, part never signals —
          // nothing runs for the whole session: no reward flow, no LAUNCH30,
          // and no invited-workspace prompt. A signup always takes this branch,
          // which is why the prompt was missing after OAuth sign-up while an
          // ordinary sign-in (the else below) worked.
          //
          // Cleared as soon as the tutorial does report in, so the normal path
          // is untouched and the chain still waits for the tutorial to finish.
          // Also cleared by the launcher above when it turns out no tutorial is
          // coming at all — armed here rather than after the 2s decision so a
          // throw inside that timeout still leaves the net in place.
          clearTimeout(this._homeSettledFallback);
          this._homeSettledFallback = setTimeout(() => {
            this.warn && this.warn("[home] tutorial never mounted; settling anyway");
            this._afterHomeSettled();
          }, 20000);
        } else {
          // No tutorial this session — the reward flow gates itself, so it is
          // safe to always ask. LAUNCH30 chains after it (both self-gate on
          // the server; showing them at once would stack two full-screen
          // popups over a user who is eligible for both).
          setTimeout(() => {
            this._afterHomeSettled();
          }, 2000);
        }
        return;

      case "desk-tutorial": {
        const tour = (child && child.mget && child.mget("tour")) || "full";
        // Release single-flight for EVERY tour, deliberately outside the chain
        // gate below: a contextual tour that is never released would block the
        // next trigger for the rest of the session. Hangs off the same destroy
        // event _chainRewardFlowAfterTutorial uses.
        if (_.isFunction(child.once)) {
          child.once(_e.destroy, () =>
            require("libs/tutorial-tours").release(tour),
          );
        }
        // Only the post-onboarding run and the full tour own the hand-off to
        // the post-home chain. A contextual tour firing an hour later reaches
        // this line with _homeSettledDone already true and must not re-enter
        // it — and must not be able to block it either.
        if (tour !== "workspace" && tour !== "full") return;
        // The tutorial exists and owns the hand-off from here.
        clearTimeout(this._homeSettledFallback);
        this._homeSettledFallback = null;
        // Was this the onboarding tour, or a user rewatching it from Get help?
        // Recorded HERE because the flag that answers it is consumed by
        // _chainHelpReturnAfterTutorial below, and the activation flow that
        // needs the answer does not run until the tour is destroyed. See
        // _maybeStartActivateWorkspace.
        this._tutorialWasAutomatic = !this._tourReturnsToHelp;
        this._chainRewardFlowAfterTutorial(child);
        // Only fires for a tour launched from Get help; the automatic
        // post-signup run leaves the user on the desk as before.
        this._chainHelpReturnAfterTutorial(child);
        return;
      }
    }
  }

  /**
   *
   */
  mediaDragLeaveAvatar(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.avatar.el.dataset.over = _a.no;
  }

  /**
   *
   */
  mediaDragOverAvatar(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (ui.helper.moving == null) {
      return;
    }
    ui.helper.moving.valid = true;
    this.avatar.el.dataset.over = _a.yes;
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   * @returns
   */
  mediaDragDropOnAvatar(e, ui) {
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (ui.helper.moving == null) {
      return;
    }
  }

  /**
   *
   */
  _upload(e) {
    return Wm.upload(e);
  }

  /**
   *
   */
  _dragOver(e, ui) {
    Wm.el.dataset.selected = _a.upload;
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   */
  _dragLeave(e, ui) {
    Wm.el.dataset.selected = _a.off;
  }

  /**
   *
   */
  _loadOnboarding() {
    Kind.loadPlugin({ name: "onboarding", kind: "onboarding" })
      .then(async () => {
        await Kind.waitFor("onboarding");
        this.feed({
          kind: "onboarding",
          type: "app",
          service: "onboarding-completed",
          uiHandler: [this],
        });
        let w = this.children.last();
        w.once(_e.destroy, () => {
          this._postOnboardingTutorial = true;
          this.loadDefault();
        });
      })
      .catch((e) => {
        this.warn("Failed to load onboarding plugin. switching to default", e);
        this.loadDefault();
      });
  }

  /**
   * `p.feed(...)` immediately followed by `p.children.last()` is NOT
   * reliable when `p` is a nested part (as opposed to `this`) — it raced
   * and returned a stale/undefined reference in testing (2026-07-31),
   * so `_chainRewardFlowAfterTutorial` fell through to its "no tutorial"
   * branch and fired the reward+promo check immediately, stacking the
   * LAUNCH30 modal on top of an in-progress tutorial (step 1/5, tester
   * feedback #1). `sys_pn` + `partHandler` -> `onPartReady` is the
   * framework's own reliable hand-off for a just-rendered child; use it
   * instead of leaning on the feed() return value.
   */
  /**
   * Which tour `?tutorial=` asked for.
   *
   * `?tutorial=1` (and anything unrecognised) keeps meaning the whole
   * six-step tour, which is what it has always meant. A recognised tour id
   * runs that tour on its own, which is the only way to reach one without
   * performing its trigger — QA cannot otherwise test a tour twice.
   *
   * @returns {String} a tour id
   */
  _forcedTourId() {
    const arg = Visitor.parseModuleArgs().tutorial;
    const { TOURS } = require("desk/tutorial/tours");
    if (typeof arg === "string" && TOURS[arg]) return arg;
    return "full";
  }

  _showTutorial(tourId, opt = {}) {
    const tour = tourId || "full";
    this.ensurePart("overlay").then((p) => {
      p.feed({
        kind: "desk_tutorial",
        tour,
        sys_pn: "desk-tutorial",
        partHandler: this,
        ...opt,
      });
    });
  }

  /**
   * Force a tour onto the screen from the URL, for checking the UI.
   *
   *   #/desk?tutorial=share                 the share tour, from screen 1
   *   #/desk?tutorial=share&screen=3        straight to its third screen
   *   #/desk?tutorial=share&subject=workspace   its panel headed by a
   *                                         workspace instead of a file
   *   #/desk?tutorial=folder_task&step=2    straight to the tracker step
   *   #/desk?tutorial=folder_task&step=2&screen=4   ...and its fourth view
   *   #/desk?tutorial=1                     the whole six-step tour
   *   #/desk?tutorial=reset                 clear the seen-set (devel only)
   *
   * `step` and `screen` are 1-based, matching what the badge shows, and are
   * clamped — a nonsense value lands on a real screen rather than rendering
   * nothing.
   *
   * These runs are PREVIEWS: they do not record the tour as seen, so the same
   * URL works twice and the real contextual trigger stays armed. Without that,
   * one look at `?tutorial=migrate` would kill the + New trigger for the
   * account permanently, since a tour records itself on mount.
   *
   * @returns {Object} extra attributes for the tutorial widget
   */
  _forcedTourOpt() {
    const args = Visitor.parseModuleArgs();
    const opt = { preview: 1 };
    if (args.step) opt.enter_at_step = args.step;
    if (args.screen) opt.enter_at_screen = args.screen;
    // What the tour is about, when only the trigger would normally know.
    //
    // The share panel's header is the case: opened over a workspace it shows a
    // workspace (180:51964), and the trigger says so through fire()'s third
    // argument (libs/tutorial-tours). A preview URL has no trigger, so without
    // this the workspace header could not be looked at from a URL at all — it
    // would need a fresh account and a real click on Manage access.
    if (args.subject) opt.subject = args.subject;
    return opt;
  }

  /**
   * Start whatever tutorial this boot owes the user, and say whether one is
   * actually on its way.
   *
   * Three routes, and only the first two are unconditional:
   *
   *   explicit    `?tutorial=<id>` / `?tutorial=1`. A person typed this; it is
   *               never gated on the seen-set, the mobile check or the kill
   *               switch, because otherwise QA cannot reach a tour twice.
   *   switch off  the six-step tour, exactly as before this feature existed.
   *   otherwise   the post-onboarding `workspace` tour, gated like any other
   *               trigger — the whole point of a server-side flag is that a
   *               wizard shown twice does not produce a tour shown twice, and
   *               the wizard genuinely can reappear (the skip path writes
   *               `onboarded` locally only).
   *
   * @returns {Boolean} true when something was launched. False means no
   *   tutorial is coming and the caller must settle home itself.
   */
  _launchHomeTutorial(explicit, forced) {
    if (explicit) {
      this._showTutorial(forced, this._forcedTourOpt());
      return true;
    }
    const Tours = require("libs/tutorial-tours");
    if (!Tours.enabled()) {
      this._showTutorial("full");
      return true;
    }
    // fire() broadcasts synchronously, so by the time it returns true the
    // desk's own channel listener has already called _showTutorial. A true
    // here means "launched", not "mounted" — the chunk can still fail, which
    // is what the 20s net is for.
    return Tours.fire("workspace", this);
  }

  /**
   * A trigger surface asked for a tour. libs/tutorial-tours has already
   * decided that it should run — kill switch, mobile, seen-set and
   * single-flight are all settled there — so this only mounts it.
   */
  _onTourTrigger(args = {}) {
    if (!args.tour) return;
    // `opt` is whatever the trigger knew and the tour could not — see fire()
    // in libs/tutorial-tours. _showTutorial spreads it onto the widget, so it
    // arrives as model attributes.
    this._showTutorial(args.tour, args.opt || {});
  }

  /**
   * User-initiated run of the 6-step tour, from the "Product Tour" button on
   * the Get help screen (help_main raises `start-product-tour`). Until this
   * existed the tour only ran automatically — post-signup, or forced with
   * `?tutorial=1` — so anyone who skipped it had no way back in.
   *
   * Get help has to go first: the tour renders its OWN mock workspace, so a
   * still-mounted help screen would show through it. settings-main-slot is not a
   * keep-alive slot, so togglePanel without `openOnly` animates the child out
   * and destroys it.
   *
   * Goes through _showTutorial() rather than feeding desk_tutorial here, so
   * both entry points share one launch path. The reward flow it chains on exit
   * is a no-op for this path: _afterHomeSettled() runs once per session and the
   * desk has long since settled by the time anyone opens Get help.
   *
   * Because the screen is closed on the way in, finishing the tour has to put
   * it back — the user asked for a tour FROM Get help, so that is where they
   * are returned. `_tourReturnsToHelp` carries that intent across to
   * onPartReady("desk-tutorial"), which is the only reliable handle on the
   * mounted tutorial (see _showTutorial on why feed()'s return value is not).
   */
  _startProductTour() {
    // Re-feeding the overlay while a tour is live would throw the user back to
    // step 1, and the help screen can be re-opened over a running tour. The
    // overlay hosts other things too (reward flow, promo modals), so match on
    // the kind rather than on "is anything mounted" — and read the dataset as
    // well as the model, because a kind still being fetched mounts as the
    // lazy-loader placeholder first (same defensive pair as
    // _currentScreenService).
    const overlay = this.getPart && this.getPart("overlay");
    const running = overlay && overlay.children && overlay.children.last();
    const kind =
      (running && running.mget && running.mget(_a.kind)) ||
      (running && running.el && running.el.dataset && running.el.dataset.kind);
    if (running && !running.isDestroyed() && kind === "desk_tutorial") {
      return;
    }
    this._tourReturnsToHelp = true;
    this.togglePanel("help_main", "settings-main-slot");
    this._showTutorial();
  }

  /**
   * Put Get help back when a tour that was started from it finishes.
   *
   * The flag is CONSUMED here rather than in the destroy handler: if the
   * tutorial mounts at all, this is the run it belongs to, and clearing it now
   * means a later automatic run can never inherit a stale intent. A tour that
   * fails to mount leaves the flag set, which is why _startProductTour is also
   * the only thing that sets it — the next click overwrites it truthfully.
   *
   * `once` matches _chainRewardFlowAfterTutorial: the tutorial ends by calling
   * softDestroy() from _enterWorkspace(), so destroy is the completion signal.
   *
   * softDestroy fades for 0.5s and only then destroys, so destroy arrives after
   * the tour is already off screen and the desk shows for the moment it takes
   * the panel to mount. Left as is: there is no "tour is exiting" signal to
   * open the panel earlier on, and the alternative — pre-opening Get help at
   * launch and letting the tour cover it — is what the close-on-entry exists to
   * avoid, since the tour draws its own mock workspace.
   */
  _chainHelpReturnAfterTutorial(tutorial) {
    const returns = this._tourReturnsToHelp;
    this._tourReturnsToHelp = false;
    if (!returns || !tutorial || !_.isFunction(tutorial.once)) return;
    tutorial.once(_e.destroy, () => this._openGetHelp());
  }

  /**
   * Get help — full-page screen in the same slot as Settings/Billing.
   * Open-only, matching its sidebar neighbours.
   *
   * Shared by the sidebar entry (`toggle-help`) and by the return trip after a
   * product tour, so both land on the same screen with the same breadcrumb.
   * The panel is destroyed on close, so it always re-opens on help_main's
   * default page — Product tour, which is the page the button was on.
   */
  _openGetHelp() {
    RADIO_BROADCAST.trigger("breadcrumb:context", {
      filename: LOCALE.GET_HELP,
    });
    return this.togglePanel("help_main", "settings-main-slot", true);
  }

  /**
   * Resolve the account that answers Contact Support, once per session.
   *
   * Answers null whenever there is nobody to talk to — no support account
   * configured, the configured one has been deleted, or the request failed.
   * Every caller treats null as "fall back to the support mail link", so a
   * deployment that never configures support keeps today's behaviour.
   *
   * @returns {Promise<Object|null>} {entity_id, display, firstname, lastname, is_self}
   */
  async supportContact() {
    if (this._supportContact !== undefined) return this._supportContact;
    // Share one in-flight request between concurrent callers (the Help screen
    // and the sidebar can both ask before either has answered).
    if (!this._supportContactPromise) {
      this._supportContactPromise = this.fetchService(SERVICE.support.contact, {})
        .then((res) => {
          const ok = res && ~~res.configured === 1 && res.entity_id;
          this._supportContact = ok ? res : null;
          return this._supportContact;
        })
        .catch((e) => {
          this.warn("desk: could not resolve the support contact", e);
          this._supportContact = null;
          return null;
        })
        .finally(() => {
          this._supportContactPromise = null;
        });
    }
    return this._supportContactPromise;
  }

  /**
   * Support account id, or null — the synchronous view of supportContact()
   * for code that only runs after it has resolved (inbox row badging).
   */
  supportContactId() {
    return (this._supportContact && this._supportContact.entity_id) || null;
  }

  /**
   * True when the signed-in user IS the support account. The entry point
   * hides for them: there is no conversation to open with yourself.
   */
  isSupportContact() {
    const id = this.supportContactId();
    return !!id && id === Visitor.id;
  }

  /**
   * Contact Support — open a live 1:1 conversation with the support account.
   *
   * There is no room to create: chat.post creates the thread on the first
   * message, so this only has to put the right conversation on screen.
   * Returns false when support could not be resolved, which tells the caller
   * (help_main) to fall back to the mail link rather than leave the click dead.
   *
   * @returns {Promise<Boolean>} whether the conversation was opened
   */
  async openSupportChat() {
    const support = await this.supportContact();
    // Nobody to talk to (unconfigured, deleted, or lookup failed), or the
    // caller IS support: fall back to mail rather than leave the click dead.
    if (!support || ~~support.is_self === 1) {
      openSupportMail();
      return false;
    }

    const peer = {
      entity_id: support.entity_id,
      drumate_id: support.entity_id,
      firstname: support.firstname || "",
      lastname: support.lastname || "",
      display: support.display || LOCALE.SUPPORT_CHAT_TITLE,
      is_support: 1,
    };

    const part = this.getPart && this.getPart(INBOX_SLOT);
    const child =
      part && !part.isEmpty() && part.children && part.children.last();

    // The chat panel is a keep-alive slot: once mounted it is hidden and
    // reshown rather than rebuilt, and togglePanel's mounted-widget branch
    // returns before it can pass options down. Drive the live widget directly
    // so an already-open inbox switches to the support conversation instead
    // of revealing whatever was last open — or toggling itself shut.
    if (child && _.isFunction(child.openPeer)) {
      this.closeOtherSidebarPanels(INBOX_SLOT);
      this._showPanel(part);
      await child.openPeer(peer.entity_id, peer);
      return true;
    }

    await this.togglePanel("chat_p2p", INBOX_SLOT, true, { open_peer: peer });
    return true;
  }

  /**
   * Reward onboarding flow (Figma 3275:236091). Runs AFTER the 5-step
   * tutorial, and only for users the SERVER says are owed a run —
   * `reward.get_state` reads yp.reward_claim, which analytics-server seeds when
   * the campaign mail is accepted. Being mailed is therefore the entitlement,
   * and it follows the user across devices instead of living in one browser.
   * `?reward=1` forces it for local testing; a forced run reports nothing, so
   * it stays repeatable and cannot mask a real campaign run.
   *
   * The campaign is capped at a fixed number of rewarded users. Once they are
   * gone the gate answers `capped`, and the flow mounts to say so instead of
   * walking anyone through a reward that no longer exists.
   */
  async _maybeStartRewardFlow() {
    const args = Visitor.parseModuleArgs();
    const forced = !!args.reward;
    // `?activate=1` asked for the OTHER walkthrough. Both open by having the
    // user create a workspace, so this one stands down rather than winning the
    // race it normally wins and swallowing the flag — a tester on an account
    // that happens to hold a reward_claim row would otherwise see the reward
    // flow and conclude activation was broken.
    if (args.activate) return;
    if (this._rewardFlow && !this._rewardFlow.isDestroyed()) return;
    // Synchronous in-flight latch: onPartReady("overlay") can fire more than
    // once (e.g. re-navigation re-feeding the same module), and the guard
    // above cannot see a mount that is still pending past the await below.
    // Held until the attempt bails out or the flow is actually mounted, so a
    // concurrent call always lands on either the mounted-flow guard above or
    // this latch, never on the gap between them.
    if (this._rewardFlowInFlight) return;
    this._rewardFlowInFlight = true;
    try {
      await Kind.waitFor("reward_flow");
    } catch (e) {
      this._rewardFlowInFlight = false;
      return;
    }
    // Eligibility is the SERVER's answer, not the browser's. It used to be a
    // localStorage latch, which made "has this user finished" a property of the
    // machine: it did not follow them to another device, it grew a key per user
    // on a shared browser, and clearing yp.reward_claim could not reset it.
    // reward.get_state reads that row, so a re-send genuinely re-arms someone.
    let step = "";
    // All of the campaign's limited slots are taken. The flow still mounts —
    // for its sold-out notice, not for a walkthrough. Being told is the point:
    // these users were mailed a promise, so silence would read as the offer
    // never having existed. Users who were never mailed stay ineligible and
    // still see nothing.
    let capped = false;
    if (!forced) {
      let state;
      try {
        // Turn an invitation into an entitlement. Being mailed is not enough —
        // the user has to have followed the CTA — and the click happens while
        // they are signed OUT, so the router stashes it in sessionStorage and it
        // rides through the login reload to here, where there is finally a uid
        // to attribute it to. Awaited before get_state so the row is already
        // 'clicked' when we ask; only consumed once the server has it.
        //
        // MATCHED BY NAME, not by truthiness. There is one arrival slot and now
        // more than one campaign using it, and this runs BEFORE the LAUNCH30
        // check in the same chain (_afterHomeSettled). A bare `if
        // (campaignArrival())` therefore did two wrong things to a promo click:
        // filed it in the reward funnel as a 'clicked' row for an offer the
        // user was never sent, and consumed the marker, so the promo found
        // nothing left to read. Anything that is not ours is left untouched for
        // whoever it belongs to.
        if (campaignArrival() === REWARD_CAMPAIGN) {
          await this.postService(SERVICE.reward.track, {
            hub_id: Visitor.id,
            status: "clicked",
          });
          campaignArrival(true);
        }
        state = await this.fetchService(SERVICE.reward.get_state, { hub_id: Visitor.id });
      } catch (e) {
        // The gate is the only thing standing between a user and an overlay
        // that takes over their screen, so an unreachable server must mean NO.
        this._rewardFlowInFlight = false;
        return;
      }
      if (!state || !state.eligible) {
        this._rewardFlowInFlight = false;
        return;
      }
      capped = !!state.capped;
      // Resume point, so a user who wandered off mid-walkthrough picks up where
      // they were — on whatever device they come back on. Empty for a capped
      // run: the server blanks it, because a sold-out notice has nothing to
      // resume into.
      step = state.step || "";
    }
    this.ensurePart("overlay").then((p) => {
      // Hand `forced` to the widget so a ?reward=1 test run can decline to
      // latch itself off — without it the flow cannot tell a dev poking at the
      // screen from a real campaign arrival, and the docblock's "cannot mask a
      // real campaign run" promise above is not kept.
      p.feed({
        kind: "reward_flow", uiHandler: [this],
        forced: forced ? 1 : 0, capped: capped ? 1 : 0, step,
      });
      this._rewardFlow = p.children.last();
      this._rewardFlow.once(_e.destroy, () => {
        this._rewardFlow = null;
      });
      this._rewardFlowInFlight = false;
    });
  }

  /**
   * Anything the create-workspace form should do differently because a guided
   * flow is on screen.
   *
   * Today one thing, for one flow. activate-workspace's Step 2 invites a
   * teammate, and it needs Step 1 to end on a surface that can do that. For a
   * team workspace it already does — the members panel opens in the same
   * wrapper-modal. For an EXTERNAL one the form launches the secure-share dock
   * instead, which manages links rather than membership, so the walkthrough had
   * no invite surface to hand over to and the user fell through to the plain
   * Step 2 card and its popup — the route a brand-new free-solo account cannot
   * use at all. Overriding the follow-up gives external workspaces the same
   * panel route team workspaces get.
   *
   * Gated on the flow being ON SCREEN rather than on it being in Step 1
   * specifically. It owns the screen for its whole run, so a workspace created
   * while it is up belongs to it either way, and tracking the step here would
   * put a second copy of that state outside the widget that owns it.
   *
   * Returns a spreadable object so the call site reads as "plus whatever a flow
   * asks for", and stays empty — changing nothing — in every ordinary session.
   */
  _createFormOverrides() {
    if (!this._activateFlow || this._activateFlow.isDestroyed()) return {};
    return { post_override: "permission_restricted" };
  }

  /**
   * Workspace activation flow (builtins/widget/activate-workspace) — the
   * practical half of onboarding: the product tour SHOWS the app on a mock
   * desk, this walks the user through building the real thing, a workspace
   * with a file in it.
   *
   * WHEN IT RUNS. Only after an AUTOMATIC product tour — the post-signup one,
   * or `?tutorial=1`. That is the whole gate, and it is what makes the flow
   * one-shot without a latch to store anywhere: the automatic tour happens once
   * per signup and nothing else re-triggers this. A user who leaves the flow
   * half-done does not get it again, which is the accepted cost of not keeping
   * per-user state for it (see the design doc).
   *
   * A tour REPLAYED from Get help is deliberately excluded: handing a
   * months-old account a "create your first workspace" walkthrough because they
   * rewatched the tour would be nonsense. `_tutorialWasAutomatic` is what tells
   * the two apart, and it is recorded when the tour MOUNTS — the flag it reads,
   * `_tourReturnsToHelp`, is consumed by _chainHelpReturnAfterTutorial in that
   * same onPartReady, so by the time the tour is destroyed and this runs there
   * is nothing left to read.
   *
   * It stays unset when no tour ran at all — a plain login, or the fallback
   * that settles home when the tour never mounted — which turns this off for
   * exactly the sessions that were not onboarding anybody.
   *
   * NOT ALONGSIDE THE REWARD FLOW. That flow opens with the same
   * create-workspace walkthrough, and running both back to back would ask the
   * user to build two workspaces. Reward-flow is the one that wins: it is
   * campaign-gated, time-limited and has a prize attached, while this one is
   * evergreen.
   *
   * `?activate=1` forces it for testing, the way `?reward=1` forces the reward
   * flow — see startActivateWorkspace for why a forced run needs no special
   * behaviour of its own, unlike a forced reward run.
   */
  _maybeStartActivateWorkspace() {
    // Forced for a test run: skip the onboarding gate, but keep every guard
    // below that stops two flows fighting over the screen.
    if (!Visitor.parseModuleArgs().activate) {
      // No automatic product tour this session — nobody is being onboarded.
      if (!this._tutorialWasAutomatic) return;
    }
    // Reward-flow is on screen or on its way there — see the docblock. It
    // cannot be both, because a `?activate=1` load makes that flow stand down
    // (see _maybeStartRewardFlow), but a test run started by hand can land
    // while it is up.
    if (this._rewardFlowInFlight) return;
    if (this._rewardFlow && !this._rewardFlow.isDestroyed()) return;
    return this._mountActivateWorkspace();
  }

  /**
   * Run the activation walkthrough NOW, whatever the gate would have said.
   *
   * The hand-operated entry point, and the counterpart to the reward flow's
   * `?reward=1`: `window.Desk = this`, so this is callable straight from the
   * console —
   *
   *   Desk.startActivateWorkspace()
   *
   * — which is the only way to see the flow without a fresh signup, since its
   * automatic trigger is the end of a tour that runs once per account. It is
   * re-callable: the flow keeps no state and latches nothing off, so each call
   * starts a clean run (and each run creates its own workspace).
   *
   * A FORCED RUN IS AN ORDINARY RUN, which is the whole difference from
   * `?reward=1`. That flag has to be threaded into the reward widget so a test
   * cannot write to the campaign funnel or burn one of its limited slots. There
   * is no funnel here, no prize and no latch, so a forced run behaves exactly
   * like a real one and the widget is never told which it is.
   *
   * Bypasses the gate, not the mount latch below: two of these on screen at
   * once would be a mess whoever asked for it.
   */
  startActivateWorkspace() {
    return this._mountActivateWorkspace();
  }

  /** Feed the widget into the desk `overlay` part. Shared by the automatic gate
   *  and the hand-operated entry point above, so both mount it identically. */
  _mountActivateWorkspace() {
    if (this._activateFlow && !this._activateFlow.isDestroyed()) return;
    // Same synchronous latch as the reward flow's: onPartReady("overlay") can
    // fire more than once, and the guard above cannot see a mount still pending
    // past the await below.
    if (this._activateFlowInFlight) return;
    this._activateFlowInFlight = true;
    return Kind.waitFor("activate_workspace")
      .then(() => this.ensurePart("overlay"))
      .then((p) => {
        p.feed({ kind: "activate_workspace", uiHandler: [this] });
        this._activateFlow = p.children.last();
        this._activateFlow.once(_e.destroy, () => {
          this._activateFlow = null;
        });
        this._activateFlowInFlight = false;
      })
      .catch(() => {
        this._activateFlowInFlight = false;
      });
  }

  /**
   * How long an account works in Drumee before the LAUNCH30 offer appears.
   *
   * Five minutes, measured from the home screen settling. Not a cumulative
   * across-sessions figure — a plain timer in the session that would otherwise
   * have shown the popup immediately, which is what "let them use it first"
   * actually needs. Reload before it fires and the wait restarts; the offer is
   * unchanged and still waiting, so nothing is lost.
   */
  // ── Downgrade over-limit (libs/over-limit) ────────────────────────────────

  /**
   * Boot-time entry: fresh server evaluation (self-heals drift), then mount
   * the banner and decide the popup. Runs FIRST in the _afterHomeSettled
   * chain — a locked workspace outranks promo/reward flows, none of which an
   * over-limit org is eligible for anyway.
   *
   * Popup rules (the prototype's own matrix):
   *   over_limit + admin  → shown unless snoozed server-side
   *   over_limit + member → banner only; they can't fix it
   *   hard_lock  + anyone → forced, non-dismissible (member face is a wall)
   */
  async _maybeShowOverLimit() {
    const OverLimit = require("libs/over-limit");
    if (!OverLimit.enforcementOn()) return;
    if (SERVICE.payment && SERVICE.payment.over_limit_state) {
      await OverLimit.refresh(this);
    }
    const c = OverLimit.current();
    if (!c) return;
    this._mountOverLimitBanner();
    if (c.state === "hard_lock") return this._openOverLimitPopup();
    if (OverLimit.isAdmin() && !OverLimit.snoozedForMe()) {
      return this._openOverLimitPopup();
    }
  }

  /**
   * Live updates (WS push → libs/over-limit.setCurrent → this): mount the
   * banner the moment a lock appears mid-session, escalate to the forced
   * popup when hard_lock lands, and re-feed the topbar so the "+ New"
   * cluster follows the read-only state both ways.
   */
  _onOverLimitChanged() {
    if (this.isDestroyed && this.isDestroyed()) return;
    const OverLimit = require("libs/over-limit");
    if (OverLimit.isLocked()) {
      this._mountOverLimitBanner();
      if (OverLimit.isHardLock()) this._openOverLimitPopup();
    }
    this.ensurePart("top-bar").then((part) => {
      if (part && !(part.isDestroyed && part.isDestroyed())) {
        part.feed(require("./skeleton/topbar")(this));
      }
    });
  }

  /** Once per desk life; the banner hides itself while there is nothing to say. */
  _mountOverLimitBanner() {
    if (this._overLimitBannerMounted) return;
    this._overLimitBannerMounted = true;
    this.ensurePart("desk-body").then((part) => {
      if (!part || (part.isDestroyed && part.isDestroyed())) return;
      part.prepend({ kind: "over_limit_banner" });
    });
  }

  // ── Upgrade nudges (payment.upgrade_nudge_state) ──────────────────────────

  /**
   * One boot-time question — "does THIS member get an upgrade nudge?".
   *
   * Everything that makes it fair lives server-side (lib/upgrade-nudge + the
   * yp gate proc): which threshold fired, once per threshold per workspace,
   * the shared daily cap, reset on upgrade. A granted answer is already
   * MARKED shown, which is why this runs last in the _afterHomeSettled chain
   * and re-checks that the screen is clear: fetching earlier could burn the
   * grant under a promo or a lock popup and the member would never see it.
   */
  async _maybeShowUpgradeNudge() {
    try {
      if (!SERVICE.payment || !SERVICE.payment.upgrade_nudge_state) return;
      // A locked workspace already has a louder popup with a real to-do list;
      // upselling on top of it helps nobody.
      const OverLimit = require("libs/over-limit");
      if (OverLimit.enforcementOn() && OverLimit.isLocked()) return;
      if (this._homePopupsBusy()) return;
      const res = await this.fetchService(SERVICE.payment.upgrade_nudge_state, {
        hub_id: Visitor.id,
      });
      const data = (res && res.data) || res || {};
      if (!~~data.show || !data.trigger) return;
      this._openUpgradeNudgePopup(data);
    } catch (e) {
      // Decoration only — a failed nudge must never mark the boot chain red.
      this.warn && this.warn("[upgrade-nudge] state check failed", e);
    }
  }

  async _openUpgradeNudgePopup(nudge) {
    try {
      await Kind.waitFor("upgrade_nudge_popup");
    } catch (e) {
      return;
    }
    if (this.isDestroyed && this.isDestroyed()) return;
    Wm.launch(
      {
        kind: "upgrade_nudge_popup",
        hub_id: Visitor.id,
        wm_unique_id: "upgrade_nudge_popup",
        nudge,
      },
      { explicit: 1, singleton: 1 },
    );
  }

  async _openOverLimitPopup() {
    try {
      await Kind.waitFor("over_limit_popup");
    } catch (e) {
      return;
    }
    if (this.isDestroyed && this.isDestroyed()) return;
    Wm.launch(
      {
        kind: "over_limit_popup",
        hub_id: Visitor.id,
        wm_unique_id: "over_limit_popup",
      },
      { explicit: 1, singleton: 1 },
    );
  }

  static get PROMO_OFFER_DELAY_MS() {
    return 5 * 60 * 1000;
  }

  /**
   * Arm the LAUNCH30 offer for later. Returns at once.
   *
   * Re-armed on every home settle, so the timer is cleared first: two
   * schedules would fire two launches, and Wm's singleton only dedupes what is
   * already on screen.
   *
   * The state fetched now is reused when it fires. It can only go stale by the
   * user claiming or dismissing in the meantime, and both of those destroy the
   * eligibility this timer exists to act on. Duplicate windows are Wm's job —
   * the launch below carries wm_unique_id + singleton, the same protection the
   * immediate path has always relied on.
   */
  _schedulePromoOffer(surface, state) {
    clearTimeout(this._promoOfferTimer);
    this._promoOfferTimer = setTimeout(async () => {
      if (this.isDestroyed && this.isDestroyed()) return;
      try {
        await Kind.waitFor("promo_launch30");
      } catch (e) {
        return;
      }
      if (this.isDestroyed && this.isDestroyed()) return;
      Wm.launch({
        kind: "promo_launch30",
        surface,
        state: "offer",
        position: state.position,
        campaign_ends_at: state.campaign_ends_at,
        hub_id: Visitor.id,
        wm_unique_id: "promo_launch30",
      }, { explicit: 1, singleton: 1 });
    }, this.constructor.PROMO_OFFER_DELAY_MS);
  }

  /**
   * LAUNCH30 — "Start your 1-month Team Plan today". Design doc 2026-07-30.
   * Self-gates on the server (SERVICE.promo.get_state): eligible only on
   * Free, never claimed, not already inside another organisation, and not
   * already shown on this surface (a server flag, never localStorage — see
   * promo_launch30_mark_seen). Safe to call unconditionally from any surface;
   * this is what makes it safe to chain after the reward flow above.
   *
   * Also drives Modal B ("Welcome to Team"): the claim flow moves the payer
   * to a brand-new org domain and an automatic redirect follows almost
   * immediately — too fast for the claiming page to reliably show Modal B
   * and wait for a click (tester feedback 2026-07-31 #2). So the claiming
   * page no longer tries; instead, the FIRST home mount on the new domain
   * lands here, sees claimed_active + welcome_seen=false, and shows it once.
   * Billing.js reuses the returned state to decide whether to render its
   * own persistent "claim pill" for an already-seen, still-unclaimed offer
   * (tester feedback 2026-07-31 #3) — one fetch, two callers.
   *
   * A click on the campaign mail's CTA (utm_campaign=launch30, put there by
   * analytics-server _promoCtaLink) outranks both of the gates the passive
   * path applies. It skips the five-minute hold, because someone who followed
   * a link asking them to claim has already done the waiting the hold exists
   * to protect; and it shows for `eligible_seen` too, because the list this
   * mail goes to is mostly people who were shown Modal A once and did nothing
   * — leaving the show-once flag in charge would make the CTA dead for exactly
   * the audience it was sent to. A deliberate click beats a passive
   * impression, the same reasoning billing's claim pill already uses
   * (settings/account/billing _reopenPromoOffer).
   *
   * @param {string} surface  'home' | 'billing'
   * @returns {Promise<object|undefined>} the fetched promo state, or
   *   undefined if a concurrent call was already in flight or the fetch
   *   failed.
   */
  async _maybeShowPromoLaunch30(surface, opt = {}) {
    const defer = !!opt.defer;
    // Read, not consumed: the marker is spent below, and only once we know
    // whether it produced anything. Spending it here would lose the click to
    // any early return — an unreachable server, a widget bundle that will not
    // load — with nothing shown for it.
    const arrived = campaignArrival() === PROMO_CAMPAIGN;
    if (this._promoLaunch30InFlight) return;
    this._promoLaunch30InFlight = true;
    try {
      let state;
      try {
        state = await this.fetchService(SERVICE.promo.get_state, { hub_id: Visitor.id });
      } catch (e) {
        return;
      }
      if (!state) return;
      // Nothing to offer this account — already claimed, in someone else's
      // org, or the campaign is over. Spend the marker anyway: there is no
      // second thing for it to trigger, and leaving it would re-run all of
      // this on every hashchange for the life of the tab.
      if (arrived && !/^eligible_/.test(state.state || "")) campaignArrival(true);
      if (state.state === "eligible_unseen" || (arrived && state.state === "eligible_seen")) {
        // The OFFER waits until the account has actually used Drumee for a
        // while. It used to fire the moment the home screen settled — for a
        // brand-new account that is the instant the tutorial ends, so the
        // first thing someone saw after being shown around was a full-screen
        // pitch, before they had opened a single file. Hold it back and let
        // them work first (PROMO_OFFER_DELAY_MS).
        //
        // Deferred, never awaited: _afterHomeSettled chains the
        // invited-workspace prompt behind this call, and awaiting a
        // five-minute timer would hold that prompt for five minutes too.
        //
        // A CTA click skips the hold entirely — see the note on this method.
        if (defer && !arrived) {
          this._schedulePromoOffer(surface, state);
          return state;
        }
        try {
          await Kind.waitFor("promo_launch30");
        } catch (e) {
          // Marker deliberately NOT spent: the bundle failed to load, nothing
          // was shown, and a later route in this tab can still honour the
          // click.
          return state;
        }
        Wm.launch({
          kind: "promo_launch30",
          surface,
          state: "offer",
          position: state.position,
          campaign_ends_at: state.campaign_ends_at,
          hub_id: Visitor.id,
          wm_unique_id: "promo_launch30",
        }, { explicit: 1, singleton: 1 });
        // Spent only now, with the modal actually on screen.
        if (arrived) campaignArrival(true);
        return state;
      }
      if (surface === "home" && state.state === "claimed_active" && !state.welcome_seen) {
        try {
          await Kind.waitFor("promo_launch30");
        } catch (e) {
          return state;
        }
        Wm.launch({
          kind: "promo_launch30",
          surface,
          state: "welcome",
          trial_ends_at: state.trial_ends_at,
          hub_id: Visitor.id,
          wm_unique_id: "promo_launch30",
        }, { explicit: 1, singleton: 1 });
      }
      // The trial-ended gate. Unlike the two above it is not one-shot: it
      // returns on every home mount until `ended_seen` says the owner answered
      // it, because losing Team without ever being asked is the outcome this
      // exists to prevent. promoExpiryWorker has already cleared the
      // entitlement by now, so this reports a completed change rather than
      // proposing one.
      if (surface === "home" && state.state === "claimed_expired" && !state.ended_seen) {
        try {
          await Kind.waitFor("promo_launch30");
        } catch (e) {
          return state;
        }
        // Whether Free still fits decides the second screen. Read here rather
        // than in the widget so the gate opens with the answer already in
        // hand — a modal that has to fetch before it can respond to a click
        // is a modal that stalls on the click.
        // Through libs/over-limit rather than a private fetch: it owns the
        // enforcement flag, the shared cache and the CHANGED broadcast, so the
        // banner and this gate stay on one version of the truth. It keeps the
        // last known state on failure and never invents a lock.
        let overLimit = null;
        try {
          const ol = (await require("libs/over-limit").refresh(this)) || {};
          const flags = ol.flags || {};
          if (ol.state && ol.state !== "ok" && (flags.storage || flags.seats)) {
            overLimit = { storage: flags.storage ? 1 : 0, seats: flags.seats ? 1 : 0 };
          }
        } catch (e) { /* unknown -> treat as fitting; the banner still shows */ }
        Wm.launch({
          kind: "promo_launch30",
          surface,
          state: "ended",
          trial_ends_at: state.trial_ends_at,
          over_limit: overLimit,
          hub_id: Visitor.id,
          wm_unique_id: "promo_launch30",
        }, { explicit: 1, singleton: 1 });
      }
      return state;
    } finally {
      this._promoLaunch30InFlight = false;
    }
  }

  /**
   * The tutorial owns the screen while it runs, so the reward flow waits for
   * it to tear down. When there is no tutorial (already seen, or not
   * triggered) this starts the flow straight away.
   */
  /**
   * Everything that waits until Home has finished settling.
   *
   * Onboarding and the tutorial both end by running this chain, and so does a
   * plain login where neither happens — it was written out three times, which
   * is why the guest-join prompt is appended HERE rather than at each site.
   *
   * Order matters: reward flow, then workspace activation, then LAUNCH30, then
   * the invited-workspace prompt. The first three are full-screen and
   * self-gating (activation additionally stands down when the reward flow took
   * the screen — they open with the same walkthrough); the prompt is a small
   * dialog and goes last so it never stacks on top of them.
   *
   * `immediate` says the screen is KNOWN to be clear because a tutorial just
   * finished on it, which is the one moment the LAUNCH30 offer does not have to
   * wait out its five-minute hold. Exactly one of the four callers passes it —
   * see _chainRewardFlowAfterTutorial. The other three cannot: two of them fire
   * precisely because the tutorial's state could not be established, and the
   * third is a returning user the hold was written for.
   *
   * @param {Object}  [opt]
   * @param {Boolean} [opt.immediate] show the LAUNCH30 offer without the hold
   * @returns {Promise}
   */
  _afterHomeSettled(opt = {}) {
    // Once per session. There are now four ways in — no-tutorial, after the
    // tutorial, the tutorial-never-mounted fallback, and a re-fed module — and
    // running the chain twice would ask the reward flow to mount twice and
    // could show the invite dialog again.
    //
    // Set BEFORE the chain below starts, with no await in between, so a second
    // caller cannot interleave: a "Product Tour" replayed from Get help runs
    // the same tutorial-destroy path as a first run and would otherwise reach
    // the immediate branch long after home settled.
    if (this._homeSettledDone) return Promise.resolve();
    this._homeSettledDone = true;
    clearTimeout(this._homeSettledFallback);
    // Raised FIRST, before the two full-screen flows, so someone arriving from an
    // invite link gets an answer for the whole wait rather than a bare desk. It
    // is a no-op unless a workspace is actually armed, and it hides itself while
    // either flow is on screen — see _showInvitedWorkspaceLoader.
    this._showInvitedWorkspaceLoader();
    // Before the two full-screen flows: the billing link is an explicit
    // destination the visitor asked for, and letting the reward flow or the
    // LAUNCH30 offer land on top of it would bury it.
    this._maybeOpenBillingDeepLink();
    // Same tier, same reasoning: a file link is an explicit destination the
    // visitor asked for, so it opens before the reward / LAUNCH30 flows rather
    // than underneath them. After billing only because billing was here first;
    // the two are mutually exclusive in practice (a URL is either #/desk/billing
    // or a file link, never both).
    this._maybeOpenFileDeepLink();
    // Over-limit outranks the promo/reward flows: a locked workspace needs
    // its popup first, and a locked org is not eligible for either promo.
    return this._maybeShowOverLimit()
      .then(() => this._maybeStartRewardFlow())
      // After the reward flow, and skipped entirely when that one mounted: both
      // open with the same create-workspace walkthrough (see
      // _maybeStartActivateWorkspace).
      // .then(() => this._maybeStartActivateWorkspace())
      .then(() => this._maybeShowPromoLaunch30("home", { defer: !opt.immediate }))
      .then(() => this._waitForHomePopups())
      .then((clear) =>
        clear
          ? this._maybeOfferInvitedWorkspace()
          // Popups never cleared inside the limit, so there will be no prompt to
          // hand the loader over to.
          : this._hideInvitedWorkspaceLoader(),
      )
      // Last in the chain on purpose: an upgrade nudge is the least urgent
      // thing this boot can show, and asking the server only when the screen
      // is actually clear means a granted (= marked shown) nudge is never
      // burned underneath a promo, the reward flow or a lock popup.
      .then(() => this._maybeShowUpgradeNudge())
      .catch((e) => {
        this._hideInvitedWorkspaceLoader();
        this.warn && this.warn("[home] post-ready chain failed", e);
      });
  }

  /**
   * Resolve once the reward flow and the LAUNCH30 popup are off the screen.
   *
   * Neither of those methods waits for its own UI: _maybeStartRewardFlow ends
   * on an un-awaited ensurePart("overlay").then(mount), and
   * _maybeShowPromoLaunch30 ends on Wm.launch. Both promises therefore settle
   * while their window is still opening, which is why the invited-workspace
   * dialog was appearing on top of the reward flow instead of after it.
   *
   * So the screen is polled rather than the promises trusted. The first pass is
   * held back past a settle window, because checking immediately would find
   * nothing mounted YET and fire underneath the flow that is about to appear —
   * the same mistake in a different disguise.
   *
   * @returns {Promise<boolean>} false if something was still up at the ceiling,
   *   in which case the caller skips: the intent stays in storage and is
   *   offered on the next login rather than being stacked on a live overlay.
   */
  /**
   * Is a full-screen home flow (reward, workspace activation, LAUNCH30) on
   * screen right now?
   *
   * Extracted from _waitForHomePopups' local busy() so the invited-workspace
   * loader can gate itself on the same answer — one definition, so the loader can
   * never decide it is safe to show while the wait still thinks otherwise.
   *
   * Errs toward "clear": if Wm is not answering, waiting forever is worse than
   * showing a small dialog a moment early.
   *
   * @returns {Boolean}
   */
  _homePopupsBusy() {
    if (this._rewardFlowInFlight || this._promoLaunch30InFlight) return true;
    if (this._activateFlowInFlight) return true;
    if (this._rewardFlow && !(this._rewardFlow.isDestroyed && this._rewardFlow.isDestroyed())) {
      return true;
    }
    // The activation walkthrough owns the whole screen for as long as it runs,
    // exactly like the reward flow above it.
    if (this._activateFlow && !this._activateFlow.isDestroyed?.()) {
      return true;
    }
    try {
      const promo =
        (window.Wm && Wm.getItemsByKind && Wm.getItemsByKind("promo_launch30")) || [];
      if (promo.some((w) => w && !(w.isDestroyed && w.isDestroyed()))) return true;
      // The over-limit popup is a full-screen flow too — stacking the
      // invited-workspace dialog on top of a lock notice helps nobody.
      const ol =
        (window.Wm && Wm.getItemsByKind && Wm.getItemsByKind("over_limit_popup")) || [];
      if (ol.some((w) => w && !(w.isDestroyed && w.isDestroyed()))) return true;
    } catch (e) {
      // Wm not answering — treat as clear rather than waiting forever.
    }
    return false;
  }

  _waitForHomePopups() {
    const SETTLE = 2000;
    const STEP = 250;
    const LIMIT = 10 * 60 * 1000;
    const busy = () => this._homePopupsBusy();
    return new Promise((resolve) => {
      let waited = 0;
      const tick = () => {
        if (this.isDestroyed && this.isDestroyed()) return resolve(false);
        waited += STEP;
        if (waited >= SETTLE && !busy()) return resolve(true);
        if (waited >= LIMIT) {
          this.warn && this.warn("[home] popups still up; deferring the invite prompt");
          return resolve(false);
        }
        setTimeout(tick, STEP);
      };
      setTimeout(tick, STEP);
    });
  }

  /**
   * Hand off to the post-home chain once the tutorial is done with the screen.
   *
   * The two branches are NOT interchangeable, and only the first may settle
   * immediately:
   *
   *   once(destroy)  the tutorial ran and has torn itself down. The screen is
   *                  known clear, and the user has just been walked through
   *                  the product — the one moment the LAUNCH30 offer is worth
   *                  showing without its five-minute hold.
   *   fall-through   we never got a usable handle on the tutorial. That is the
   *                  p.feed()/children.last() race written up on _showTutorial,
   *                  and it means the tutorial is very likely ON SCREEN right
   *                  now. Firing the offer immediately here is the regression a
   *                  tester reported as Modal A stacked over step 1/5; it stays
   *                  on the hold, which is what makes that harmless.
   */
  _chainRewardFlowAfterTutorial(tutorial) {
    if (tutorial && _.isFunction(tutorial.once)) {
      tutorial.once(_e.destroy, () => {
        this._afterHomeSettled({ immediate: 1 });
      });
      return;
    }
    this._afterHomeSettled();
  }

  /**
   *
   */
  async route(opt) {
    if (opt == null) {
      opt = [];
    }
    if (Visitor.parseModuleArgs().submodule) {
      this.warn("Plugins have been move to module/plgins");
      this.warn("Use this link #/plugins?name=plugin-name&kind=entry_kind");
      return;
    }
    let args = Visitor.parseModuleArgs();
    if (args.hasOwnProperty("wm") && window.Wm) {
      return window.Wm.route();
    }
    // The billing link clicked while the desk is already UP: only hashchange
    // fires, home has long since settled, and nothing is about to render over
    // the screen — so open it here and now. On a cold load this stands down
    // and _afterHomeSettled does it instead, because opening before
    // loadDefault() only gets Home painted on top (seen on stage).
    if (this._homeSettledDone && this._maybeOpenBillingDeepLink()) return;
    this._pending = { available: false };
    // The server-side profile.onboarded flag is authoritative: a user who has
    // completed onboarding (persisted via onboarding.update_profile -> onboarded=1)
    // must never be pushed back into the wizard on a later login. Check it FIRST,
    // and also drop any stale "force-onboarding" marker so it can't re-trigger the
    // wizard after completion. Onboarding loads purely from this flag — new
    // accounts are created with onboarded=0 and the plugin is installed.
    if (Visitor.profile().onboarded) {
      try { localStorage.removeItem("force-onboarding"); } catch (e) {}
      return this.loadDefault();
    }
    if (localStorage.getItem("force-onboarding")) {
      return this._loadOnboarding();
    }
    this._loadOnboarding();
  }

  /**
   *
   */
  onChildBubble(c) {
    if (
      (typeof pointerDragged !== "undefined" && pointerDragged !== null) ||
      c.mget(_a.service) != null ||
      c.status === _e.data
    ) {
      return;
    }
    return Wm.unselect();
  }

  /**
   * Check if user needs onboarding and show the onboarding plugin
   * @param {Object} c
   */
  checkIntro(c) {
    if (Visitor.get("is_dmz_hub_copy") == _a.yes) {
      return this.dmzCopyMedia(c);
    }
    this.checkUserOnBoarding(c);
  }

  /**
   * Show onboarding widget if user hasn't completed onboarding
   */
  checkUserOnBoarding(c) {
    if (Visitor.profile().onboarded) return;
  }

  /**
   * @param {Object} c
   */
  dmzCopyMedia(c) {
    if (Visitor.get("is_dmz_hub_copy") == _a.no) {
      return;
    }
    this.fetchService({
      service: SERVICE.media.dmz_detail,
      hub_id: Visitor.id,
    }).then((data) => {
      this.dmzDetailResponse(data);
    });
  }

  /**
   *
   */
  // async playIntroVideo() {
  //   let c = await Wm.playTutorial("intro");
  //   this.__wrapperPopup.clear();
  //   c &&
  //     c.once(_e.destroy, () => {
  //       this.__wrapperPopup.feed(
  //         require("./skeleton/common/intro-popup").default(this)
  //       );
  //     });
  // }

  /**
   *
   */
  // skipIntroPopup() {
  //   return this.postService({
  //     service: SERVICE.drumate.intro_acknowledged,
  //     hub_id: Visitor.id,
  //   }).then((data) => {
  //     Visitor.set(data);
  //     return this.__wrapperPopup.clear();
  //   });
  // }

  /**
   *
   * @param {*} kind
   */
  loadOverlay(kind, opt) {
    this.ensurePart("overlay").then((p) => {
      p.feed({ kind, uiHandler: [this], opt });
    });
  }

  /**
   * @param {Object} c
   */
  checkBrowserSupport(c) {
    if (
      localStorage.getItem("skip-browser-check") ||
      (Visitor.browserSupport() && !Visitor.parseModuleArgs().browser)
    ) {
      return;
    }
  }

  /**
   *
   */
  _loadModule(kind, args) {
    const start = () => {
      const item = {
        kind,
        trigger: this.findPart("ref-avatar"),
        handler: {
          uiHandler: this,
        },
      };
      this._swapping = 0;
      if (this.moduleWrapper.isEmpty()) {
        this.moduleWrapper.feed(item);
      } else {
        const c = this.moduleWrapper.children.last();
        if (c.mget(_a.kind) === kind && _.isFunction(c.route)) {
          c.route();
        } else {
          this._swapping = 1;
          c.parent.collection.remove(c.model); // null, null, ()=>
          this.moduleWrapper.feed(item);
        }
      }
      this._mainMenu.el.setAttribute(_a.data.state, 0);
      this.getPart("top-bar").el.dataset.state = 1;
    };

    if (Kind.exists(kind)) {
      return start();
    }
  }

  /**
   *
   * @param {*} data
   */
  updateBreadcrumb(data, src) {
    RADIO_BROADCAST.trigger("breadcrumb:content", data, src);
  }

  /**
   *
   * @param {*} kind
   * @param {*} pn  Slot name; tracked per-slot in `_pendingKinds`.
   */
  _loadKind(p, kind, pn, opt = {}) {
    this._parkLiveCall();
    p.feed({
      kind,
      uiHandler: [this],
      ...opt,
    });
    if (!this._pendingKinds) this._pendingKinds = {};
    if (pn) this._pendingKinds[pn] = kind;
  }

  /**
   * Slots whose mounted widget uses `data-anim` CSS for slide-in/out.
   * For these we keep the widget alive on close (preserving fetched
   * data + scroll position), only flipping `data-anim`. Other slots
   * fall back to the destroy-and-rebuild pattern.
   */
  _isKeepAliveSlot(pn) {
    return pn === "trash-panel" || pn === "chat-panel";
  }

  _hidePanel(p) {
    if (!p || p.isEmpty()) return;
    const child = p.children.last();
    if (child && child.el && child.el.dataset.anim !== "out") {
      child.el.dataset.anim = "out";
    }
  }

  /**
   * A screen is about to cover the desk — a full-page one in the settings slot
   * (Settings / Billing / Admin Console / Get help) or a slide-out panel
   * (Inbox / Contacts / Trash). Ask a live call to park itself in the desk dock
   * (./skeleton call-dock), which sits above both, instead of being buried
   * inside the window manager where nothing can lift it.
   *
   * A broadcast, not a direct call: the desk deliberately owns no reference to
   * the call window, and this must stay a no-op when there is no call.
   */
  _parkLiveCall() {
    try {
      if (!window.Wm || !_.isFunction(Wm.hasLiveCall) || !Wm.hasLiveCall()) return;
      RADIO_BROADCAST.trigger("call:minimize");
    } catch (e) { /* non-fatal */ }
  }

  /**
   * Any wrapper-modal dialog (alert / confirm / add-folder form / invite /
   * move…) lifts the WHOLE window-manager to z 30000 (the desk skin :has()
   * rule) so the dialog can sit above the side panels. The sidebar does not
   * geometrically overlap the wm, so the user can still navigate while such
   * a dialog is open — the lifted wm (home grid + windows) then covers the
   * panel that opens underneath at z 10001 ("home folder overlays other
   * screen"). Dismiss the modal before showing another screen so the lift
   * is released.
   */
  _dismissWmModal() {
    try {
      const w = typeof Wm !== "undefined" && Wm.__wrapperModal;
      if (!w || !w.el) return;
      if (w.el.dataset.state === "open" || (w.children && w.children.length)) {
        w.clear();
        w.el.dataset.state = "closed";
      }
    } catch (e) { /* non-fatal */ }
  }

  _showPanel(p) {
    this._dismissWmModal();
    this._parkLiveCall();
    if (!p || p.isEmpty()) return false;
    const child = p.children.last();
    if (child && child.el) {
      child.el.dataset.anim = "in";
      return true;
    }
    return false;
  }

  /**
   * Open the mobile drawer in a given mode ("nav" | "actions"). Tapping
   * an already-active button is a no-op (does not toggle closed). The
   * drawer closes only via the in-drawer close button or by tapping the
   * overlay backdrop. No-op on non-mobile.
   */
  /**
   * Open one of the phone's bottom sheets (the approved Option A: workspace
   * switcher / go-to grid / account / create). One host, one sheet at a time —
   * feed() replaces the content wholesale and data-kind lets the skin size
   * each shape.
   */
  _openMobileSheet(kind, content) {
    return this.ensurePart("mobile-sheet-content").then((c) => {
      if (!c) return;
      c.feed(content);
      return this.ensurePart("mobile-sheet-host").then((host) => {
        if (!host || !host.el) return;
        host.el.dataset.kind = kind;
        host.el.dataset.state = "open";
      });
    });
  }

  _closeMobileSheet() {
    this.ensurePart("mobile-sheet-host").then((host) => {
      if (!host || !host.el) return;
      host.el.dataset.state = "closed";
    });
  }

  /**
   * Open the mobile search card (skeleton/index.js). The caller closes the
   * drawer first; the card then re-lights the SAME backdrop, so the two never
   * show together and one tap outside dismisses whichever is up.
   *
   * The card reuses the topbar's part names, so `_searchBoxInner` and
   * `_searchSuggestions` already point at its input and list by the time this
   * runs — nothing here is mobile-specific beyond the card's own visibility.
   *
   * Focus stays inside the click's microtask (no rAF / setTimeout) so the tap's
   * user activation still counts and the soft keyboard opens. focus() fires
   * focusin, whose handler (onPartReady, "search-box") already fetches — the
   * explicit fetch below is the fallback for when it didn't, so the card is
   * never left blank. An empty query is not a no-op: desk.search short-circuits
   * it to mfs_show_node_by, i.e. the user's workspaces.
   */
  _openMobileSearch() {
    return this.ensurePart("mobile-search-card").then((p) => {
      if (!p || !p.el) return;
      p.setState(1);
      this._setMobileBackdrop(true);
      if (this._searchBoxInner && _.isFunction(this._searchBoxInner.focus)) {
        this._searchBoxInner.focus();
      }
      const shown =
        this._searchSuggestions &&
        this._searchSuggestions.el.dataset.state === "1";
      if (shown) return;
      return this._updateSearchSuggestions();
    });
  }

  /**
   * Close the mobile search card and drop its query. A no-op wherever the card
   * was never built (desktop / tablet), which is what lets the shared backdrop,
   * Escape and open-search-hit all call it unconditionally.
   */
  _closeMobileSearch() {
    if (!this._mobileSearchCard) return false;
    if (this._mobileSearchCard.el.dataset.state !== "1") return false;
    this._mobileSearchCard.setState(0);
    this._hideSearchSuggestions();
    if (this._searchBoxInner && _.isFunction(this._searchBoxInner.setValue)) {
      this._searchBoxInner.setValue("");
    }
    this._setMobileBackdrop(false);
    return true;
  }

  /**
   * Toggle the desktop sidebar between the collapsed mini rail (icon-only,
   * expand-on-hover) and pinned-open. Flips data-collapsed on the rail and
   * persists the choice (drumee.sidebar.pinned). The toggle glyph is static
   * (a panel icon) — the rail width itself conveys the state. No-op on
   * mobile (the rail isn't rendered there). See skeleton/sidebar.js +
   * skin/sidebar.scss.
   */
  _toggleSidebarPin() {
    return this.ensurePart("sidebar-rail").then((p) => {
      if (!p || !p.el) return;
      const pinnedNext = p.el.dataset.collapsed === "1"; // collapsed → pin open
      p.el.dataset.collapsed = pinnedNext ? "0" : "1";
      try {
        localStorage.setItem("drumee.sidebar.pinned", pinnedNext ? "1" : "0");
      } catch (e) {}
      // The rail's reserved column goes 64px ↔ 231px, which MOVES and resizes
      // the work area with no browser `resize` event — open windows carry
      // inline pixel geometry and would keep the old box, hanging their whole
      // right side past the viewport edge. Wm watches the container itself
      // (ResizeObserver, see manager.js), so this is only the fallback for a
      // runtime without one; after the 0.18s width transition so the new box
      // is the one measured. Harmless when the observer already handled it —
      // re-fitting to the same area is a no-op.
      if (window.Wm && _.isFunction(Wm.reflowWorkArea)) {
        clearTimeout(this._sidebarPinReflow);
        this._sidebarPinReflow = setTimeout(() => Wm.reflowWorkArea(), 250);
      }
    });
  }

  /**
   * Close the mobile drawer when a navigational sidebar service fires.
   * The set covers the nav-mode rows (Home / Notifications / Inbox /
   * Contacts / Trash / Apps), the actions-mode rows (Add new / Upload /
   * Invite), Settings, and workspace selection. Excluded on purpose:
   * search-files (fires per keystroke) and the mobile-show / mobile-close
   * drawer controls.
   */
  _maybeDismissMobileDrawer(service) {
    if (!this._drawerDismissServices) {
      this._drawerDismissServices = new Set([
        _e.home,
        _e.upload,
        "toggle-activity",
        "toggle-inbox",
        "toggle-contacts",
        "toggle-trash",
        "toggle-apps",
        "toggle-settings",
        "toggle-help",
        "new-workspace",
        "invite-member",
        "load-workspace",
      ]);
    }
    if (this._drawerDismissServices.has(service)) {
      this._closeMobileSheet();
    }
  }

  /**
   *
   */
  togglePanel(kind, pn, openOnly, opt) {
    // Release the wm z-30000 lift before any sidebar screen change — see
    // _dismissWmModal. Covers both the first-open (_loadKind) and the
    // keep-alive re-show (_showPanel) paths.
    this._dismissWmModal();
    if (!this._pendingKinds) this._pendingKinds = {};
    if (!this._closeTimers) this._closeTimers = {};

    // Disable actions when the admin console is active. The Calendar joins the
    // list because it carries its OWN "+ New" (Task / Meeting) in its toolbar —
    // leaving the topbar's "New" (add workspace / upload) visible would put two
    // identically-labelled buttons 24px apart meaning different things.
    this.ensurePart("action-cluster").then((p) => {
      if (["apps_main", "settings_main", "calendar_main"].includes(kind)) {
        p.setState(0);
      } else {
        p.setState(1);
      }
    });

    return this.ensurePart(pn).then((p) => {
      // Mid-flight close animation pending: snap the dying child out so
      // the next kind doesn't paint through a fading sibling.
      if (this._closeTimers[pn]) {
        clearTimeout(this._closeTimers[pn]);
        delete this._closeTimers[pn];
        p.clear();
        this._pendingKinds[pn] = null;
      }

      const keepAlive = this._isKeepAliveSlot(pn);
      const sameKindMounted = this._pendingKinds[pn] === kind && !p.isEmpty();

      if (sameKindMounted && keepAlive) {
        const child = p.children.last();
        const isOpen = child && child.el && child.el.dataset.anim === "in";
        if (isOpen) {
          // Open-only callers (e.g. sidebar Settings / Profile) opt out of
          // the close-on-second-click toggle behaviour.
          if (openOnly) return;
          this._hidePanel(p);
        } else {
          this.closeOtherSidebarPanels(pn);
          this._showPanel(p);
        }
        return;
      }

      // Slot has no slide-out CSS — fall back to animate-then-destroy.
      if (sameKindMounted && !keepAlive) {
        if (openOnly) return;
        const child = p.children.last();
        if (child && child.el) child.el.dataset.anim = "out";
        this._closeTimers[pn] = setTimeout(() => {
          delete this._closeTimers[pn];
          this._pendingKinds[pn] = null;
          p.clear();
        }, 250);
        return;
      }

      if (!p.isEmpty()) {
        p.clear();
        this._pendingKinds[pn] = null;
      }
      this.closeOtherSidebarPanels(pn);
      this._loadKind(p, kind, pn, opt);
    });
  }

  /**
   * Open the billing/subscription screen as a FULL PAGE inside the desk
   * settings-main-slot (Figma design), replacing whatever screen is there —
   * NOT a popup. Every billing entry point (sidebar "Upgrade plan", the
   * Settings "Manage subscription" card, the admin-console upsell, the desk
   * storage "Upgrade plan" card) routes here. page:1 makes settings_billing
   * render its full-page layout (big title + tabs + plans + footer).
   */
  openBillingPage(preselect) {
    RADIO_BROADCAST.trigger("breadcrumb:context", {
      filename: LOCALE.BILLING_SUBSCRIPTION,
    });
    // Extended page -> "Opened billing / plans". Marked HERE rather than on the
    // sidebar item so every route counts: the sidebar entry, the Settings
    // "Manage subscription" card, the desk storage upsell, the admin-console
    // upsell and a #/desk/billing deep link all pass through this method.
    //
    // Fire-and-forget, and never awaited: the user asked for the billing page
    // and an analytics row must not be able to delay or block it. A rejection
    // is swallowed for the same reason.
    //
    // Ship-ahead guard: `desk` services arrive from the server's ACL via
    // Platform.get('services') -- lex/services.json has no `desk` key -- so
    // SERVICE.desk.cta_click is undefined until server-team ships the endpoint.
    // postService is async and its promise rejection is swallowed by .catch,
    // but without this guard the call POSTs to a path built from `undefined`.
    if (SERVICE.desk && SERVICE.desk.cta_click) {
      this.postService(SERVICE.desk.cta_click, { cta: "upgrade", hub_id: Visitor.id },
        { async: 1 }).catch(() => {});
    }
    // `preselect` (plan/cycle/tab) rides in from a #/desk/billing deep link; a
    // plain "Upgrade plan" trigger passes nothing, so the page opens on its
    // default tab exactly as before.
    const opt = Object.assign({ page: 1 }, preselect || {});
    // WHAT THE LOADER COVERS, and it is only this line. Kind.waitFor resolves a
    // dynamic import: settings_billing is a ~280KB chunk, and until it lands
    // nothing on screen changes at all — the previous panel simply sits there
    // while the click appears to have done nothing.
    //
    // It does NOT cover the widget's own data load, deliberately. onDomRefresh
    // paints immediately from Visitor.quota()'s cache and re-renders when the
    // catalog and subscription land; that was a deliberate fix for this same
    // screen sitting blank through two round trips, and covering it with a
    // spinner would put one back over a page that is already readable.
    this._showBillingLoader();
    return Kind.waitFor("settings_billing")
      .then(() => this.togglePanel("settings_billing", "settings-main-slot", true, opt))
      .finally(() => this._hideBillingLoader());
  }

  /** The live billing loader window, or null. */
  _billingLoader() {
    try {
      const all = (window.Wm && Wm.getItemsByKind && Wm.getItemsByKind("window_info")) || [];
      for (const w of all) {
        if (!w || (w.isDestroyed && w.isDestroyed())) continue;
        if (w.mget && w.mget("billing_loading")) return w;
      }
    } catch (e) {
      /* Wm not answering */
    }
    return null;
  }

  /**
   * "Loading plans…" while the billing chunk downloads.
   *
   * Modelled on _showInvitedWorkspaceLoader, and it shares that one's two
   * safety properties: a `dismiss_after` backstop, because a loader with no
   * footer cannot be dismissed by a button and must not outlive its reason even
   * if a future path forgets; and mode "hb", which keeps the drumee/✕ header so
   * it can always be closed by hand.
   *
   * TWO THINGS DIFFER FROM THAT ONE, and both matter here.
   *
   * IT IS DELAYED. The chunk is cached after the first open, so on every visit
   * after that Kind.waitFor resolves in a few milliseconds — and a spinner that
   * appears and vanishes inside one frame reads as a glitch, which is worse
   * than the honest nothing it replaced. The window is only raised if the wait
   * is still running when the timer fires.
   *
   * IT IS NOT ONCE-PER-SESSION. The invited-workspace loader latches on a flag
   * it never clears, because that intent is consumed once. Billing can be
   * opened as many times as somebody clicks Upgrade plan, so the latch is
   * released in _hideBillingLoader — otherwise the second visit, which is
   * usually the cached one, would be the only one that could show it, and the
   * first, which is the slow one, would not.
   */
  _showBillingLoader() {
    if (this._billingLoaderPending) return;
    this._billingLoaderPending = true;
    this._billingLoaderTimer = setTimeout(() => {
      this._billingLoaderTimer = null;
      // The wait ended while we were holding back — this is the cached path,
      // and nothing should appear.
      if (!this._billingLoaderPending) return;
      if (!window.Wm || !Wm.info) return;
      const fig = "window-info";
      Wm.info({
        variant: "notice",
        mode: "hb",
        billing_loading: 1,
        dismiss_after: 30000,
        message: [
          Skeletons.Box.X({
            className: `${fig}__loader`,
            kids: [
              Skeletons.Element({ className: `${fig}__loader-spinner` }),
              Skeletons.Note({
                className: `${fig}__loader-label`,
                content: LOCALE.LOADING_BILLING || "Loading plans…",
              }),
            ],
          }),
        ],
      });
    }, DESK_BILLING_LOADER_DELAY);
  }

  /**
   * Take it down. Idempotent, and called from `finally` so a failed import —
   * an offline tab, a chunk 404 after a redeploy — cannot leave a spinner
   * standing over a desk that has stopped trying.
   */
  _hideBillingLoader() {
    if (this._billingLoaderTimer) {
      clearTimeout(this._billingLoaderTimer);
      this._billingLoaderTimer = null;
    }
    // Released, not latched: see _showBillingLoader. The next Upgrade plan
    // click has to be able to raise it again.
    this._billingLoaderPending = false;
    const w = this._billingLoader();
    if (w && w.goodbye) w.goodbye();
  }

  /**
   * "Unlock Admin Console" upsell when a personal-plan user (free / pro /
   * legacy advanced) clicks the sidebar Admin Console entry.
   *
   * The card itself now lives in `builtins/widget/feature-lock` and is shared
   * with the other tier gates (task views, meeting duration) — it used to be
   * built inline here, which is why it could not be reused by anything outside
   * this module. Copy, layout and the close X moved with it unchanged; see
   * that file for why the X is drawn in the body rather than the confirm
   * header, and for the CTA rule.
   *
   * The modal itself always shows: the plan simply doesn't include the
   * console, whatever the billing setup. Only the CTA is conditional.
   *
   * What stays here is what is specific to THIS caller — where the CTA leads,
   * and putting the sidebar highlight back afterwards either way.
   */
  _showAdminUnlockModal() {
    return Wm.openFeatureLock({ feature: "admin_console" })
      .then(() => {
        // Defence in depth behind the card's own CTA gate: it only renders the
        // button when canUpgradePlan() passes, so reaching here without it
        // means the plan changed while the card sat open. Same guard, same
        // rule, one source — libs/billing.
        if (!canUpgradePlan()) return this._restoreCurrentSidebarHighlight();
        return this.openBillingPage().then(() =>
          this._restoreCurrentSidebarHighlight()
        );
      })
      .catch(() => {
        this._restoreCurrentSidebarHighlight();
      });
  }

  /**
   * Re-assert the sidebar radio highlight for the screen currently on top,
   * or Home when nothing is open. Used after a sidebar item runs a transient
   * action (e.g. the personal-plan Admin Console modal) instead of opening its
   * panel — the click already highlighted that item (onAlsoClick broadcasts
   * `sidebar-radio`), so without this it stays lit over the wrong content.
   */
  _restoreCurrentSidebarHighlight() {
    const service = this._currentScreenService();
    const pn =
      (service && desk_module._RESTORABLE_SCREENS[service]) || "sidebar-home";
    this.ensurePart(pn)
      .then((p) => {
        if (p) RADIO_BROADCAST.trigger("sidebar-radio", p);
      })
      .catch(() => {});
  }

  /**
   * Enforce mutual exclusion between sidebar panels. Keep-alive slots
   * just flip `data-anim` to "out"; other slots get cleared. Activity
   * panel uses `setState` because it predates the anim pattern.
   */
  closeOtherSidebarPanels(except) {
    if (!this._pendingKinds) this._pendingKinds = {};
    if (!this._closeTimers) this._closeTimers = {};
    const slots = ["chat-panel", "settings-main-slot", "trash-panel"];
    const tasks = slots
      .filter((pn) => pn !== except)
      .map((pn) => {
        if (this._closeTimers[pn]) {
          clearTimeout(this._closeTimers[pn]);
          delete this._closeTimers[pn];
        }
        return this.ensurePart(pn).then((p) => {
          if (!p || p.isEmpty()) return;
          if (this._isKeepAliveSlot(pn)) {
            this._hidePanel(p);
          } else {
            this._pendingKinds[pn] = null;
            p.clear();
          }
        });
      });
    if (except !== "activity-panel") {
      tasks.push(
        this.ensurePart("activity-panel").then((p) => {
          if (p) p.setState(0);
        }),
      );
    }
    return Promise.all(tasks);
  }

  /**
   * Close any full-viewport panel mounted in settings-main-slot
   * (Apps, Settings) or trash-panel (Admin members, Trash). Called
   * before navigating to Home or another workspace so the underlying
   * window manager / grid view is not left occluded.
   */
  closeMainPanels() {
    if (!this._pendingKinds) this._pendingKinds = {};
    if (!this._closeTimers) this._closeTimers = {};
    const slots = ["settings-main-slot", "trash-panel", "chat-panel"];
    return Promise.all(
      slots.map((pn) => {
        if (this._closeTimers[pn]) {
          clearTimeout(this._closeTimers[pn]);
          delete this._closeTimers[pn];
        }
        return this.ensurePart(pn).then((p) => {
          if (!p || p.isEmpty()) return;
          if (this._isKeepAliveSlot(pn)) {
            this._hidePanel(p);
          } else {
            this._pendingKinds[pn] = null;
            p.clear();
          }
        });
      }),
    );
  }

  /**
   *
   */
  closeAllPanels() {
    this.closeOtherSidebarPanels();
    return this.closeMainPanels();
  }

  /**
   *
   */
  onWorkspaceClosed() {
    this.ensurePart("breadcrumb").then((p) => {
      p.loadDefault(0);
    });
    this.ensurePart("workspace-main").then((p) => {
      p.collapseTree();
    });
    Wm.headlessLayer.clear();
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    if (pointerDragged || !window.Wm) {
      return;
    }
    this.debug("AAA:830", service);
    // Mobile: tapping a navigational sidebar item dismisses the drawer so
    // the resulting panel/content is visible. on_click items (e.g. logout)
    // never reach here, and drawer-control services (mobile-show-*/close),
    // the search input, and the theme toggle are intentionally excluded —
    // they manage the drawer themselves or are expected to leave it open.
    if (Visitor.isMobile()) {
      this._maybeDismissMobileDrawer(service);
    }
    switch (service) {
      // "Open Workspace" on the post-sign-in invited-workspace dialog. Opens the
      // hub exactly as clicking the "<name> invited you to <workspace>" activity
      // row does — panel/activity/widget/item/index.js, case hub_invite — by
      // handing Wm.route() the same deep link, rather than reaching for
      // loadWorkspace directly and re-deriving what that route already does.
      //
      // Do NOT "simplify" this to Wm.loadWorkspace({hub_id}). That was tried and
      // reverted: loadWorkspace mounts the workspace as a HEADLESS pane, and a
      // headless folder topbar deliberately drops the zoom and minimize chrome
      // (folder/skeleton/topbar.js — `headless ? "" : zoomMenu(ui)`), so the
      // window opened from this dialog lost its zoom control. This route launches
      // a normal popup window_folder, which keeps the full chrome.
      //
      // nid=0 is required, not decorative: it is the server's "this hub's root"
      // value, and openFileLocation would otherwise fetch media.attributes with an
      // undefined nid — see Wm._rootNid for what that costs.
      //
      // The hub comes off the field set when the dialog was armed, NOT off the
      // button's dataset: toolkit's button() does not pass attrOpt, so an
      // action's `dataset` never reaches the element (see
      // wm/push.js acknowledgeWorkspaceAccessRevoked, which documents the same
      // trap and reads the model to work around it). One dialog is armed at a
      // time, so a field is unambiguous and cannot go missing.
      case "guest-join-open-workspace": {
        const hub_id = this._invitedHubId;
        this._invitedHubId = null;
        for (let modal of (this.getItemsByKind && this.getItemsByKind("window_info")) || []) {
          if (modal && modal.mget && modal.mget("guest_join") && modal.goodbye) modal.goodbye();
        }
        if (hub_id) {
          location.hash =
            `#/desk/wm/open/?hub_id=${hub_id}&nid=0&filetype=folder&pid=0&ts=${Date.now()}`;
        }
        return;
      }

      case "focus-folder-tab": {
        const cid = cmd.mget && cmd.mget("wincid");
        const entry = cid && this._openFolders.get(cid);
        const win = entry && entry.win;
        if (!win || win.isDestroyed()) return;
        if (entry.minimized && typeof win.wake === "function") {
          win.wake(cmd);
        } else if (typeof win.raise === "function") {
          win.raise();
        }
        return;
      }

      case "close-folder-tab": {
        const cid = cmd.mget && cmd.mget("wincid");
        const entry = cid && this._openFolders.get(cid);
        const win = entry && entry.win;
        if (!win || win.isDestroyed()) return;
        // {now:true} bypasses goodbye()'s default 2s timeout + scale/opacity
        // animation so the window closes the moment the user clicks × on the
        // header tab. The window's onBeforeDestroy still fires folder:close
        // (popup) or workspace:close (headless pane), which removes the tab.
        if (typeof win.goodbye === "function") win.goodbye({ now: true });
        else if (typeof win.destroy === "function") win.destroy();
        return;
      }

      case _e.home:
        this.updateBreadcrumb({ event: _e.home });
        this.loadHome();
        return;

      // case _e.lock:
      //   return Wm.lock();
      case "onboarding-completed":
        // Drop the manual override flag so a subsequent reload doesn't push
        // the user back into the wizard, and mirror onboarded=1 into the
        // local Visitor profile so route() falls through to loadDefault().
        try {
          localStorage.removeItem("force-onboarding");
        } catch (e) {}
        {
          let p = Visitor.profile && Visitor.profile();
          if (p) p.onboarded = 1;
        }
        // Closing the wizard is a decision, not an accident: someone who
        // dismissed the guided intro has declined it, and injecting the
        // workspace tour into a branch built to skip the wizard would override
        // that. Marked seen rather than merely skipped, for a second reason —
        // this branch writes `onboarded` into the LOCAL profile only (the
        // plugin returns before onboarding.reset), so the wizard can legitimately
        // reappear next session, and without the record the tour would reappear
        // with it. Marked directly rather than through fire(): nothing mounts.
        //
        // `workspace` is the one tour with no contextual trigger, so "later"
        // does not exist for it — the accepted cost is that a skipper never
        // sees it. markSeen no-ops while the kill switch is off, which is
        // correct: with the feature off there is nothing to suppress.
        require("libs/tutorial-tours").markSeen("workspace", this);
        return this.loadDefault();

      case _e.upload: {
        this.closeDeskNewMenu(cmd);
        // Refuse before the file picker opens — a picker that can only
        // produce OVER_LIMIT_READ_ONLY is worse than no picker.
        if (require("libs/over-limit").guardWrite("write")) return;
        // Same reason, different cause: a view/chat member of the CURRENT
        // workspace cannot upload into it, and a picker that can only end in a
        // 403 is worse than no picker.
        if (this._guardWorkspaceWrite()) return;
        return Wm.handleUpload();
      }

      case "toggle-desk-new-create-menu":
        return this.toggleDeskNewCreateMenu(cmd);

      case "launch-gdrive-migration": {
        this.closeDeskNewMenu(cmd);
        // A Drive import writes into the current workspace (it lands on the same
        // upload path), so it needs the same right as "From device".
        if (this._guardWorkspaceWrite()) return;
        const workspace = (Wm && Wm._curWorkspace) || {};
        return Kind.waitFor("migrate_gdrive_popup").then(() => {
          Wm.launch(
            {
              kind: "migrate_gdrive_popup",
              hub_id: workspace.hub_id || Visitor.id,
              nid: workspace.nid || Visitor.get(_a.home_id),
              wm_unique_id: "migrate_gdrive_popup",
            },
            { explicit: 1, singleton: 1 },
          );
        });
      }

      case _e.download:
        return Wm.download();

      case _e.launch:
        return Wm.launch(
          { kind: cmd.mget(_a.respawn) },
          { explicit: 1, singleton: 1 },
        );

      // ── The phone's bottom sheets (Option A) ────────────────────────────
      // Every sheet row fires mobile-sheet-go with its REAL service as
      // goTarget: close the sheet, then re-dispatch so the row lands on the
      // exact handler the desktop surface already has. `args.service` wins
      // over cmd.get(service) in this switch, which is what makes the
      // re-dispatch land on the target instead of back here; the cmd rides
      // along so per-row fields (wsHubId, the office template name) still
      // read with mget.
      case "mobile-sheet-go": {
        const target = cmd.mget("goTarget");
        this._closeMobileSheet();
        if (!target) return;
        if (target === "do-logout") return Butler.logout();
        return this.onUiEvent(cmd, { ...args, service: target });
      }

      case "mobile-sheet-close":
        return this._closeMobileSheet();

      case "mobile-workspace-sheet":
        return this._fetchWorkspaces().then((rows) => {
          const cur = (window.Wm && window.Wm._curWorkspace) || null;
          return this._openMobileSheet(
            "workspace",
            require("./skeleton/mobile-sheets").workspaceSheet(
              this,
              rows || [],
              cur && cur.hub_id,
            ),
          );
        });

      case "mobile-goto-sheet":
        return this._openMobileSheet(
          "goto",
          require("./skeleton/mobile-sheets").gotoSheet(this),
        );

      case "mobile-account-sheet":
        return this._openMobileSheet(
          "account",
          require("./skeleton/mobile-sheets").accountSheet(this),
        );

      // Kept as an alias: anything still emitting the old drawer's
      // "mobile-show-add" lands on the create sheet.
      case "mobile-show-add":
      case "mobile-new-sheet":
        return this._openMobileSheet(
          "new",
          require("./skeleton/mobile-sheets").newSheet(this, {
            mayWrite: this._curWorkspaceCanWrite(),
            mayManage: this._curWorkspaceCanManage(),
            locked: require("libs/over-limit").isLocked(),
          }),
        );

      // The search card lights the shared backdrop itself; the sheet has its
      // own dim, so the only handoff left is closing the sheet first.
      case "open-mobile-search":
        this._closeMobileSheet();
        return this._openMobileSearch();

      case "close-mobile-search":
        return this._closeMobileSearch();

      case "toggle-sidebar-pin":
        return this._toggleSidebarPin();

      case "toggle-activity":
        // Activity predates togglePanel — release the wm modal lift here too.
        this._dismissWmModal();
        return this.ensurePart("activity-panel").then((p) => {
          const state = p.mget(_a.state) ? 0 : 1;
          p.activityState = state;
          p.setState(state);
          if (state) {
            this.closeOtherSidebarPanels("activity-panel");
            // Bell opened: re-fetch the feed so a notification that arrived while
            // it was closed shows without a full page reload. Opening goes through
            // this desk toggle (setState directly), not the panel's own open
            // handler, so the refresh must be triggered here.
            if (typeof p.refreshFeed === "function") p.refreshFeed();
          }
        });

      case "toggle-inbox":
      case "toggle-chat":
        RADIO_BROADCAST.trigger("breadcrumb:context", { filename: LOCALE.INBOX });
        return this.togglePanel("chat_p2p", INBOX_SLOT, true);

      case "toggle-contacts":
        RADIO_BROADCAST.trigger("breadcrumb:context", {
          filename: LOCALE.CONTACTS,
        });
        return this.togglePanel("address_book", "chat-panel");

      // Product spec 2026-07-30 — sidebar click behaviour:
      //   toggle    : notification bell, inbox/chat, contacts, trash
      //   open-only : settings, billing (openBillingPage), admin console,
      //               home (loadHome), user menu (fires toggle-settings)
      case "toggle-settings":
        RADIO_BROADCAST.trigger("breadcrumb:context", {
          filename: LOCALE.SETTINGS,
        });
        // Open-only — clicking Settings (sidebar) or the bottom Profile
        // item never closes the panel; the close icon inside Settings
        // handles closing.
        return this.togglePanel("settings_main", "settings-main-slot", true);

      // Personal Calendar — full-canvas screen in the same slot as Settings /
      // Get help / Billing, so it inherits their mutual exclusion, their
      // reload-restore and their destroy-on-close. Open-only, matching its
      // sidebar neighbours.
      case "toggle-calendar":
        RADIO_BROADCAST.trigger("breadcrumb:context", {
          filename: LOCALE.CALENDAR,
        });
        return this.togglePanel("calendar_main", "settings-main-slot", true);

      // Switcher header ⋯ → the open workspace's own menu, built the way a
      // right-click builds one. Its rows dispatch to the workspace WINDOW.
      case "workspace-menu":
        return this._toggleWorkspaceMenu(cmd);


      // Switcher row → open that workspace. Same entry point the sidebar list
      // used, so area handling, panel cleanup and the breadcrumb update are
      // all unchanged.
      // onUiEvent is not async, so the lookup is chained rather than awaited.
      // _fetchWorkspaces is cached, so this resolves immediately in practice.
      case "switch-workspace":
        return this._switchWorkspace(cmd.mget("wsKey"));

      // ── Workspace rail (Figma 43:23955) ────────────────────────────────
      // Files / Chat / Task / Meet are the folder window's own tabs; Access is
      // its manage-access panel. The rail is global but these are per-window,
      // so the target is resolved at click time rather than cached.
      case "rail-files":
        return this._railTab("files");
      case "rail-chat": {
        // Resolved BEFORE the tab is shown, for the same reason as rail-task
        // and rail-meet below: _railTab falls back to _openDefaultWorkspace()
        // when nothing is open, and a chat tour over the home grid explains a
        // screen the user is not looking at.
        const _hasWs = !!this._activeWorkspace();
        const _res = this._railTab(_a.chat);
        // Contextual tour, on the first press of Chat in the rail.
        //
        // `chat` has described itself as "fired the first time someone opens a
        // workspace's Chat" since 2.0 pulled its five screens out of the folder
        // step (tutorial/tours.js), but no trigger site was ever written: the
        // tour was reachable only from `full` or ?tutorial=chat, so the one tour
        // about threads never ran for anyone who did not ask for the whole
        // product tour — exactly the gap rail-meet was added to close.
        //
        // Raised AFTER showFolderTab so the tour can never swallow the
        // navigation the user asked for — the same ordering rail-task and
        // rail-meet use. Nothing is remembered here: the kill switch, the
        // mobile check, the once-ever seen-set and single-flight all live in
        // libs/tutorial-tours, so a fourth trigger surface can neither
        // duplicate nor lose the gate.
        if (_hasWs) require("libs/tutorial-tours").fire("chat", this);
        return _res;
      }
      case "rail-task": {
        // Resolved BEFORE the tab is shown, because the tour is only right if
        // the click had somewhere to land: _railTab falls back to loadHome()
        // when no workspace is open, and a tracker tour over the home grid
        // explains a screen the user is not looking at.
        const _hasWs = !!this._activeWorkspace();
        const _res = this._railTab(_a.task);
        // Contextual tour, on the first press of Task in the rail.
        //
        // This is the gesture the tour is actually about — five tracker views
        // and the New task dialog. Its other trigger surfaces (wm/index.js on
        // a workspace/folder tile, workspace-list/index.js on a sidebar row)
        // only infer an interest in tasks from having opened a folder, so a
        // user who went straight to the rail would never have seen it.
        //
        // Raised AFTER showFolderTab so the tour can never swallow the
        // navigation the user asked for — the same ordering those two use.
        // Nothing is remembered here: the kill switch, the mobile check, the
        // once-ever seen-set and single-flight all live in libs/tutorial-tours,
        // so a fourth entry point can neither duplicate nor lose the gate.
        if (_hasWs) require("libs/tutorial-tours").fire("folder_task", this);
        return _res;
      }
      case "rail-meet": {
        // Resolved BEFORE the tab is shown, for the same reason as rail-task:
        // _railTab falls back to loadHome() with no workspace open, and a
        // meeting tour over the home grid explains a screen the user is not on.
        const _hasWs = !!this._activeWorkspace();
        const _res = this._railTab("meeting");
        // Contextual tour, on the first press of Meet in the rail.
        //
        // Until now `meeting` had no contextual trigger at all — it was
        // reachable only from the full product tour, so the one tour about
        // meetings never ran for anyone who did not ask for that. This is the
        // gesture it is about.
        //
        // Raised AFTER showFolderTab so the tour can never swallow the
        // navigation. Nothing is remembered here: the kill switch, the mobile
        // check, the account-scoped once-ever seen-set and single-flight all
        // live in libs/tutorial-tours.
        if (_hasWs) require("libs/tutorial-tours").fire("meeting", this);
        return _res;
      }
      // The rail's Access and the switcher header's link icon do the identical
      // thing — hand `folder-manage-access` to the active workspace window,
      // which routes an external workspace to the secure-share panel. Two
      // service names, one implementation: the header's icon is shown only for
      // share/dmz, so it always lands on the link panel, while the rail is
      // global and can also reach the members panel.
      case "rail-access":
        // members: the rail's Access is the "who has access" control, so it
        // shows the permissions matrix for every workspace — external ones
        // included, which used to get the link builder instead.
        return this._railAccess({ members: 1 });

      // Same destination, but wrapped so the header's icon can show it is
      // working — see _workspaceAccessFromHeader. The rail is deliberately NOT
      // wrapped: it is global, so it can also land on permission_restricted,
      // which is not a lazy kind and has nothing to wait for.
      case "workspace-access":
        return this._workspaceAccessFromHeader(cmd);

      // Mute popup CARDS for every workspace — an empty hub_id is the global
      // scope in activity/mute.js. It suppresses the interrupting card only:
      // the Notification Center keeps every row, the badge and the counts.
      //
      // The cache is refreshed from the server's own response inside setMute,
      // never from what we asked for, so it cannot drift from the database.
      // Nothing is written optimistically and the menu is only re-rendered on
      // success — a failed write must not leave a row claiming "Unmute" when
      // nothing is muted.
      case "toggle-mute-all": {
        const { setMute, muteState } = require("builtins/panel/activity/mute");
        const next = !(muteState() || {}).global;
        return setMute(this, "", next).then(({ ok }) => {
          if (!ok) return Wm.alert(LOCALE.MUTE_FAILED);
          // Rebuild the topbar so the row reflects the new state; the menu has
          // already closed itself (persistence: once) by the time this lands.
          if (_.isFunction(this._syncWorkspaceTopbar)) this._syncWorkspaceTopbar();
          return RADIO_BROADCAST.trigger("breadcrumb:content");
        });
      }

      case "toggle-help":
        return this._openGetHelp();

      // "Contact Support" on the Get help screen — opens a live conversation
      // with the support account. help_main handles the false return by
      // falling back to its mail link.
      case "contact-support":
        return this.openSupportChat();

      // "Product Tour" button on the Get help screen.
      case "start-product-tour":
        return this._startProductTour();

      case "toggle-apps": {
        // Personal plans (free / pro / legacy advanced — yp.plan entity_type=user)
        // cannot use Admin Console; short-circuit with the Unlock upsell instead
        // of loading the plugin. Org tiers (team, …) fall through. quota.organization
        // is NOT used: Pro also seeds organization:1. Modal always shows; its
        // Upgrade button is gated by canUpgradePlan() (deployment can sell AND
        // this reader may buy) — see builtins/widget/feature-lock.
        if (needsAdminConsoleUpgrade()) {
          return this._showAdminUnlockModal();
        }
        // Admin Console — the full in-desk console (apps_main) now lives in the
        // @drumee/admin-console plugin. Load it on demand, then render it in the
        // settings-main-slot panel (full-width, in-desk). apps_main does its own
        // privilege gating (upsell for non-admins), so the item stays visible to all.
        RADIO_BROADCAST.trigger("breadcrumb:context", {
          filename: LOCALE.ADMIN_CONSOLE,
        });
        // `tab` rides in from desk:open-admin-console — the storage overage
        // asks for the Storage tab, where the per-workspace cleanup is. The
        // plugin validates it against the tabs this role may see and falls
        // back to its own default, so an unknown value cannot strand anyone.
        const consoleTab = args?.tab;
        const consoleOpt = consoleTab ? { tab: consoleTab } : undefined;
        if (Kind.get("apps_main")) {
          return this.togglePanel("apps_main", "settings-main-slot", true, consoleOpt);
        }
        return Kind.loadPlugin({ name: "admin-console", kind: "apps_main" })
          .then(() => Kind.waitFor("apps_main"))
          .then(() => this.togglePanel("apps_main", "settings-main-slot", true, consoleOpt))
          .catch((e) => this.warn && this.warn("admin-console load failed", e));
      }

      case "toggle-trash":
        RADIO_BROADCAST.trigger("breadcrumb:context", {
          filename: LOCALE.TRASH,
        });
        return this.togglePanel("panel_trash", "trash-panel");

      // Every billing entry point (sidebar "Upgrade plan", Settings "Manage
      // subscription" card, admin-console upsell, desk storage card) → the
      // full-page billing screen in settings-main-slot (NOT a popup).
      case "upgrade-plan":
        // Defense in depth behind the sidebar gating — same rule, one source
        // (libs/billing): ignore stray triggers (deep links, stale UI, an
        // install with no payment backend) that could otherwise dead-end.
        if (!canUpgradePlan()) return;
        return this.openBillingPage();

      // Display mode (light/dark/system) moved to Settings → Appearance.
      // See builtins/widget/settings/main + utils router/theme.js.

      case "open-contact-manager":
        return Wm.launch(
          { kind: cmd.mget(_a.respawn), args: cmd.mget(_a.router) },
          { explicit: 1, singleton: 1 },
        );

      case "close-popup":
      case "close-modal":
        // this.popup.children.last().softDestroy();
        return Backbone.history.navigate(_K.module.desk);

      case "skip-browser-check":
        localStorage.setItem("skip-browser-check", 1);
        Wm.closeAlert();
        return;

      case _e.copy:
      case _e.cut:
        return Wm.storeClipboard(service);

      case _e.paste:
        return Wm.paste();

      case "search-files":
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
          this._updateSearchSuggestions(cmd);
          this._timer = null;
        }, 300);
        return;

      case _e.Enter:
        if (this._timer) clearTimeout(this._timer);
        this._timer = null;
        if (cmd.mget(_a.service) == "search-files") {
          this._updateSearchSuggestions(cmd);
        }
        return;

      case "copy-link":
        return Wm.copyLink();

      case "open-search-hit": {
        // Topbar search result click. Reveal the hit in context rather than
        // opening its containing hub root:
        //   file        → open host folder (pid) + highlight the file cell
        //   folder/hub   → open it + flash its new files
        //   message      → open the hosting chat scope (see _openMessageHit)
        // Files/folders reuse the notification-reveal path (openFileLocation).
        this._hideSearchSuggestions();
        this._closeMobileSearch();
        const hit = cmd && cmd.model ? cmd.model.toJSON() : {};
        if (hit.result_type === "message") {
          return this._openMessageHit(hit);
        }
        this.closeAllPanels();
        // A hub/workspace hit has no host folder to reveal it in (pid is 0/root)
        // — open the hub itself. Files and sub-folders reveal in their host
        // folder (pid) with the cell highlighted, via the notification path.
        if (hit.filetype === _a.hub) {
          return Wm.loadWorkspace({ ...hit });
        }
        return Wm.openFileLocation({ ...hit, highlight: 1 });
      }

      case "load-workspace":
        this._hideSearchSuggestions();
        // Close occluding panels FIRST, then loadWorkspace. Chain via
        // promise — loadWorkspace only updates list.setApi() and the
        // partition-prep visibility flip can bail if the list is still
        // covered by an Apps/Settings panel during restart.
        this.closeAllPanels();
        Wm.loadWorkspace(cmd);
        return;

      // The switcher's "New workspaces" button. Same preamble as the shared
      // case below — close the menu behind the modal, refuse while over limit —
      // but tells Wm to open the WORKSPACE form regardless of what is open.
      //
      // Delegating rather than feeding media_form here on purpose: Wm's case
      // owns the wrapper-modal plumbing (the data-state / data-overlay stamps
      // and the _closeWhenEmpty hook that waits for the whole media_form ->
      // permission_* chain to empty). A second copy of that is what drifts.
      case "new-workspace-form": {
        this.closeDeskNewMenu(cmd);
        if (require("libs/over-limit").guardWrite("write")) return;
        return Wm.onUiEvent(cmd, {
          ...args,
          service: "new-workspace",
          force_workspace: 1,
          ...this._createFormOverrides(),
        });
      }

      case "new-workspace": {
        this.closeDeskNewMenu(cmd);
        // Create workspace is a write — block at the UI before media_form /
        // desk.create_hub ever runs (context menu, sidebar, topbar all land
        // here or on Wm's twin case).
        if (require("libs/over-limit").guardWrite("write")) return;
        return Wm.onUiEvent(cmd, {
          ...args,
          service: "new-workspace",
          ...this._createFormOverrides(),
        });
      }

      case "new-note": {
        this.closeDeskNewMenu(cmd);
        // Note opens a local editor with no round-trip — the REST clamp
        // never sees it. Gate here so hard-lock / over_limit don't leave
        // a writable markdown window on a read-only desk.
        if (require("libs/over-limit").guardWrite("write")) return;
        // A note is saved into the current workspace (media.save asks for the
        // write bit), so refuse here rather than open an editor that cannot save.
        if (this._guardWorkspaceWrite()) return;
        Wm.windowsLayer.append({
          kind: "editor_markdown",
          uiHandler: [this],
        });
        return;
      }
      case "new-document":
      case "new-spreadsheet":
      case "new-presentation": {
        this.closeDeskNewMenu(cmd);
        // Office create hits euroffice.new_doc; refuse before the spinner /
        // "network error" path that the plugin's own error handler shows.
        if (require("libs/over-limit").guardWrite("write")) return;
        // Same for a viewer who simply lacks write in this workspace.
        if (this._guardWorkspaceWrite()) return;
        Wm.newDocument(cmd);
        return;
      }

      case "invite-member": {
        // Invites are paused while the workspace is over its plan limits —
        // the topbar button is already hidden, but other entry points (member
        // panels, workspace menus) still land here. Answer with words, not a
        // popup whose submit can only be refused.
        if (require("libs/over-limit").guardWrite("invite")) return;
        // Managing members needs the ADMIN bit (hub.invite is `src: admin`), so
        // refuse with words rather than open a popup whose submit can only 403.
        if (!this._curWorkspaceCanManage()) {
          this._sayWeakPrivilege();
          return;
        }
        return this._openInvitePopup(cmd);
      }

      // A guided walkthrough (reward-flow's Step 1, activate-workspace's) is
      // asking the desk to open/close the topbar Add-new dropdown on its behalf
      // — the desk owns the `addmenu` part. Used by their Back to step from the
      // create-modal back to the dropdown, and from the dropdown back to the
      // Add-new button.
      //
      // Two names for one case: `reward-*` is the original, kept because
      // reward-flow still fires it, and `guided-*` is what every flow written
      // since asks for. Renaming the original would have meant editing a live
      // campaign widget for cosmetics.
      case "guided-set-add-menu":
      case "reward-set-add-menu":
        return this.ensurePart("addmenu").then((p) => {
          if (!p || !_.isFunction(p.changeState)) return;
          const setCreateMenuState = (state) => {
            const group = p.el?.querySelector(
              ".desk-module-topbar__new-menu-create-group",
            );
            if (group) group.dataset.submenu = state;
          };
          if (!args.open) {
            setCreateMenuState(_a.closed);
            return p.changeState(false);
          }

          // Opening this menu programmatically can't rely on changeState alone:
          //   - _openItems() early-returns on a truthy `isOpen`, and `isOpen` is
          //     only cleared by _onClosed — the CLOSE animation's completion
          //     callback. Opening the create-modal over the dropdown interrupts
          //     that animation, leaving `isOpen` stale true so every later open
          //     silently no-ops.
          //   - even when it does run, the dropdown only becomes VISIBLE once
          //     the OPEN animation completes (_onOpen sets data-state="1" on the
          //     menu root, which the topbar CSS keys visibility off).
          // So: clear the stale flag, ask it to open (this runs the animation
          // that slides the items into place), then set data-state="1" on the
          // root ourselves — per topbar.scss that alone un-hides the items, so
          // the walkthrough no longer depends on the animation landing.
          // `isOpen` is deliberately NOT set here: _openItems() awaits its
          // coordinates and re-checks the flag, so setting it would abort the
          // animation and leave the items parked off-position.
          p.isOpen = false;
          if (p.model && _.isFunction(p.model.set)) p.model.set(_a.state, 0);
          p.changeState(true);
          if (p.el && p.el.dataset) p.el.dataset.state = 1;
          setCreateMenuState(_a.open);
        });

      // Same pair of names, same reason as the case above.
      case "guided-set-new-create-menu":
      case "reward-set-new-create-menu":
        return this.ensurePart("desk-new-create-group").then((p) => {
          if (p && p.el) {
            p.el.dataset.submenu = args.open ? _a.open : _a.closed;
          }
        });

      // Relayed to whichever guided flow is running: it opened this popup
      // through the "invite-member" service above, so the popup's uiHandler is
      // the desk, not the flow. Both are told — they cannot be on screen
      // together (activation stands down when the reward flow mounts), so at
      // most one of these does anything.
      case "invitation-sent":
        if (this._rewardFlow && !this._rewardFlow.isDestroyed()) {
          this._rewardFlow.onInvitationSent();
        }
        if (this._activateFlow && !this._activateFlow.isDestroyed()) {
          this._activateFlow.onInvitationSent();
        }
        return;

      case "toggle-user-menu":
        return this._toggleUserMenu();

      case "open-account":
        this._closeUserMenu();
        return Wm && Wm.onUiEvent
          ? Wm.onUiEvent({ mget: () => _a.account }, { service: _a.account })
          : null;

      case _a.helpdesk:
        this._closeUserMenu();
        return Wm && Wm.onUiEvent
          ? Wm.onUiEvent({ mget: () => _a.helpdesk }, { service: _a.helpdesk })
          : null;

      case "user-disconnect":
        this._closeUserMenu();
        return Butler && Butler.logout && Butler.logout();

      case "settings-account":
        return Wm.openAccountSettings();

      case "disconnect-shared":
        return this.disconnectShared(cmd);

      case "network-event":
        return noOperation();

      case "close-info-popup":
        // this.__wrapperPopup.clear();
        return Backbone.history.navigate(_K.module.desk);

      case "open-settings":
        return this.loadOverlay("window_wallpaper_settings");

      case "load-custom-plugin":
        let { name, kind } = cmd.mget("plugin");
        return Kind.loadPlugin({ name, kind })
          .then(() => {
            Kind.waitFor(kind).then((k) => {
              this.loadOverlay(kind);
            });
          })
          .catch((e) => {
            this.warn(`Failed to load plugin`);
          });

      // case "open-user-guide":
      //   return this.loadOverlay("settings_helpcenter");

      // case "open-chat":
      //   return Wm.launch(
      //     { kind: "window_bigchat", source: cmd },
      //     { explicit: 1, singleton: 1 },
      //   );

      // case "set-wallpaper-color":
      // case "set-wallpaper-image":
      //   return uiRouter.setWallpaper(args.data);

      case "activity-update":
        if (args.unread_count == null) return;
        return this._writeActivityCount(args.unread_count);

      // default:
      // Wm.unselect();
    }
  }

  _toggleUserMenu() {
    if (!this._userMenuItems) return;
    const cur = this._userMenuItems.el.dataset.state || "closed";
    const next = cur === "open" ? "closed" : "open";
    this._userMenuItems.el.dataset.state = next;
    if (next === "open") {
      if (!this._userMenuDismiss) {
        this._userMenuDismiss = (e) => {
          if (
            this._userMenuItems &&
            !this._userMenuItems.el.contains(e.target) &&
            this._userMenuTrigger &&
            !this._userMenuTrigger.el.contains(e.target)
          ) {
            this._closeUserMenu();
          }
        };
      }
      setTimeout(
        () => document.addEventListener("mousedown", this._userMenuDismiss),
        0,
      );
    } else {
      this._closeUserMenu();
    }
  }

  _closeUserMenu() {
    if (this._userMenuItems) this._userMenuItems.el.dataset.state = "closed";
    if (this._userMenuDismiss) {
      document.removeEventListener("mousedown", this._userMenuDismiss);
    }
  }

  async _openInvitePopup(cmd) {
    if (typeof Wm === "undefined" || !Wm || !Wm.__wrapperModal) return;
    if (this._invitePopup && !this._invitePopup.isDestroyed()) {
      Wm.__wrapperModal.clear();
      Wm.__wrapperModal.el.dataset.state = "closed";
      this._invitePopup = null;
      return;
    }
    // Free: solo — no invites (silent). Seat cap is org-members only
    // (Admin member_add); hub.invite is not gated by Team seat headcount.
    const { isFreeSoloPlan, showFreeSoloLimit } = require("libs/billing");
    if (isFreeSoloPlan()) return showFreeSoloLimit();
    return Kind.waitFor("invite_popup").then(() => {
      const ws = (Wm && Wm._curWorkspace) || {};
      Wm.__wrapperModal.feed({
        kind: "invite_popup",
        hub_id: ws.hub_id || Visitor.id,
        uiHandler: [this],
      });
      this._invitePopup = Wm.__wrapperModal.children.last();
      this._invitePopup.once(_e.destroy, () => {
        this._invitePopup = null;
        // Same pair as the "invitation-sent" relay above: whichever guided flow
        // asked for this popup needs to know it has gone, and only one of them
        // can be running.
        if (this._rewardFlow && !this._rewardFlow.isDestroyed()) {
          this._rewardFlow.onInvitePopupClosed();
        }
        if (this._activateFlow && !this._activateFlow.isDestroyed()) {
          this._activateFlow.onInvitePopupClosed();
        }
      });
    });
  }

  // Escape → dismiss transient UI. Fires the framework's OWN dismiss signal
  // rather than inventing one: RADIO_CLICK.trigger(_e.click) with NO event makes
  // every volatility:1/2 view goodbye() (letc.js onBeforeRender short-circuits on
  // `e == null`) and closes any open menu (menu/index.js _onOutsideClick guards
  // on `origin != null`, so a null event is safe). media/interact.js already
  // calls it exactly this way when opening an inline rename, so this is an
  // established idiom, not a new mechanism.
  //
  // Reports NOT handled on purpose, so Escape keeps its browser defaults —
  // leaving fullscreen, cancelling an IME composition, stopping a load. There is
  // also no way to know whether anything was actually dismissed (the signal is
  // fire-and-forget), and claiming a key we may not have used would swallow it.
  _dismissTransientUi() {
    if (typeof RADIO_CLICK === "undefined" || !RADIO_CLICK) return false;
    RADIO_CLICK.trigger(_e.click);
    return false;
  }

  // One Escape peels ONE layer: a live transient layer takes the press, and only
  // when there is none does a window close. Always reports not-handled so Escape
  // keeps its browser defaults.
  _onEscape() {
    // In fullscreen Escape belongs to the browser — it exits, and we do nothing
    // else, so one press never has two effects.
    if (this._inFullscreen()) return false;
    if (this._hasTransientLayer()) {
      this._dismissTransientUi();
      return false;
    }
    // Ahead of _closeEscapeModal: the search card is the topmost layer on
    // mobile, so it must consume the press before anything under it. Returns
    // false (no card / already closed) everywhere else, so desktop is unchanged.
    if (this._closeMobileSearch()) return false;
    if (this._closeEscapeModal()) return false;
    this._closeEscapeWindow();
    return false;
  }

  // A modal/panel closes before the window that hosts it. Opt-in by kind: each
  // listed widget implements onEscape() and returns true when it consumed the
  // press. Deliberately an explicit list and NOT a DOM sweep — Skeletons.Wrapper
  // is used 145 times for ordinary containers (attachment wrappers, overlay
  // slots), so there is no generic "this is a modal" marker to match on.
  // The search is bounded to the target window's own subtree, because
  // getItemsByAttr walks every descendant and the desk tree can be large.
  _closeEscapeModal() {
    const w = this._escapeWindowTarget();
    if (!w || !_.isFunction(w.getItemsByKind)) return false;
    for (const kind of ESCAPE_MODAL_KINDS) {
      let items;
      try {
        items = w.getItemsByKind(kind) || [];
      } catch (e) {
        continue;
      }
      for (const it of items) {
        try {
          if (it && _.isFunction(it.onEscape) && it.onEscape() === true) return true;
        } catch (e) {
          // a broken panel must not block Escape from reaching the window
        }
      }
    }
    return false;
  }

  // Is a transient layer live? Deliberately CONSERVATIVE — anything uncertain
  // answers true, which costs at most one extra Escape press, whereas a false
  // negative closes a window the user did not mean to close.
  //
  //  - RADIO_CLICK's subscriber list is the framework's own bookkeeping: the only
  //    subscribers are volatility:1/2 views (letc.js onBeforeRender) and open
  //    `menu` widgets.
  //  - volatility arms that subscriber on a 500 ms delay, so a just-opened info
  //    popover is invisible above. Its container is not: `__info-container` is
  //    used by exactly the four info / file-info popovers and nothing else.
  //  - a right-click context menu is volatility:4, armed on RADIO_POINTER rather
  //    than RADIO_CLICK, so it is neither seen nor dismissed by the signal above.
  //    It is matched by class instead. We do NOT fire RADIO_POINTER to dismiss it:
  //    window/selection subscribes to the same pointerdown for rubber-band
  //    select, and a synthetic event would reach that too.
  _hasTransientLayer() {
    try {
      const ev =
        typeof RADIO_CLICK !== "undefined" && RADIO_CLICK && RADIO_CLICK._events;
      const subs = ev && ev[_e.click];
      if (subs && subs.length) return true;
    } catch (e) {
      return true;
    }
    try {
      if (document.querySelector('[class*="__info-container"], .drumee-contextmenu')) {
        return true;
      }
    } catch (e) {
      return true;
    }
    return false;
  }

  // Escape must not double as exit-fullscreen. The browser already owns Escape
  // there, and both the document player and the webrtc room watch
  // fullscreenchange — one press must not also destroy the window.
  _inFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    );
  }

  // Close the window Escape should act on: the one containing focus, else the
  // topmost by z-index (the same max-zIndex scan the window manager itself uses
  // in selectWindow). Minimized windows are skipped, and so is any window whose
  // destruction would drop a live call — `leaveRoom` is defined only on
  // builtins/webrtc/room/jitsi (meeting, connect, screenshare, litechat) and
  // room.onBeforeDestroy calls it, so its presence is exactly the signal that
  // closing would hang up.
  //
  // Closing goes through the SAME path as the titlebar X: window/core's
  // onUiEvent reads `args.service || …`, so passing args never touches `cmd`.
  _closeEscapeWindow() {
    // Redundant with the check in _onEscape, on purpose: this destroys a window,
    // so it re-asserts the guard rather than trusting its only caller.
    if (this._inFullscreen()) return false;
    const target = this._escapeWindowTarget();
    if (!target || !_.isFunction(target.onUiEvent)) return false;
    target.onUiEvent(null, { service: _e.close });
    return true;
  }

  // The window Escape acts on: the one containing focus, else the topmost by
  // z-index (the same max-zIndex scan the window manager uses in selectWindow).
  // Minimized and destroyed windows are skipped, and so is any window whose
  // destruction would drop a live call.
  _escapeWindowTarget() {
    const wm = window.Wm;
    if (!wm || !_.isFunction(wm.getWindowsPool)) return null;
    let list;
    try {
      const pool = wm.getWindowsPool();
      if (!pool || !pool.children || !_.isFunction(pool.children.toArray)) return null;
      list = pool.children.toArray();
    } catch (e) {
      return null;
    }
    const node = document.activeElement;
    let top = null;
    let max = -Infinity;
    let focused = null;
    for (const w of list) {
      if (!w || !w.el) continue;
      if (_.isFunction(w.isDestroyed) && w.isDestroyed()) continue;
      if (w.mget(_a.minimize)) continue;
      if (_.isFunction(w.leaveRoom)) continue;
      if (node && _.isFunction(w.el.contains) && w.el.contains(node)) focused = w;
      const z = parseInt(w.getActualStyle(_a.zIndex), 10);
      if (isFinite(z) && z > max) {
        max = z;
        top = w;
      }
    }
    return focused || top;
  }

  // Ctrl/Cmd+Shift+F. Context-sensitive: inside a chat window it opens that
  // chat's message search, anywhere else it focuses the topbar file search.
  // Returns false when there is nothing to focus, so the key keeps whatever it
  // does today rather than being swallowed (libs/hotkeys rule 3).
  _focusSearch(e) {
    const chat = this._bigchatFor(e && e.target);
    if (chat) return this._openChatSearch(chat);
    // On desktop the file search is the WORKSPACE toolbar's field, owned by the
    // folder window (window/skeleton/toolkit workspaceSearchBox) — it searches
    // that one workspace, and the desk holds no box of its own there. The desk's
    // own `_searchBoxInner` is the mobile search card, which is global.
    if (this._focusWorkspaceSearch()) return true;
    if (!this._searchBoxInner || !_.isFunction(this._searchBoxInner.focus)) {
      return false;
    }
    // focusin on the box already opens the suggestions list (see onPartReady).
    this._searchBoxInner.focus();
    return true;
  }

  // Focus the search field of the workspace window the user is looking at: the
  // one containing focus, else the last-opened popup, else the workspace pane
  // itself (`headless`, the full-area window behind any popup). False when no
  // folder window is open or its <input> has not been built yet, so the key
  // falls through to whatever else can answer it.
  _focusWorkspaceSearch() {
    const wm = window.Wm;
    if (!wm || !_.isFunction(wm.getItemsByKind)) return false;
    let open;
    try {
      open = wm.getItemsByKind("window_folder") || [];
    } catch (err) {
      return false;
    }
    const live = open.filter(
      (w) =>
        w &&
        !(_.isFunction(w.isDestroyed) && w.isDestroyed()) &&
        _.isFunction(w.focusWorkspaceSearch),
    );
    if (!live.length) return false;
    const node = document.activeElement;
    const focused = node
      ? live.find((w) => w.el && _.isFunction(w.el.contains) && w.el.contains(node))
      : null;
    const popups = live.filter((w) => !w.mget(_a.headless));
    const target = focused || popups[popups.length - 1] || live[0];
    return !!target.focusWorkspaceSearch();
  }

  // The chat window containing `target`, or null. Keyed on focus rather than on
  // z-order because "search where I am typing" is the predictable rule, and Wm
  // exposes no notion of a current window. Wm itself is guarded: in a DMZ /
  // secure-share session window.Wm is the constrained share panel and has no
  // getItemsByKind (see window/utils.js).
  _bigchatFor(target) {
    const wm = window.Wm;
    if (!wm || !_.isFunction(wm.getItemsByKind)) return null;
    const node = target && target.nodeType ? target : document.activeElement;
    if (!node) return null;
    const open = wm.getItemsByKind("window_bigchat") || [];
    for (const w of open) {
      if (w && w.el && _.isFunction(w.el.contains) && w.el.contains(node)) return w;
    }
    return null;
  }

  // Reuses bigchat's own toggle for the OPEN path (it opens and focuses in one
  // step). When the bar is already open we only focus it — calling the toggle
  // again would CLOSE it and wipe the query, which is not what a search
  // shortcut should do. Note the method name is `_toogleSearchBar` in bigchat.
  _openChatSearch(chat) {
    if (!_.isFunction(chat.getPart)) return false;
    const bar = chat.getPart(_a.search);
    if (bar && bar.el && bar.el.dataset.mode === _a.open) {
      const input = chat.getPart("search-bar-input");
      if (input && _.isFunction(input.focus)) {
        input.focus();
        return true;
      }
      return false;
    }
    if (!_.isFunction(chat._toogleSearchBar)) return false;
    chat._toogleSearchBar();
    return true;
  }

  _getSearchValue(cmd) {
    if (cmd && _.isFunction(cmd.getValue)) return (cmd.getValue() || "").trim();
    if (this._searchBoxInner && _.isFunction(this._searchBoxInner.getValue)) {
      return (this._searchBoxInner.getValue() || "").trim();
    }
    return (cmd?.mget?.(_a.value) || cmd?.mget?.("value") || "").trim();
  }

  _updateSearchSuggestions(cmd) {
    const string = this._getSearchValue(cmd);
    this._showSearchSuggestions();
    return this.ensurePart("suggestions-list").then((list) => {
      list.setApi({
        service: SERVICE.desk.search,
        hub_id: Visitor.id,
        string,
        page: 1,
      });
      list.restart();
    });
  }

  _showSearchSuggestions() {
    if (!this._searchSuggestions) return;
    if (this._searchSuggestions.el.dataset.state !== "1") {
      this._searchSuggestions.setState(1);
    }
    // Mobile: no outside-click dismisser. The list is the body of the search
    // card, not a dropdown hanging off a topbar — `_searchContainer` is the
    // topbar cluster, which does not exist on mobile, so the check below would
    // read every tap as "outside" and collapse the card's own results on first
    // touch. Dismissal there is the backdrop, the ✕ and Escape.
    if (this._mobileSearchCard) return;
    if (this._suggestionsDismiss) return;
    this._suggestionsDismiss = (e) => {
      const inside =
        this._searchContainer && this._searchContainer.el.contains(e.target);
      if (!inside) this._hideSearchSuggestions();
    };
    document.addEventListener("mousedown", this._suggestionsDismiss);
  }

  _hideSearchSuggestions() {
    if (this._searchSuggestions) this._searchSuggestions.setState(0);
    if (this._suggestionsDismiss) {
      document.removeEventListener("mousedown", this._suggestionsDismiss);
      this._suggestionsDismiss = null;
    }
  }

  /**
   * A message search hit was clicked. Land the user in the hub that hosts the
   * conversation. `channel_search` gives us hub_id (tagged by the service) plus
   * message_id / thread_id / file_thread_id, but NOT the file nid needed to
   * scope the chat to the exact thread — so the reliable, deliverable target is
   * the hosting hub itself, opened via the same hub_id-only path the deep-link
   * flow uses (Wm.loadWorkspace resolves the hub root via media.attributes).
   *
   * Scrolling the chat to the exact message is a deliberate follow-up: it needs
   * the thread's file nid (not currently returned by channel_search) plus a
   * launch-time jump wired into window_folder's chat. loadWorkspace's apply()
   * re-fetches attributes and only forwards those, so passing scroll hints here
   * would be silently dropped — left out on purpose rather than faked.
   */
  _openMessageHit(data = {}) {
    const hub_id = data.hub_id;
    if (!hub_id) {
      this.warn && this.warn("_openMessageHit: missing hub_id", data);
      return;
    }
    this.closeAllPanels();
    return Wm.loadWorkspace({ hub_id });
  }

  /** No need - use menu  widget */
  // _toggleAddMenu() {
  //   if (!this._addMenu) return;
  //   const open = this._addMenu.el.dataset.state === "1";
  //   if (open) {
  //     this._hideAddMenu();
  //   } else {
  //     this._addMenu.el.dataset.state = 1;
  //     if (!this._addMenuDismiss) {
  //       this._addMenuDismiss = (e) => {
  //         const wrapper = this._addMenu.el.parentElement;
  //         if (wrapper && !wrapper.contains(e.target)) this._hideAddMenu();
  //       };
  //       document.addEventListener("mousedown", this._addMenuDismiss);
  //     }
  //   }
  // }

  /** No need - use menu  widget, persitence : once */
  // _hideAddMenu() {
  //   if (this._addMenu) this._addMenu.el.dataset.state = 0;
  //   if (this._addMenuDismiss) {
  //     document.removeEventListener("mousedown", this._addMenuDismiss);
  //     this._addMenuDismiss = null;
  //   }
  // }

  /**
   *
   * @param {*} message
   */
  acknowledge(message) {
    let c = require("@drumee/ui-core/letc/preset/ack")(this, message, null, {
      presetClass: "link",
    });
    c.className = `${c.className} ${this.fig.group}-topbar__acknowledge-content`;
    this.__acknowledge.feed(c);
    c = this.__acknowledge.children.last();
    c.selfDestroy();
  }

  /**
   *
   */
  _openTab(name, opt) {
    switch (name) {
      case "chat":
        var f = () => {
          this._loadModule(name, opt[2]);
        };
        return setTimeout(f, 200);

      case "bigchat":
        return this.togglePanel("chat_p2p", "chat-panel");

      case "account":
      case "addressbook":
      case "transferbox":
      case "helpdesk":
      case "supportticket":
        return Wm.launch(
          { kind: `window_${name}` },
          { explicit: 1, singleton: 1 },
        );

      case "adminpanel":
        if (Visitor.domainCan(_K.permission.admin_view)) {
          return Wm.launch(
            { kind: `window_${name}` },
            { explicit: 1, singleton: 1 },
          );
        }
        break;
    }
  }

  /**
   * @param {*} data
   */
  dmzDetailResponse(data) {
    const copyMedia = (_flag) => {
      return this.postService({
        service: SERVICE.media.dmz_copy,
        flag: _flag,
        hub_id: Visitor.id,
      }).then(() => {
        return Wm.closeAlert();
      });
    };

    return Wm.confirm({
      title: LOCALE.CONGRATULATIONS,
      message: require("./skeleton/common/dmz-copy-media").default(this, data),
      confirm: LOCALE.YES,
      confirm_type: "primary",
      cancel: LOCALE.NO,
      cancel_type: "secondary",
      buttonClass: "dmz-copy-media",
      mode: "hbf",
    })
      .then(copyMedia(_a.yes))
      .catch(copyMedia(_a.no));
  }

  /**
   *
   * @param {*} cmd
   */
  disconnectShared(cmd) {
    const data = {
      orgid: Visitor.get("org_id"),
      mimic_id: Visitor.get("mimic_id"),
      hub_id: Visitor.id,
    };
    if (Visitor.get("mimic_type") === _a.mimic) {
      data.service = SERVICE.adminpanel.mimic_end_bymimic;
    }
    if (Visitor.get("mimic_type") === _a.victim) {
      data.service = SERVICE.adminpanel.mimic_end_byuser;
    }
    this.postService(data);
  }

  /**
   *
   * @param {*} s
   */
  setModuleState(s) {
    this.moduleWrapper.el.dataset.state = s;
  }

  /**
   *
   */
  lazyClasses() {
    for (var k of [
      "window_confirm",
      "media_uploader",
      "panel_trash",
      "panel_activity",
      "chat_p2p",
      "address_book",
      "apps_main",
      "settings_main",
    ]) {
      Kind.waitFor(k);
    }
  }
}

desk_module.initClass();

module.exports = desk_module;
