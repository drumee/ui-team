/**
 * Keep the address bar on where the visitor actually is (Lexis, 2026-10-22).
 *
 * Inside a folder or a file of a workspace — Internal or External alike — the
 * URL is that node's Internal Link hash, "#/desk/wm/o/<nid>/<hub_id>/<filetype>"
 * (libs/compact-deep-link), so it can be copied and sent exactly like the
 * Internal Link row. Anywhere else on the desk (home, the organisation screen,
 * a full-canvas screen such as Inbox, Calendar or Settings) it rests on
 * "#/desk/wm/home", the value wm.route() has always tidied it back to.
 *
 * ── Written with replaceState, never location.hash ─────────────────────────
 *
 * The router runs on `window.onhashchange`. Assigning location.hash would
 * re-route the desk on every click; replaceState changes the URL and fires
 * nothing. It also adds no history entry, so Back keeps meaning what it meant.
 *
 * ── Our own entries are marked, so a reload is still a reload ──────────────
 *
 * Every entry written here carries `history.state[MARK]` plus the hash it was
 * written with. The state survives a reload of the same tab and is absent from
 * anything pasted, bookmarked or opened in a new tab. Desk `_hasDeepLink`,
 * `file-deep-link.captureFromUrl` and `wm.route` ask isMirrorEntry() so that a
 * reload keeps going through the remembered-screen restore, exactly as when
 * the hash rested on home. Only when there is no remembered screen to restore
 * (restsOnReload() false) is the URL opened as the link it is.
 *
 * ── Never fights a navigation in flight ────────────────────────────────────
 *
 * Nothing is written while a hash navigation is being routed (hold() → the
 * same 5 s wm.route() always waited before tidying the URL, settle()), while
 * the desk restores its remembered screen, or while a sign-in relay (file or
 * workspace link) is still to be opened. A hash that carries arguments outside
 * `wm` (billing, tutorial, activate…) is left alone: other code reads them.
 */

const MARK = "drumeeLoc";

/** Desk's remembered-screen snapshot (desk _persistDeskState). */
const DESK_STATE_KEY = "drumee.desk.lastScreen";

const HOME_HASH = "#/desk/wm/home";

/** Coalesces the burst of breadcrumb events one click produces. */
const DEBOUNCE_MS = 250;

/** wm.route()'s own wait before the URL is tidied (Visitor.timeout(5000)). */
const HOLD_MS = 6000;

/** Retry spacing / budget while a transient blocker (restore, relay) is up. */
const RETRY_MS = 1000;
const MAX_RETRIES = 30;

let _timer = null;
let _holdUntil = 0;
let _retries = 0;
let _started = false;

/**
 * Is the current history entry one this module wrote, still showing the hash
 * it was written with?
 * @returns {Boolean}
 */
function isMirrorEntry() {
  try {
    const s = window.history && window.history.state;
    return !!(s && s[MARK] && s.hash === String(window.location.hash || ""));
  } catch (e) {
    return false;
  }
}

/**
 * Will this boot restore a remembered desk screen? (desk _restoreDeskState
 * reads the same key.) A mirrored URL is only opened as a link when not.
 * @returns {Boolean}
 */
function restsOnReload() {
  try {
    return !!sessionStorage.getItem(DESK_STATE_KEY);
  } catch (e) {
    return false;
  }
}

/** A live, not-destroyed view. */
function alive(view) {
  return !!(view && view.el && !(view.isDestroyed && view.isDestroyed()));
}

/**
 * The folder a workspace / folder window is standing in. A workspace root
 * carries its own filetype (hub, private, share…) with the root folder in
 * actual_home_id — the same normalisation window/folder refreshBreadcrumbsUI
 * makes for the desk breadcrumb.
 */
function folderHash(view) {
  const { compactHash } = require("libs/compact-deep-link");
  const filetype = view.mget(_a.filetype);
  const nid = filetype === _a.folder
    ? view.mget(_a.nid)
    : view.mget(_a.actual_home_id) || view.mget(_a.home_id) || view.mget(_a.nid);
  if (!nid || `${nid}` === "0") return null;
  return compactHash({ nid, hub_id: view.mget(_a.hub_id), filetype: _a.folder });
}

/**
 * The file a floating player / editor shows, or null for any other window.
 * The media's actualNode() wins over the window's own attributes, so a
 * shortcut names its target — as the Internal Link row does.
 */
function fileHash(view) {
  const { compactHash } = require("libs/compact-deep-link");
  const { CONTAINER_FILETYPES } = require("libs/open-media");
  const media = view.media;
  let node = {};
  try {
    if (media && _.isFunction(media.actualNode)) node = media.actualNode() || {};
  } catch (e) {
    node = {};
  }
  const filetype =
    view.mget(_a.filetype) || (media && media.mget && media.mget(_a.filetype));
  if (!filetype || CONTAINER_FILETYPES.includes(filetype)) return null;
  const nid = node.nid || view.mget(_a.nid);
  const hub_id = node.hub_id || view.mget(_a.hub_id);
  if (!nid || `${nid}` === "0") return null;
  return compactHash({ nid, hub_id, filetype });
}

