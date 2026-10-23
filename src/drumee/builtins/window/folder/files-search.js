/**
 * Workspace search shown IN the Files list (window__icons-list in grid view,
 * window__content-row in row view) — Figma 43:23955's toolbar "Search…".
 *
 * While a query is active `win._wsQuery` holds it and the window's
 * getCurrentApi() answers {} (folder/index.js), so the List.Smart's own fetch —
 * and its scroll-paging — is a no-op and cannot pull the folder listing back
 * in. The window fetches `media.search_all` itself (scope=hub: this window's
 * hub only), fences the rows to this workspace, and pushes them through
 * list.handleResponse(): the same path a server page takes, so `skip`
 * filters, grid partitioning and EOD all behave as for a folder.
 *
 * `data-search` on the files panel ("pending" | "results" | "empty") lets the
 * skin hide the folder's own empty text and show "No results" instead.
 *
 * Plain functions of the window (`win`) — tests/folder-files-search.test.js;
 * window/folder/index.js delegates.
 */
const Loading = require("./icons-loading");

const MIN_QUERY = 2; // seo_search_unified drops shorter terms
const DEBOUNCE_MS = 250;
// media.search_all's own cap. One page, no paging: the list's api is {} while
// searching, so there is nothing to page with. Asking for the cap (not 20) also
// keeps the subtree fence below from emptying a personal workspace whose
// siblings took the first rows.
const FETCH_MAX = 100;

function alive(p) {
  return !!(p && p.el && !(p.isDestroyed && p.isDestroyed()));
}

function normalizeQuery(text) {
  return `${text || ""}`.trim().replace(/\s+/g, " ");
}

// media.file_path is a name path from the hub root; not every proc collapses
// repeated slashes.
function normalizePath(v) {
  return `${v || ""}`.replace(/\/+/g, "/").replace(/\/$/, "");
}

function hubIdOf(win) {
  return win.mget(_a.actual_hub_id) || win.mget(_a.hub_id);
}

// A collaborative workspace IS a hub, so the service already fences it. A
// PERSONAL workspace is a folder at the personal hub's root, which holds all
// of them, so hits are fenced to the workspace's own subtree. The scope is
// the WORKSPACE (bottom of the nav stack), not the folder on screen.
// "" = nothing to fence on → hub-wide, never wider.
function scopeOf(win) {
  const root = (win._navStack && win._navStack[0]) || {
    filetype: win.mget(_a.filetype),
    ownpath: win.mget(_a.ownpath),
  };
  if (root.filetype === _a.hub) return "";
  const p = normalizePath(root.ownpath);
  return p && p !== "/" ? p : "";
}

// - a single hit comes back as a bare object;
// - hub_id is re-checked so a foreign row can never render here;
// - `scope` fences by ownpath and FAILS CLOSED (no path → not shown);
// - the proc computes privilege but does not filter on it; a missing field is
//   "unknown", kept, an explicit value without the read bit is dropped.
function searchRows(res, { hub_id, scope, readMask }) {
  let rows = res;
  if (!_.isArray(rows)) {
    rows = (res && (res.data || res.rows)) || (res && res.nid ? [res] : []);
  }
  if (!_.isArray(rows)) rows = [];
  return rows
    .filter((r) => r && (r.nid || r.id))
    .filter((r) => r.hub_id == null || `${r.hub_id}` === `${hub_id}`)
    .filter((r) => {
      if (!scope) return true;
      const path = normalizePath(r.ownpath);
      if (!path) return false;
      return path === scope || path.indexOf(`${scope}/`) === 0;
    })
    .filter((r) => {
      if (r.privilege == null) return true;
      const p = Number(r.privilege);
      return !Number.isFinite(p) || (p & readMask) === readMask;
    });
}

function isSearching(win) {
  return !!win._wsQuery;
}

function bump(win) {
  win._wsSearchToken = (win._wsSearchToken || 0) + 1;
  return win._wsSearchToken;
}

function setStatus(win, list, status) {
  const panel = Loading.panelOf(win, list);
  if (!panel) return;
  if (status) panel.dataset.search = status;
  else delete panel.dataset.search;
}

function clearTimer(win) {
  if (win._wsSearchTimer) {
    clearTimeout(win._wsSearchTimer);
    win._wsSearchTimer = null;
  }
}

