/**
 * The desk rail's Access, as a view of the folder window's split body.
 *
 * Access used to open the members panel (permission_restricted) as a drawer in
 * the window's dialog wrapper, over the split body. It is a view now, like
 * Files / Chat / Task: the file grid and its drag gutter stay, and the members
 * panel takes the chat panel's column. The skin does the layout off
 * `data-view="access"` (skin/index.scss &__split-body[data-view="access"]).
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
// column mode — see permission/restricted/index.js `_e.close`.
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
 * The members panel's ✕: hide the panel and put the chat panel back in its
 * column — i.e. the Files view — and light the rail's Files item to match.
 *
 * The rail has to be told. Its highlight moves on a rail CLICK (the radio
 * behaviour on the item pressed), and the ✕ is not one, so Access would stay
 * lit over a Files screen. Desk._railHighlight is the hook the window manager
 * already uses for the same job (wm/index.js, after a workspace loads).
 *
 * @param {Object} win  the folder window
 */
function closeAccessColumn(win) {
  if (win.activeTab !== ACCESS_TAB) return undefined;
  const r = win.showFolderTab("files");
  const desk = typeof window !== "undefined" ? window.Desk : null;
  if (desk && typeof desk._railHighlight === "function") desk._railHighlight("files");
  return r;
}

/** Views that keep the file grid on screen — and so its toolbar. The
 *  secure-share view (./secure-share-column) takes the same column Access
 *  does, beside the same grid. */
function showsFileGrid(tab) {
  return !tab || tab === "files" || tab === ACCESS_TAB || tab === SECURE_SHARE_TAB;
}

module.exports = {
  ACCESS_TAB,
  ACCESS_PANEL_PN,
  ACCESS_CLOSE,
  closeAccessColumn,
  accessPanelSpec,
  showAccessColumn,
  showsFileGrid,
};
