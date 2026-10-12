/**
 * The desk rail's Access, as an OVERLAY on the folder window's split body.
 *
 * Access used to open the members panel (permission_restricted) as a drawer in
 * the window's dialog wrapper, then became a view of its own (`data-view` =
 * "access"), which always put the file grid under it. Lexis, 2026-10-12: from
 * Task, Meet or Chat it must open OVER THAT TAB, not jump to Files. So it is
 * no longer a tab: `win.activeTab` keeps the tab the user is on, and the panel
 * is stacked over it while the split body carries `data-access="1"`
 * (skin/index.scss &__split-body[data-access="1"]). Over Files it keeps the
 * look it had as a view — the chat column steps aside for it.
 *
 * Mounted once and never re-fed, like the task board: showFolderTab's
 * switchView appends it on first entry and only reveals it after that.
 *
 * Its own module so it can be required under plain node: `_a` is read inside
 * the functions, never at load — and the one import below is by relative path
 * for the same reason, since the `libs/` alias is webpack's alone.
 */
const { prefetchMembers } = require("../../../libs/members-prefetch");
const { SECURE_SHARE_TAB } = require("./secure-share-column");

const ACCESS_TAB = "access";
const ACCESS_PANEL_PN = "folder-access-panel";
// The service the members panel's ✕ sends its uiHandler (the folder window) in
// column mode — see permission/restricted/index.js `_e.close`. The rail's
// Access sends it too when the overlay is already up (a toggle).
const ACCESS_CLOSE = "close-access-view";

/** The members panel, in column mode, for this window's workspace. */
function accessPanelSpec(win) {
  return {
    kind: "permission_restricted",
    mode: "column",
    className: "",
    media: win.mget(_a.media) || win.media,
    hub_id: win.mget(_a.hub_id),
    // NAME THE WORKSPACE, OFF THE WINDOW'S OWN MODEL.
    //
    // `media` above is undefined for a WORKSPACE window and always was.
    // __window_mfs.initialize only assigns `this.media` when it is fed one
    // (`let m = opt.media; if (!m) return;` — window/utils.js), and
    // Wm.loadWorkspace feeds headlessLayer a descriptor with no `media` key at
    // all: `{kind:"window_folder", hub_id, ...data, headless:1, filename,
    // hub_name, ...}`, built straight from the media.attributes response. So
    // both halves of the `||` are undefined here, and the panel's header — which
    // reads the media first and its own model second — had nothing to read from
    // either. That is why Access showed the generic "Who has access" heading
    // instead of the workspace.
    //
    // The name was never missing, only unasked for: loadWorkspace puts
    // `filename` and `hub_name` on the window itself. Same order the header
    // tries them in, so the two cannot disagree about which one wins.
    [_a.filename]:
      win.mget(_a.filename) || win.mget("hub_name") || win.mget(_a.name),
    [_a.area]: win.mget(_a.area),
    sys_pn: ACCESS_PANEL_PN,
    partHandler: win,
    uiHandler: [win],
  };
}

/**
 * Enter the Access view: mount the panel on first entry, refresh it after.
 *
 * An open Settings, secure-share or members drawer is cleared first. All
 * three share the window's dialog wrapper and its `isShowSettings` flag —
 * broader than `_folderSettingsPanelIsOpen`, which tests only for the Folder
 * Settings panel specifically — and any of them would put a second copy of
 * the matrix over the file grid beside this one.
 *
 * FIRST ENTRY ASKS FOR THE MEMBERS HERE, before mounting anything. The mount
 * is a dynamic import() of the panel's chunk — a full round trip during which
 * the column has nothing to show and nothing has been asked of the server.
 * Starting the read now overlaps the two, and the panel takes this answer
 * rather than starting its own (libs/members-prefetch, _loadMembers).
 *
 * @param {Object} win   the folder window
 * @param {Object} view  the split body (part "folder-view")
 * @returns {Object|null} the mounted panel on re-entry, null on first mount
 */
function showAccessColumn(win, view) {
  if (win.isShowSettings && win.dialogWrapper) {
    win.isShowSettings = false;
    win.dialogWrapper.clear();
  }
  if (!win._accessPanelMounted) {
    win._accessPanelMounted = 1;
    prefetchMembers(win, win.mget(_a.hub_id));
    view.append(accessPanelSpec(win));
    return null;
  }
  const panel = typeof win.getPart === "function" ? win.getPart(ACCESS_PANEL_PN) : null;
  if (!panel || (typeof panel.isDestroyed === "function" && panel.isDestroyed())) return null;
  // Hidden since the last visit, and a role change or removal pushed while it
  // was hidden has already refetched — but a push can be missed while offline,
  // and this is a cheap read.
  if (typeof panel._loadMembers === "function") panel._loadMembers();
  return panel;
}

/**
 * Is the Access overlay up on this window?
 *
 * @param {Object} win  the folder window
 * @returns {Boolean}
 */
function accessOpen(win) {
  return !!(win && win._accessOpen);
}