/**
 * Where the visitor is, as a hash. HOME_HASH when nowhere in particular;
 * null when the URL must not be touched at all (a secure-share link pane
 * keeps its own address).
 * @returns {String|null}
 */
function currentHash() {
  const desk = window.Desk;
  const wm = window.Wm;
  if (desk && _.isFunction(desk._mainScreenOnTop) && desk._mainScreenOnTop()) {
    return HOME_HASH;
  }
  if (!wm) return HOME_HASH;

  // The active window first — a player / editor, or a folder window. Floating
  // ones paint over the docked layer; players are usually DOCKED (headless)
  // next to the workspace pane, so both layers are asked.
  const views = (l) => (l && l.children ? l.children.toArray().filter(alive) : []);
  const floating = views(wm.windowsLayer);
  const docked = views(wm.headlessLayer);
  const isActive = (v) =>
    v.el.dataset && v.el.dataset.state === "1" && !~~v.mget(_a.minimize);
  const active = floating.find(isActive) || docked.find(isActive);
  if (active) {
    if (active.mget("link_scope")) return null;
    const hash = active.mget(_a.kind) === "window_folder"
      ? folderHash(active)
      : fileHash(active);
    if (hash) return hash;
  }

  // Else the docked workspace pane — the focused one, or the last mounted.
  const panes = docked.filter(
    (v) => v.mget(_a.kind) === "window_folder" && !!v.mget(_a.headless),
  );
  const pane = panes.find((v) => ~~v.mget(_a.state) === 1) || panes[panes.length - 1];
  if (!pane) return HOME_HASH;
  if (pane.mget("link_scope")) return null;
  return folderHash(pane) || HOME_HASH;
}

/**
 * Should the URL be left alone for good on this page (as opposed to "not
 * yet")? Outside the signed-in desk, in the DMZ, during a tour asked for by
 * URL, or on a desk hash whose arguments someone else reads.
 */
function blockedForGood() {
  if (typeof Visitor === "undefined" || !Visitor.isOnline()) return true;
  try {
    if (/^(dmz|share)$/.test(bootstrap().area)) return true;
  } catch (e) { /* no bootstrap — not the desk */ }
  try {
    if (require("libs/window-tutorial-intent").armed()) return true;
  } catch (e) { /* never let a URL tidy-up break the desk */ }
  const path = Visitor.parseModule() || [];
  if (path.length && path[0] !== "desk") return true;
  const hash = String(window.location.hash || "");
  if (hash.indexOf("?") >= 0 && path[1] !== "wm") return true;
  if (path.length > 1 && path[1] !== "wm" && path[1] !== "home") return true;
  return false;
}

/** Something about to land the visitor elsewhere — wait for it. */
function blockedForNow() {
  if (Date.now() < _holdUntil) return true;
  const desk = window.Desk;
  if (!desk || (desk.isDestroyed && desk.isDestroyed())) return true;
  if (desk._restoreInFlight) return true;
  try {
    if (require("libs/file-deep-link").peek()) return true;
    if (require("libs/hub-deep-link").has()) return true;
  } catch (e) {
    return true;
  }
  return false;
}

/**
 * Write the visitor's location into the address bar now, if allowed.
 * @returns {Boolean} true when the URL now shows the location
 */
function sync() {
  try {
    if (blockedForGood()) return false;
    if (blockedForNow()) {
      if (_retries++ < MAX_RETRIES) schedule(Math.max(RETRY_MS, _holdUntil - Date.now()));
      return false;
    }
    _retries = 0;
    const hash = currentHash();
    if (!hash) return false;
    if (hash === window.location.hash && isMirrorEntry()) return true;
    // Merge, never replace: the exit guards keep their own marker in
    // history.state (widget/*/exit-guard) and must find it again on popstate.
    const state = Object.assign({}, window.history.state, { [MARK]: 1, hash });
    window.history.replaceState(
      state,
      "",
      `${window.location.pathname}${window.location.search}${hash}`,
    );
    return true;
  } catch (e) {
    console.warn("[location-url] could not update the address bar", e);
    return false;
  }
}

/** Debounced sync — every navigation signal lands here. */
function schedule(delay = DEBOUNCE_MS) {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    sync();
  }, delay);
}

/** A hash navigation is being routed: write nothing until settle(). */
function hold() {
  _holdUntil = Date.now() + HOLD_MS;
}

/** The routed navigation has had its time (wm.route's 5 s tidy-up). */
function settle() {
  _holdUntil = 0;
  _retries = 0;
  schedule(0);
}

/**
 * Listen for navigation, once. Every window raise / close and every move of
 * the docked pane (window/folder refreshBreadcrumbsUI) is announced on
 * "breadcrumb:content" (window/utils updateBreadcrumb).
 */
function start() {
  if (_started || typeof RADIO_BROADCAST === "undefined") return;
  _started = true;
  RADIO_BROADCAST.on("breadcrumb:content", () => schedule());
}

module.exports = {
  MARK, DESK_STATE_KEY, HOME_HASH,
  isMirrorEntry, restsOnReload, currentHash, sync, schedule, hold, settle, start,
};
