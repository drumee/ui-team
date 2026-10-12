// tests/access-overlay-keeps-tab.test.js — the rail's Access opens OVER the
// tab that is up and a second press closes it (Lexis, 2026-10-12).
//
//   node --test tests/access-overlay-keeps-tab.test.js
//
// Access used to be a tab of its own (`activeTab` = "access", data-view =
// "access"), so from Task or Meet it always switched the window to Files.
// It is an overlay now (window/folder/access-column): `activeTab` stays, the
// split body carries `data-access="1"`, and closing it relights the rail on
// the tab underneath.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

global._a = global._a || {};
const AC = require("../src/drumee/builtins/window/folder/access-column");

const FOLDER_SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/folder/index.js"),
  "utf8",
);
const DESK_SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/index.js"),
  "utf8",
);
const WM_SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/wm/index.js"),
  "utf8",
);

function splitBody() {
  return { el: { dataset: {} }, appended: [], append(spec) { this.appended.push(spec); } };
}

function folder(activeTab) {
  const view = splitBody();
  const w = {
    activeTab,
    __folderView: view,
    stashed: 0,
    restored: 0,
    chatDetailsClosed: 0,
    mget: () => undefined,
    getPart: () => null,
    _stashPanelScroll() { this.stashed++; },
    _restorePanelScroll() { this.restored++; },
    _closeChatDetails() { this.chatDetailsClosed++; },
  };
  return { w, view };
}

test("opening over Task keeps the Task tab and stamps the split body", () => {
  const { w, view } = folder("task");
  AC.showAccessOverlay(w, view);
  assert.equal(w.activeTab, "task");
  assert.equal(view.el.dataset.access, "1");
  assert.equal(view.el.dataset.view, undefined, "data-view is not touched");
  assert.equal(AC.accessOpen(w), true);
  assert.equal(view.appended.length, 1, "the members panel mounts on first open");
  assert.equal(view.appended[0].mode, "column");
  // Chat details belongs to the Files view's chat column only.
  assert.equal(w.chatDetailsClosed, 0);
});

test("opening over Files closes chat details, as the old Files -> Access switch did", () => {
  const { w, view } = folder(undefined);
  AC.showAccessOverlay(w, view);
  assert.equal(w.chatDetailsClosed, 1);
  assert.equal(w.stashed, 1);
});

test("a second open does not re-stash or re-mount", () => {
  const { w, view } = folder("meeting");
  AC.showAccessOverlay(w, view);
  AC.showAccessOverlay(w, view);
  assert.equal(w.stashed, 1);
  assert.equal(view.appended.length, 1);
});

test("closing relights the rail on the tab underneath, not on Files", () => {
  const { w, view } = folder("task");
  const lit = [];
  global.window = { Desk: { _railHighlight: (t) => lit.push(t) } };
  try {
    AC.showAccessOverlay(w, view);
    AC.closeAccessColumn(w);
  } finally {
    delete global.window;
  }
  assert.deepEqual(lit, ["task"]);
  assert.equal(w.activeTab, "task");
  assert.equal(view.el.dataset.access, undefined);
  assert.equal(AC.accessOpen(w), false);
  assert.equal(w.restored, 1);
});

test("closing over Files relights Files and replays the chat column's entrance", () => {
  const { w, view } = folder("files");
  const lit = [];
  global.window = { Desk: { _railHighlight: (t) => lit.push(t) } };
  try {
    AC.showAccessOverlay(w, view);
    AC.closeAccessColumn(w);
  } finally {
    delete global.window;
  }
  assert.deepEqual(lit, ["files"]);
  assert.equal(view.el.dataset.fromView, "access");
});

test("closing when nothing is open does nothing", () => {
  const { w } = folder("chat");
  const lit = [];
  global.window = { Desk: { _railHighlight: (t) => lit.push(t) } };
  try {
    AC.closeAccessColumn(w);
  } finally {
    delete global.window;
  }
  assert.deepEqual(lit, []);
  assert.equal(w.restored, 0);
});

test("hide with restore:false leaves the scroll to the tab switch", () => {
  const { w, view } = folder("task");
  AC.showAccessOverlay(w, view);
  assert.equal(AC.hideAccessOverlay(w, { restore: false }), true);
  assert.equal(w.restored, 0);
});

