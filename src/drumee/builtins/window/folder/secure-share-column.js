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
 * It toggles, where Access does not: there is no rail item for it, so the icon
 * that opened it is a way back. The panel's own ✕ is the other: it asks the
 * folder window for SECURE_SHARE_CLOSE, which puts the chat panel back.
 *
 * Its own module so it can be required under plain node: `_a` is read inside
 * the functions, never at load.
 */
const SECURE_SHARE_TAB = "secure-share";
const SECURE_SHARE_PANEL_PN = "folder-secure-share-panel";
// The service the panel's ✕ sends its uiHandler (the folder window) in column
// mode — see secure-share/index.js `_e.close`.
const SECURE_SHARE_CLOSE = "close-secure-share-view";
// Triggered on Wm.$el as (event, folderWindow, isUp) whenever the view is
// entered or left — however that happened: the opener, the ✕, a rail press.
// The desk's switcher header lights its link chip off it (a toggle for this
// view; desk/index.js _onSecureShareView).
const SECURE_SHARE_VIEW_EVENT = "folder:secure-share";

// The panel's leave animation (secure-share/skin `window-secure-share-column-out`,
// 0.2s). The view switch waits for its animationend; the fallback is for an
// animationend that never comes — a panel scrolled out of a hidden window, a
// throttled background tab — so the ✕ can never strand the panel on screen.
const LEAVE_ANIMATION = "window-secure-share-column-out";
const LEAVE_FALLBACK_MS = 320;

function prefersReducedMotion() {
  try {
    return (
      typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch (e) {
    return false;
  }
}

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
    // The header row (window/secure-share/skeleton/subject.js). A hub window is
    // the workspace itself; any other folder window shares that folder.
    subject: win.mget(_a.filetype) === _a.hub ? "workspace" : "folder",
    subject_data: {
      name: win.mget(_a.filename) || win.mget(_a.hub_name),
      filetype: win.mget(_a.filetype),
      area: win.mget(_a.area),
      ctime: win.mget(_a.ctime),
      mtime: win.mget(_a.mtime),
    },
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
  // Back before a leave finished (the rail, then the opener again): that leave
  // must neither switch the view away when it ends nor keep the panel faded.
  win._secureShareLeaveSeq = (win._secureShareLeaveSeq || 0) + 1;
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
  if (panel.el && panel.el.dataset) delete panel.el.dataset.leaving;
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

/** Is the panel mid-way through its leave animation? A second ✕ or opener
 *  press then must not touch the remembered tab or start another leave. */
function isLeaving(win) {
  const panel = typeof win.getPart === "function" ? win.getPart(SECURE_SHARE_PANEL_PN) : null;
  return !!(panel && panel.el && panel.el.dataset && panel.el.dataset.leaving === "1");
}

/**
 * Leave the view for `tab`, after the panel has animated out.
 *
 * display:none cannot be animated, so the switch is DEFERRED: the panel is
 * stamped `data-leaving="1"` (the skin runs the slide-out, `forwards`, so it
 * stays gone on its last frame), and showFolderTab runs on that animation's
 * end. Then the stamp comes off — after the switch, not before: the other order
 * paints one frame of the panel back at full opacity.
 *
 * Only for leaving by the panel's own controls (✕, the opener toggling it off).
 * A rail press switches at once, like every other view.
 *
 * @returns {Promise|any|undefined} the switch, deferred when animated
 */
function leaveSecureShareView(win, tab) {
  const panel = typeof win.getPart === "function" ? win.getPart(SECURE_SHARE_PANEL_PN) : null;
  const el = panel && !(typeof panel.isDestroyed === "function" && panel.isDestroyed())
    ? panel.el
    : null;
  if (!el || !el.dataset || typeof el.addEventListener !== "function" || prefersReducedMotion()) {
    return win.showFolderTab(tab);
  }
  if (el.dataset.leaving === "1") return undefined;
  el.dataset.leaving = "1";
  const seq = (win._secureShareLeaveSeq = (win._secureShareLeaveSeq || 0) + 1);
  return new Promise((resolve) => {
    let timer = null;
    const finish = () => {
      el.removeEventListener("animationend", onEnd);
      clearTimeout(timer);
      // Cancelled by a re-entry (showSecureShareColumn bumps the seq), or the
      // user already went elsewhere: nothing to switch.
      if (win._secureShareLeaveSeq !== seq || win.activeTab !== SECURE_SHARE_TAB) {
        return resolve(undefined);
      }
      const r = win.showFolderTab(tab);
      delete el.dataset.leaving;
      resolve(r);
    };
    // animationend bubbles: the slide runs on __main, a child of `el`. Other
    // animations inside the panel end too, and must not cut the slide short.
    const onEnd = (e) => {
      if (e && e.animationName === LEAVE_ANIMATION) finish();
    };
    el.addEventListener("animationend", onEnd);
    timer = setTimeout(finish, LEAVE_FALLBACK_MS);
  });
}

/** Show the view, or — pressed while it is up — go back where it came from. */
function toggleSecureShareView(win) {
  if (win.activeTab === SECURE_SHARE_TAB) {
    if (isLeaving(win)) return undefined;
    const back = win._tabBeforeSecureShare || "files";
    win._tabBeforeSecureShare = null;
    return leaveSecureShareView(win, back);
  }
  win._tabBeforeSecureShare = win.activeTab || "files";
  return win.showFolderTab(SECURE_SHARE_TAB);
}

/**
 * The panel's ✕: hide the view and show the chat panel in its column again.
 *
 * Only Files and Chat HAVE a chat panel, so the ✕ goes back to the tab it came
 * from when that is one of them, and to Files otherwise — coming from Task or
 * Meet, going "back" would close the panel onto a view with no chat at all.
 */
function closeSecureShareView(win) {
  if (win.activeTab !== SECURE_SHARE_TAB || isLeaving(win)) return undefined;
  const prev = win._tabBeforeSecureShare;
  win._tabBeforeSecureShare = null;
  return leaveSecureShareView(win, prev === _a.chat ? _a.chat : "files");
}

module.exports = {
  SECURE_SHARE_TAB,
  SECURE_SHARE_PANEL_PN,
  SECURE_SHARE_CLOSE,
  SECURE_SHARE_VIEW_EVENT,
  LEAVE_FALLBACK_MS,
  closeSecureShareView,
  secureShareNid,
  secureSharePanelSpec,
  showSecureShareColumn,
  toggleSecureShareView,
};
