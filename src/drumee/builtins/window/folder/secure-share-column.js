/**
 * A share-area workspace's secure-share panel, as a view of the folder window's
 * split body.
 *
 * "Manage access" on an EXTERNAL workspace used to feed window_secure_share
 * into the window's dialog wrapper as a 450px drawer over the split body. It is
 * a view now, the same way the rail's Access is (./access-column): the file
 * grid and its drag gutter stay, and the panel takes the chat panel's column.
 * The skin does the layout off `data-view="secure-share"`.
 *
 * It toggles, where Access does not: there is no rail item for it and no ✕ in
 * column mode, so the icon that opened it is the way back.
 *
 * Its own module so it can be required under plain node: `_a` is read inside
 * the functions, never at load.
 */
const SECURE_SHARE_TAB = "secure-share";
const SECURE_SHARE_PANEL_PN = "folder-secure-share-panel";

/** The node the workspace link is minted for. For a hub/workspace-root window
 *  the real node is actual_home_id (nid is the hub, or 0); a subfolder shares
 *  itself. */
function secureShareNid(win) {
  if (win.mget(_a.filetype) === _a.hub && win.mget(_a.actual_home_id)) {
    return win.mget(_a.actual_home_id);
  }
  return win.mget(_a.nid);
}

/**
 * The panel, in column mode, for this window's share target.
 *
 * `embedded: 1` and NO `dataset: { embedded: "yes" }`: the flag is what makes
 * the widget skip its floating-window dock, raise and drag setup, while the
 * attribute is what makes its skin pin the absolute 450px drawer — which the
 * column must not be.
 */
function secureSharePanelSpec(win) {
  return {
    kind: "window_secure_share",
    mode: "column",
    embedded: 1,
    nid: secureShareNid(win),
    hub_id: win.mget(_a.hub_id),
    filetype: _a.folder,
    // Titles the panel "Manage access", as the drawer did.
    manage_access: 1,
    sys_pn: SECURE_SHARE_PANEL_PN,
    partHandler: win,
    uiHandler: [win],
  };
}

/**
 * Enter the view: mount on first entry, refresh after, remount on a new node.
 *
 * An open Settings or members drawer is cleared first — they share the
 * window's dialog wrapper and `isShowSettings`, and would sit over this.
 *
 * `_secureShareMountedNid` is what stops a second press, made while the
 * panel's chunk is still downloading, from appending a second panel: until the
 * part registers, getPart has nothing to find.
 *
 * @param {Object} win   the folder window
 * @param {Object} view  the split body (part "folder-view")
 * @returns {Object|null} the mounted panel on re-entry, null when (re)mounting
 */
function showSecureShareColumn(win, view) {
  if (win.isShowSettings && win.dialogWrapper) {
    win.isShowSettings = false;
    win.dialogWrapper.clear();
  }
  const spec = secureSharePanelSpec(win);
  const nid = `${spec.nid}`;
  let panel = typeof win.getPart === "function" ? win.getPart(SECURE_SHARE_PANEL_PN) : null;
  if (panel && typeof panel.isDestroyed === "function" && panel.isDestroyed()) {
    panel = null;
    win._secureShareMountedNid = null;
  }
  // Every request the panel makes reads `nid` off its own model, so a panel
  // mounted for another node would mint and list links for THAT node.
  if (panel && `${panel.mget(_a.nid)}` !== nid) {
    if (typeof panel.suppress === "function") panel.suppress();
    panel = null;
    win._secureShareMountedNid = null;
  }
  if (!panel) {
    if (win._secureShareMountedNid === nid) return null;
    win._secureShareMountedNid = nid;
    view.append(spec);
    return null;
  }
  // Hidden since the last visit; share.track_event pushes keep it fresh while
  // online, but one can be missed while offline, and these are cheap reads.
  if (panel._accessEvents && typeof panel._loadAccessEvents === "function") {
    panel._loadAccessEvents();
  }
  if (panel._shareList && typeof panel._loadShares === "function") {
    panel._loadShares();
  }
  return panel;
}

/** Show the view, or — pressed while it is up — go back where it came from. */
function toggleSecureShareView(win) {
  if (win.activeTab === SECURE_SHARE_TAB) {
    const back = win._tabBeforeSecureShare || "files";
    win._tabBeforeSecureShare = null;
    return win.showFolderTab(back);
  }
  win._tabBeforeSecureShare = win.activeTab || "files";
  return win.showFolderTab(SECURE_SHARE_TAB);
}

module.exports = {
  SECURE_SHARE_TAB,
  SECURE_SHARE_PANEL_PN,
  secureShareNid,
  secureSharePanelSpec,
  showSecureShareColumn,
  toggleSecureShareView,
};