test("showFolderTab: another tab takes the overlay down, after the scroll stash", () => {
  const showFolderTab = new Function(
    "ACCESS_TAB",
    "hideAccessOverlay",
    `return ${sliceFunction(FOLDER_SRC, "showFolderTab(tab)")}`,
  )(AC.ACCESS_TAB, AC.hideAccessOverlay);
  const order = [];
  const { w, view } = folder("task");
  AC.showAccessOverlay(w, view);
  w._stashPanelScroll = () => order.push(`stash:${w._accessOpen ? "open" : "closed"}`);
  // Stop once the overlay is handled: the rest of the switch is not what this
  // test is about, so the first tab-change hook it reaches throws.
  w._closeChatDetails = () => {};
  w._announceTabSeen = () => { throw new Error("stop"); };
  assert.throws(() => showFolderTab.call(w, "files"), /stop/);
  assert.deepEqual(order, ["stash:open"]);
  assert.equal(AC.accessOpen(w), false);
  assert.equal(view.el.dataset.access, undefined);
});

test("showFolderTab: the tab under the overlay pressed again closes it and keeps the tab", () => {
  const showFolderTab = new Function(
    "ACCESS_TAB",
    "hideAccessOverlay",
    `return ${sliceFunction(FOLDER_SRC, "showFolderTab(tab)")}`,
  )(AC.ACCESS_TAB, AC.hideAccessOverlay);
  const { w, view } = folder("task");
  w._parkLiveCall = () => {};
  w.syncNewCtrlVisibility = () => {};
  AC.showAccessOverlay(w, view);
  showFolderTab.call(w, "task");
  assert.equal(w.activeTab, "task");
  assert.equal(AC.accessOpen(w), false);
  assert.equal(w.restored, 1);
});

test("desk: the rail's Access toggles closed only when the overlay is on screen", () => {
  const onScreen = new Function(
    "_",
    "accessOverlayOpen",
    `return ${sliceFunction(DESK_SRC, "_accessOverlayOnScreen(w)")}`,
  )({ isFunction: (f) => typeof f === "function" }, AC.accessOpen);
  const desk = (section) => ({
    getPart: (pn) => (pn === "breadcrumb" ? { isSectionMode: () => section } : null),
  });
  const pane = (open, state = "1") => ({
    _accessOpen: open ? 1 : 0,
    el: { dataset: { state } },
    onUiEvent() {},
  });
  assert.equal(onScreen.call(desk(false), pane(true)), true);
  assert.equal(onScreen.call(desk(false), pane(false)), false, "closed: the press opens");
  assert.equal(onScreen.call(desk(true), pane(true)), false, "behind a section screen: the press shows it");
  assert.equal(onScreen.call(desk(false), pane(true, "0")), false, "pane not raised: the press raises it");
  const withInvite = Object.assign(desk(false), { _invitePopup: { isDestroyed: () => false } });
  assert.equal(onScreen.call(withInvite, pane(true)), false, "under the Invite popup");
  assert.equal(onScreen.call(desk(false), null), false);
});

test("Wm: a workspace switch with Access up still lands the next one on Access", () => {
  const carry = new Function(
    "_a",
    "require",
    `return ${sliceFunction(WM_SRC, "paneTabToCarry()")}`,
  )({ chat: "chat", task: "task" }, (m) => {
    assert.equal(m, "window/folder/access-column");
    return AC;
  });
  const wm = (pane) => ({ headlessPane: () => pane });
  assert.equal(carry.call(wm({ activeTab: "task", _accessOpen: 1 })), "access");
  assert.equal(carry.call(wm({ activeTab: "task" })), "task");
  assert.equal(carry.call(wm({ activeTab: "files" })), null);
  assert.equal(carry.call(wm(null)), null);
});

test("closing re-notes the panels still on screen BEFORE the hidden ones come back", () => {
  const { w, view } = folder("task");
  const seen = [];
  AC.showAccessOverlay(w, view);
  w._stashPanelScroll = () => seen.push(`stash:${view.el.dataset.access || "-"}`);
  w._restorePanelScroll = () => seen.push(`restore:${view.el.dataset.access || "-"}`);
  AC.hideAccessOverlay(w);
  assert.deepEqual(seen, ["stash:1", "restore:-"]);
});

test("opening right after a tab switch can skip the stash (secure-share -> Files)", () => {
  const { w, view } = folder("files");
  AC.showAccessOverlay(w, view, { stash: false });
  assert.equal(w.stashed, 0);
  assert.equal(AC.accessOpen(w), true);
});

test("closing over Chat reads the conversation the card was covering", () => {
  const { w, view } = folder("chat");
  let read = 0;
  w.getPart = (pn) => (pn === "folder-chat" ? { readIfInView: () => { read++; } } : null);
  const raf = global.requestAnimationFrame;
  global.requestAnimationFrame = (fn) => fn();
  try {
    AC.showAccessOverlay(w, view);
    AC.hideAccessOverlay(w);
  } finally {
    global.requestAnimationFrame = raf;
  }
  assert.equal(read, 1);
});