/**
 * Put the overlay up over whatever tab the window is on. The stamp goes on at
 * once — it is what the skin and accessOpen() read — and the panel itself is
 * mounted (or refreshed) by showAccessColumn.
 *
 * Display:none drops a scroller's position, and over Files (and on a compact
 * window, over every tab) the panels underneath are hidden, so their scroll is
 * noted first and put back by hideAccessOverlay — the same pair a tab switch
 * uses.
 *
 * `opt.stash: false` when the caller has just switched tab in the same
 * handler (secure-share -> Files): the panels it revealed have not been laid
 * out at their saved offsets yet, and a stash now would overwrite those with 0.
 *
 * @param {Object} win   the folder window
 * @param {Object} view  the split body (part "folder-view")
 * @param {Object} [opt]
 * @param {Boolean} [opt.stash=true]
 * @returns {Object|null} see showAccessColumn
 */
function showAccessOverlay(win, view, opt) {
  if (!view || !view.el) return null;
  if (!win._accessOpen) {
    if (!(opt && opt.stash === false) && typeof win._stashPanelScroll === "function") {
      win._stashPanelScroll();
    }
    // Chat details stands in for the Files-view chat column, which steps
    // aside for the panel — the same close a tab switch makes.
    if (showsFileGrid(win.activeTab) && typeof win._closeChatDetails === "function") {
      win._closeChatDetails();
    }
    win._accessOpen = 1;
    view.el.dataset.access = "1";
  }
  return showAccessColumn(win, view);
}

/**
 * Take the overlay down, leaving the tab underneath exactly as it was. A no-op
 * when it is not up.
 *
 * `opt.restore: false` is for showFolderTab switching to ANOTHER tab: it has
 * already noted the scroll offsets (with the overlay still up, so the panels
 * hidden under it kept their saved values) and puts them back itself after
 * the switch. Restoring here as well would run a frame later, on the panels
 * of the tab that has just been left.
 *
 * @param {Object} win  the folder window
 * @param {Object} [opt]
 * @param {Boolean} [opt.restore=true]
 * @returns {Boolean} whether it was up
 */
function hideAccessOverlay(win, opt) {
  if (!win || !win._accessOpen) return false;
  const restore = !(opt && opt.restore === false);
  // Note the panels still on screen BEFORE the hidden ones come back: on a
  // desktop window the tab beside the card stays usable while it is up, and
  // restoring the offsets taken at open would jump whatever was scrolled
  // since. The stash skips hidden panels, so those keep their saved values.
  if (restore && typeof win._stashPanelScroll === "function") win._stashPanelScroll();
  win._accessOpen = 0;
  const view = win.__folderView;
  const el = view && !(typeof view.isDestroyed === "function" && view.isDestroyed())
    ? view.el
    : null;
  if (el && el.dataset) {
    delete el.dataset.access;
    // Over Files the chat column comes back from the left, as it did when
    // Access was a view (skin: [data-view="files"][data-from-view="access"]).
    if (showsFileGrid(win.activeTab)) el.dataset.fromView = ACCESS_TAB;
  }
  if (restore && typeof win._restorePanelScroll === "function") {
    win._restorePanelScroll();
  }
  // The card covered the team chat (Chat tab), so a message that came in
  // under it was not read; with the chat back in view it is — the same check
  // showFolderTab makes on entering Chat, a frame later once laid out.
  if (win.activeTab === "chat" && typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      if (typeof win.isDestroyed === "function" && win.isDestroyed()) return;
      const chat = typeof win.getPart === "function" ? win.getPart("folder-chat") : null;
      if (chat && typeof chat.readIfInView === "function") chat.readIfInView();
    });
  }
  return true;
}

/**
 * The members panel's ✕ (and a second press of the rail's Access): take the
 * overlay down and light the rail on the tab that is under it — Files, Chat,
 * Task or Meet, whichever the user was on.
 *
 * The rail has to be told. Its highlight moves on a rail CLICK (the radio
 * behaviour on the item pressed), and the ✕ is not one, so Access would stay
 * lit over the tab. Desk._railHighlight is the hook the window manager
 * already uses for the same job (wm/index.js, after a workspace loads).
 *
 * @param {Object} win  the folder window
 */
function closeAccessColumn(win) {
  if (!hideAccessOverlay(win)) return undefined;
  const desk = typeof window !== "undefined" ? window.Desk : null;
  if (desk && typeof desk._railHighlight === "function") {
    desk._railHighlight(win.activeTab || "files");
  }
  return undefined;
}

/** Views that keep the file grid on screen — and so its toolbar. The
 *  secure-share view (./secure-share-column) takes the chat column, beside
 *  the same grid. Access is no tab any more (it overlays the one that is up),
 *  but a carried "access" still lands on Files, so it keeps its answer. */
function showsFileGrid(tab) {
  return !tab || tab === "files" || tab === ACCESS_TAB || tab === SECURE_SHARE_TAB;
}

module.exports = {
  ACCESS_TAB,
  ACCESS_PANEL_PN,
  ACCESS_CLOSE,
  accessOpen,
  closeAccessColumn,
  accessPanelSpec,
  hideAccessOverlay,
  showAccessColumn,
  showAccessOverlay,
  showsFileGrid,
};
