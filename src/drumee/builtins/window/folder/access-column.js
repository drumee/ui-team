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

const ACCESS_TAB = "access";
const ACCESS_PANEL_PN = "folder-access-panel";

/** The members panel, in column mode, for this window's workspace. */
function accessPanelSpec(win) {
  return {
    kind: "permission_restricted",
    mode: "column",
    className: "",
    media: win.mget(_a.media) || win.media,
    hub_id: win.mget(_a.hub_id),
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

/** Views that keep the file grid on screen — and so its toolbar. */
function showsFileGrid(tab) {
  return !tab || tab === "files" || tab === ACCESS_TAB;
}

module.exports = {
  ACCESS_TAB,
  ACCESS_PANEL_PN,
  accessPanelSpec,
  showAccessColumn,
  showsFileGrid,
};
