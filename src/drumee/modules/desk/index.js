require("welcome/skin");
require("builtins/window/confirm/skin");
const { canUpgradePlan, billingAvailable, needsAdminConsoleUpgrade } = require("libs/billing");
const billingDeepLink = require("libs/billing-deep-link");
const { captureUtm, campaignArrival } = require("libs/campaign");
const hubDeepLink = require("libs/hub-deep-link");

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
      run: () => this._dismissTransientUi(),
    });
    // Cross-plugin / cross-module billing entry (admin-console upsell, Wm) →
    // open the full-page billing screen without a direct module reference.
    this._openBillingPage = () => this.openBillingPage();
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

    // [Reload] Persist desk UI (sidebar screen + workspace + floating
    // folder windows) so a browser reload lands back where the user was.
    // Written on pagehide — the one hook that reliably fires right before
    // a reload. See _restoreDeskState, called from loadDefault.
    this._persistDeskState = this._persistDeskState.bind(this);
    window.addEventListener("pagehide", this._persistDeskState);
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
    if (this._openWorkspaces.size || this._hasZoomedFolder()) {
      part.el.dataset.headless = "1";
      if (this._openFolders.size > 1) {
        part.el.dataset.tabstrip = "1";
      } else {
        delete part.el.dataset.tabstrip;
      }
    } else {
      delete part.el.dataset.headless;
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
    RADIO_BROADCAST.off("desk:open-admin-console", this._openAdminConsole);
    RADIO_BROADCAST.off("desk:open-trash", this._openTrashPanel);
    RADIO_BROADCAST.off("desk:open-home", this._openHomeFromPopup);
    RADIO_BROADCAST.off("desk:open-over-limit-popup", this._openOverLimitPopupBound);
    RADIO_BROADCAST.off(require("libs/over-limit").CHANGED, this._onOverLimitChanged);
    RADIO_BROADCAST.off("avatar-changed", this._updateAvatar);
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
    this._restoreInFlight = !!(
      this._bootDeepLink || this._savedStateIsRestorable(this._bootSavedState)
    );
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
    const preselect = billingDeepLink.consume();
    if (!preselect) return false;
    if (!canUpgradePlan()) return false;
    // Don't let desk-state restore pull the screen back to the remembered one.
    this._restoreInFlight = false;
    this.openBillingPage(preselect);
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
   * After promo-launch30 explore → location.reload(), open Admin Console.
   * Invite panel is opened by apps-main from drumee_promo_open_invite.
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
      const kind = childKind(chatChild, "chat-panel");
      if (kind === "address_book") return "toggle-contacts";
      if (kind === "chat_p2p") return "toggle-inbox";
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
      return;
    }
    await Kind.waitFor("window_folder");
    if (this.isDestroyed && this.isDestroyed()) return;
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
      if (this.isDestroyed && this.isDestroyed()) return;
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
      if (ready) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  async _restoreSidebarService(service) {
    if (!service || !desk_module._RESTORABLE_SCREENS[service]) return;
    const sidebarPn = desk_module._RESTORABLE_SCREENS[service];

    if (service === "toggle-activity") {
      // Open-only: the live toggle would close the panel if state is already 1.
      this._dismissWmModal();
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
      this._clearRestoreInFlight(0);
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
        await this._restoreWorkspace(saved.workspace);
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
    let p = await this.ensurePart("chat-panel");
    let widget = p.children.last();
    if (!widget || widget.isDestroyed()) {
      this.togglePanel("chat_p2p", "chat-panel");
    } else if (widget.mget(_a.kind) === "chat_p2p") {
      if (widget.el.dataset.anim === "in") {
        return;
      } else {
        this.togglePanel("chat_p2p", "chat-panel");
      }
    } else {
      this.togglePanel("chat_p2p", "chat-panel");
    }
    if (!drumate_id) return;
    p = await this.ensurePart("chat-panel");
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

  _updateActivityBadge(args = {}) {
    if (args.unread_count == null) return;
    this.ensurePart("activity-count").then((p) => {
      let content = args.unread_count || 0;
      if (parseInt(content) > 99) content = "99+";
      p.el.innerText = content;
      p.el.dataset.count = content;
    });
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

      case "overlay":
        if (
          Visitor.parseModuleArgs().tutorial ||
          this._postOnboardingTutorial
        ) {
          this._postOnboardingTutorial = false;
          setTimeout(() => {
            this._showTutorial();
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

      case "desk-tutorial":
        // The tutorial exists and owns the hand-off from here.
        clearTimeout(this._homeSettledFallback);
        this._homeSettledFallback = null;
        this._chainRewardFlowAfterTutorial(child);
        // Only fires for a tour launched from Get help; the automatic
        // post-signup run leaves the user on the desk as before.
        this._chainHelpReturnAfterTutorial(child);
        return;
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
  _showTutorial() {
    this.ensurePart("overlay").then((p) => {
      p.feed({ kind: "desk_tutorial", sys_pn: "desk-tutorial", partHandler: this });
    });
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
    const forced = !!Visitor.parseModuleArgs().reward;
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
        if (campaignArrival()) {
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
   * @param {string} surface  'home' | 'billing'
   * @returns {Promise<object|undefined>} the fetched promo state, or
   *   undefined if a concurrent call was already in flight or the fetch
   *   failed.
   */
  async _maybeShowPromoLaunch30(surface, opt = {}) {
    const defer = !!opt.defer;
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
      if (state.state === "eligible_unseen") {
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
        if (defer) {
          this._schedulePromoOffer(surface, state);
          return state;
        }
        try {
          await Kind.waitFor("promo_launch30");
        } catch (e) {
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
   * Order matters and is the existing one: reward flow, then LAUNCH30, then the
   * invited-workspace prompt. Both of the first two are full-screen and
   * self-gating; the prompt is a small dialog and goes last so it never stacks
   * on top of them.
   *
   * @returns {Promise}
   */
  _afterHomeSettled() {
    // Once per session. There are now four ways in — no-tutorial, after the
    // tutorial, the tutorial-never-mounted fallback, and a re-fed module — and
    // running the chain twice would ask the reward flow to mount twice and
    // could show the invite dialog again.
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
    // Over-limit outranks the promo/reward flows: a locked workspace needs
    // its popup first, and a locked org is not eligible for either promo.
    return this._maybeShowOverLimit()
      .then(() => this._maybeStartRewardFlow())
      .then(() => this._maybeShowPromoLaunch30("home", { defer: true }))
      .then(() => this._waitForHomePopups())
      .then((clear) =>
        clear
          ? this._maybeOfferInvitedWorkspace()
          // Popups never cleared inside the limit, so there will be no prompt to
          // hand the loader over to.
          : this._hideInvitedWorkspaceLoader(),
      )
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
   * Is a full-screen home flow (reward, LAUNCH30) on screen right now?
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
    if (this._rewardFlow && !(this._rewardFlow.isDestroyed && this._rewardFlow.isDestroyed())) {
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

  _chainRewardFlowAfterTutorial(tutorial) {
    if (tutorial && _.isFunction(tutorial.once)) {
      tutorial.once(_e.destroy, () => {
        this._afterHomeSettled();
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
  openMobileDrawer(mode) {
    return this.ensurePart("sidebar-main").then((p) => {
      if (!p || !p.el) return;
      const el = p.el;
      el.dataset.mode = mode;
      el.dataset.state = "open";
      this._setMobileBackdrop(true);
      this._setMobileTopbarActive(mode);
    });
  }

  /**
   * Mirror the drawer state on the two mobile-topbar buttons so the
   * currently-displayed mode shows as active. Pass null to clear both.
   */
  _setMobileTopbarActive(activeMode) {
    const map = {
      "mobile-add-btn": activeMode === "actions",
      "mobile-menu-btn": activeMode === "nav",
    };
    Object.entries(map).forEach(([pn, isActive]) => {
      this.ensurePart(pn).then((p) => {
        if (!p || !p.el) return;
        if (isActive) {
          p.el.dataset.state = "active";
        } else {
          delete p.el.dataset.state;
        }
      });
    });
  }

  /**
   * Show/hide the shared __overlay as a tap-to-close backdrop for the
   * mobile drawer. The click listener that actually closes the drawer
   * is bound once in _bindMobileBackdropListener at mount time.
   */
  _setMobileBackdrop(visible) {
    this.ensurePart("overlay").then((p) => {
      if (!p || !p.el) return;
      p.el.dataset.state = visible ? "open" : "closed";
    });
  }

  _closeMobileDrawer() {
    this.ensurePart("sidebar-main").then((p) => {
      if (!p || !p.el) return;
      p.el.dataset.state = "closed";
    });
    this._setMobileBackdrop(false);
    this._setMobileTopbarActive(null);
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
      this._closeMobileDrawer();
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

    // Disable actions when the admin console is active
    this.ensurePart("action-cluster").then((p) => {
      if (["apps_main", "settings_main"].includes(kind)) {
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
    // `preselect` (plan/cycle/tab) rides in from a #/desk/billing deep link; a
    // plain "Upgrade plan" trigger passes nothing, so the page opens on its
    // default tab exactly as before.
    const opt = Object.assign({ page: 1 }, preselect || {});
    return Kind.waitFor("settings_billing").then(() =>
      this.togglePanel("settings_billing", "settings-main-slot", true, opt)
    );
  }

  /**
   * "Unlock Admin Console" upsell when a personal-plan user (free / pro /
   * legacy advanced) clicks the sidebar Admin Console entry. Centered body
   * (icon / title / desc) + a single Upgrade CTA underneath — no "Later".
   *
   * The modal itself always shows: the plan simply doesn't include the console,
   * whatever the billing setup. Only the CTA is conditional — it is dropped
   * where the deployment doesn't sell plans (`billing_upgrade: 0` in
   * myDrumee.json, or no payment backend at all), because an Upgrade button
   * that cannot reach checkout is worse than no button.
   *
   * The close X is rendered here, in the card, rather than coming from the
   * shared confirm header: `mode: "b"` drops that header to keep the drumee
   * logo out of this design, and the header is where the X normally lives
   * (window/confirm/skeleton/header.js). Without it the only way out is the
   * Escape key — which touch devices don't have, so a phone user tapping Admin
   * Console would be trapped in the modal (backdrop clicks don't dismiss it).
   */
  _showAdminUnlockModal() {
    // See above: no checkout reachable → no CTA, but the card still explains why.
    const canBuy = billingAvailable();
    const body = (confirmUi) =>
      Skeletons.Box.Y({
        className: "desk-module__admin-unlock",
        // Do not use kidsOpt.active:0 — it would zero out the CTA click handler.
        kids: [
          Skeletons.Box.X({
            className: "desk-module__admin-unlock-close",
            signal: _e.cancel,
            uiHandler: [confirmUi],
            bubble: 0,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Image.Svg({
                ico: "cross",
                className: "desk-module__admin-unlock-close-ico",
              }),
            ],
          }),
          Skeletons.Image.Svg({
            ico: "cloud-pause",
            className: "desk-module__admin-unlock-icon",
            active: 0,
          }),
          Skeletons.Note({
            className: "desk-module__admin-unlock-title",
            content: LOCALE.UNLOCK_ADMIN_CONSOLE,
            active: 0,
          }),
          Skeletons.Note({
            className: "desk-module__admin-unlock-desc",
            content: LOCALE.UNLOCK_ADMIN_DESC,
            active: 0,
          }),
          canBuy
            ? Skeletons.Note({
                className: "desk-module__admin-unlock-cta",
                content: LOCALE.UPGRADE_PLAN_MENU || "Upgrade plan",
                signal: _e.confirm,
                uiHandler: [confirmUi],
              })
            : null,
        ],
      });
    return Wm.confirm({
      // Body only — no logo/drumee header (matches unlock card design).
      mode: "b",
      body,
    })
      .then(() => {
        if (!billingAvailable()) return this._restoreCurrentSidebarHighlight();
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

      case "mobile-show-add":
        return this.openMobileDrawer("actions");

      case "mobile-show-menu":
        return this.openMobileDrawer("nav");

      case "mobile-close-drawer":
        return this._closeMobileDrawer();

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
        return this.togglePanel("chat_p2p", "chat-panel");

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

      case "toggle-help":
        return this._openGetHelp();

      // "Product Tour" button on the Get help screen.
      case "start-product-tour":
        return this._startProductTour();

      case "toggle-apps": {
        // Personal plans (free / pro / legacy advanced — yp.plan entity_type=user)
        // cannot use Admin Console; short-circuit with the Unlock upsell instead
        // of loading the plugin. Org tiers (team, …) fall through. quota.organization
        // is NOT used: Pro also seeds organization:1. Modal always shows; its
        // Upgrade button is gated solely by billingAvailable() (billing_upgrade).
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

      case "new-workspace": {
        this.closeDeskNewMenu(cmd);
        // Create workspace is a write — block at the UI before media_form /
        // desk.create_hub ever runs (context menu, sidebar, topbar all land
        // here or on Wm's twin case).
        if (require("libs/over-limit").guardWrite("write")) return;
        return Wm.onUiEvent(cmd, { ...args, service: "new-workspace" });
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

      // Reward-flow Step 1 walkthrough: open/close the topbar Add-new dropdown
      // on its behalf (the desk owns the `addmenu` part). Used by the guide's
      // Back to step from the create-modal back to the dropdown, and from the
      // dropdown back to the Add-new button.
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

      case "reward-set-new-create-menu":
        return this.ensurePart("desk-new-create-group").then((p) => {
          if (p && p.el) {
            p.el.dataset.submenu = args.open ? _a.open : _a.closed;
          }
        });

      // Relayed to the reward flow: it opened this popup through the
      // "invite-member" service above, so the popup's uiHandler is the desk,
      // not the flow.
      case "invitation-sent":
        if (this._rewardFlow && !this._rewardFlow.isDestroyed()) {
          this._rewardFlow.onInvitationSent();
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
        return this.ensurePart("activity-count").then((p) => {
          let content = args.unread_count || 0;
          if (parseInt(content) > 99) content = "99+";
          p.el.innerText = content;
          p.el.dataset.count = content;
        });

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
        if (this._rewardFlow && !this._rewardFlow.isDestroyed()) {
          this._rewardFlow.onInvitePopupClosed();
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

  // Ctrl/Cmd+Shift+F. Context-sensitive: inside a chat window it opens that
  // chat's message search, anywhere else it focuses the topbar file search.
  // Returns false when there is nothing to focus, so the key keeps whatever it
  // does today rather than being swallowed (libs/hotkeys rule 3).
  _focusSearch(e) {
    const chat = this._bigchatFor(e && e.target);
    if (chat) return this._openChatSearch(chat);
    if (!this._searchBoxInner || !_.isFunction(this._searchBoxInner.focus)) {
      return false;
    }
    // focusin on the box already opens the suggestions list (see onPartReady).
    this._searchBoxInner.focus();
    return true;
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