function bindEscape(win) {
  if (win._wsSearchEsc) return;
  // Only a press from inside the search field: Esc elsewhere belongs to
  // whatever else is listening (dialogs, the desk hotkeys).
  win._wsSearchEsc = (e) => {
    if (e.key !== "Escape") return;
    const box = win._wsSearchContainer;
    if (!box || !box.el || !box.el.contains(e.target)) return;
    exit(win, { clearInput: true });
  };
  document.addEventListener("keydown", win._wsSearchEsc);
}

function unbindEscape(win) {
  if (!win._wsSearchEsc) return;
  document.removeEventListener("keydown", win._wsSearchEsc);
  win._wsSearchEsc = null;
}

function clearInput(win) {
  const box = win._wsSearchBox;
  // setValue fires the Entry's watch → onTyped("") → exit(), a no-op by then.
  if (box && box._input && typeof box.setValue === "function") box.setValue("");
}

function run(win, q) {
  const hub_id = hubIdOf(win);
  if (!hub_id) return Promise.resolve();
  const token = bump(win);
  if (!isSearching(win)) {
    // Results span every type; a Docs/PDF tab left lit would lie about them.
    win._resetFileTypeFilter();
    bindEscape(win);
  }
  win._wsQuery = q;
  win._wsSearchNid = win.mget(_a.nid);
  return win.ensurePart(_a.list).then((list) => {
    if (!alive(list) || token !== win._wsSearchToken) return;
    // api is {} now: clears rows + paging, fetches nothing. begin() AFTER
    // restart — restart fires a flush eod synchronously.
    list.restart();
    Loading.begin(win, list);
    setStatus(win, list, "pending");
    if (win._isFolderGridMode()) win._prepareListPartition(list);
    const scope = scopeOf(win);
    return win
      .fetchService(
        {
          service: (SERVICE.media && SERVICE.media.search_all) || "media.search_all",
          hub_id,
          string: q,
          page: 1,
          limit: FETCH_MAX,
        },
        { async: 1 },
      )
      .then(
        (res) => searchRows(res, { hub_id, scope, readMask: _K.permission.read }),
        () => [],
      )
      .then((rows) => {
        if (token !== win._wsSearchToken || !alive(list)) return;
        setStatus(win, list, rows.length ? "results" : "empty");
        list.handleResponse(rows);
        // A full page (rows === pagelength) does not EOD by itself, and the
        // grid stays hidden until EOD (_prepareListPartition). There is no
        // next page to wait for.
        if (!list._end_of_data) list._eod();
        Loading.end(win);
      });
  });
}

function exit(win, { reload = true, clearInput: clear = false } = {}) {
  clearTimer(win);
  bump(win); // drops any answer still in flight
  unbindEscape(win);
  const was = isSearching(win);
  win._wsQuery = null;
  win._wsSearchNid = null;
  if (alive(win.iconsList)) setStatus(win, win.iconsList, null);
  if (clear) clearInput(win);
  if (was && reload) return win.loadContent();
}

// Every keystroke (Entry `watch`).
function onTyped(win, text) {
  const q = normalizeQuery(text);
  clearTimer(win);
  // An empty field is NOT "everything" — it is "back to the folder".
  if (q.length < MIN_QUERY) {
    exit(win, { reload: isSearching(win) });
    return;
  }
  if (q === win._wsQuery) return;
  win._wsSearchTimer = setTimeout(() => {
    win._wsSearchTimer = null;
    run(win, q);
  }, DEBOUNCE_MS);
}

// Called first thing in the window's loadContent(). The same folder → a
// refresh (changelog poller, upload) re-runs the search in place. A different
// nid → the window navigated (e.g. into a result folder): search ends, the
// field clears, and the caller loads the folder as usual.
function onLoadContent(win) {
  if (!isSearching(win)) return false;
  if (`${win.mget(_a.nid)}` !== `${win._wsSearchNid}`) {
    exit(win, { reload: false, clearInput: true });
    return false;
  }
  run(win, win._wsQuery);
  return true;
}

// A view switch (grid ↔ row) rebuilds the list part; its own start fetched
// nothing (api {}), so fill it with the active search.
function onListReady(win, list) {
  if (!isSearching(win)) return false;
  run(win, win._wsQuery);
  return true;
}

function teardown(win) {
  clearTimer(win);
  bump(win);
  unbindEscape(win);
  Loading.end(win);
}

module.exports = {
  normalizeQuery,
  normalizePath,
  searchRows,
  scopeOf,
  isSearching,
  onTyped,
  run,
  exit,
  onLoadContent,
  onListReady,
  teardown,
  MIN_QUERY,
  DEBOUNCE_MS,
  FETCH_MAX,
};
