/**
 * Files-tab chat "File threads" bar (Figma 869:189953) — the folder window's
 * side. The bar lives in the chat panel's "ft-bar" part (toolkit chatPanel);
 * clicking it opens a dropdown of the folder's file threads (the Chat-tab
 * rail's File Threads, as a dropdown). A row fires the rail's
 * "thread-menu-file" service (window/folder/index.js scopes the chat to that
 * file in place) and closes the list.
 *
 * Plain functions of the window (`win`), tested with a fake
 * (tests/files-tab-topics.test.js).
 */
const fileThreadsBar = require("./skeleton/file-threads-bar");

function enabled(win) {
  return !!(win._privilegeGrantsChat(win.mget(_a.privilege)) && !win.mget(_a.token));
}

function alive(part) {
  return !!(part && part.el && !(part.isDestroyed && part.isDestroyed()));
}

function unbind(win) {
  const l = win._ftBarListeners;
  if (!l || typeof document === "undefined") return;
  document.removeEventListener("pointerdown", l.down, true);
  document.removeEventListener("keydown", l.key, true);
  win._ftBarListeners = null;
}

function bind(win, part) {
  unbind(win);
  if (typeof document === "undefined") return;
  const down = (e) => {
    if (part.el && typeof part.el.contains === "function" && part.el.contains(e && e.target)) return;
    close(win);
  };
  const key = (e) => {
    if (e && e.key === "Escape") close(win);
  };
  document.addEventListener("pointerdown", down, true);
  document.addEventListener("keydown", key, true);
  win._ftBarListeners = { down, key };
}

/** Feed the bar (closed unless `open`). Empty for a gated / token window. */
function paint(win, { open = false } = {}) {
  return win.ensurePart("ft-bar").then((part) => {
    if (!alive(part)) return;
    if (!enabled(win)) {
      part.feed([]);
      return;
    }
    part.feed(
      fileThreadsBar(win, {
        items: Array.isArray(win._ftBarItems) ? win._ftBarItems : [],
        open,
        scopedNid: win._scopedFileNid || "",
      }),
    );
    part.el.dataset.open = open ? "1" : "0";
    if (open) bind(win, part);
    else unbind(win);
  });
}

/** Open (fetching the folder's threads) or close the dropdown. */
function toggle(win) {
  if (win._ftBarOpen) return close(win);
  if (!enabled(win)) return Promise.resolve();
  const folder = `${win.mget(_a.nid)}`;
  return Promise.resolve(win._fetchThreadList()).then((items) => {
    // Navigated away meanwhile: do not open a stale list.
    if (`${win.mget(_a.nid)}` !== folder) return undefined;
    win._ftBarItems = Array.isArray(items) ? items : [];
    win._ftBarOpen = true;
    return paint(win, { open: true });
  });
}

function close(win) {
  win._ftBarOpen = false;
  unbind(win);
  return paint(win, { open: false });
}

/** Folder navigation: another folder's threads — closed, list forgotten. */
function onFolderChange(win) {
  win._ftBarItems = [];
  return close(win);
}

module.exports = { paint, toggle, close, onFolderChange, unbind };
