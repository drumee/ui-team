// breadcrumb-mirror-unfocused-pane.test.js — the workspace pane mirrors every
// in-place folder navigation into the desk topbar, focused or not.
//
//   node --test tests/breadcrumb-mirror-unfocused-pane.test.js
//
// Prod (2026-10-20): once any other window had been opened, opening a folder
// changed the pane but the topbar kept the old path. The mirror in
// refreshBreadcrumbsUI was gated on the pane being FOCUSED (state 1), and
// the pane rarely is: every window shares the wm-radio channel, a folder tile
// does not raise the pane (bubble: 0), and nothing refocuses it. The gate is
// now "the pane on screen", which still keeps a background pane quiet.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const root = path.join(__dirname, "..");
const FOLDER_SRC = fs.readFileSync(path.join(root, "src/drumee/builtins/window/folder/index.js"), "utf8");
const CRUMB_SRC = fs.readFileSync(path.join(root, "src/drumee/modules/desk/breadcrumb/index.js"), "utf8");

global._a = { ...(global._a || {}), nid: "nid", hub_id: "hub_id", actual_home_id: "actual_home_id",
  filetype: "filetype", hub: "hub", folder: "folder", headless: "headless", pid: "pid",
  filename: "filename", area: "area", privilege: "privilege", state: "state", token: "token", vhost: "vhost",
  closed: "closed", home: "home" };
// Deferred work runs at once, so a test reads the mirror synchronously.
global._ = { defer: (f) => f(), isFunction: (f) => typeof f === "function", isArray: Array.isArray };

const refreshBreadcrumbsUI = new Function(`return ${sliceFunction(FOLDER_SRC, "refreshBreadcrumbsUI(stack)")}`)();

function pane({ state, onScreen, nid = "F7", filetype = "folder" }) {
  const model = { nid, hub_id: "H", filetype, headless: 1, state, pid: "ROOT", filename: "7", area: "private", privilege: 7 };
  const p = {
    model: { get: (k) => model[k] },
    mirrored: [],
    _navStack: [],
    mget(k) { return model[k]; },
    mset(o) { Object.assign(model, o); },
    updateBreadcrumb(crumb, source) { this.mirrored.push({ crumb, source }); },
    isDestroyed: () => false,
  };
  global.window = { Wm: { _curWorkspacePane: onScreen ? p : { other: 1 }, headlessPane: () => (onScreen ? p : { other: 1 }) } };
  return p;
}

test("a focused pane opening a folder tells the topbar, as before", () => {
  const p = pane({ state: 1, onScreen: true });
  refreshBreadcrumbsUI.call(p);
  assert.equal(p.mirrored.length, 1);
  assert.equal(p.mirrored[0].crumb.nid, "F7");
  assert.equal(p.mirrored[0].crumb.service, "change-workspace");
  assert.equal(p.mirrored[0].source, global.window.Wm, "sent as Wm, which is what desk_breadcrumb accepts");
});

test("an UNFOCUSED pane on screen tells the topbar too (the prod bug)", () => {
  const p = pane({ state: 0, onScreen: true });
  refreshBreadcrumbsUI.call(p);
  assert.equal(p.mirrored.length, 1);
  assert.deepEqual(
    { nid: p.mirrored[0].crumb.nid, pid: p.mirrored[0].crumb.pid, filename: p.mirrored[0].crumb.filename },
    { nid: "F7", pid: "ROOT", filename: "7" },
  );
});

test("a background pane (not the one on screen) stays quiet", () => {
  const p = pane({ state: 1, onScreen: false });
  refreshBreadcrumbsUI.call(p);
  assert.equal(p.mirrored.length, 0);
});

test("the topbar takes the mirror because its source is Wm, and ignores a window's own navigation", () => {
  const updateContent = new Function("Wm", `return ${sliceFunction(CRUMB_SRC, "_updateContent(data = [], source)")}`)(global.window.Wm);
  const bar = { browsed: [], defaults: 0, _onBrowse(d) { this.browsed.push(d); }, loadDefault() { this.defaults++; } };
  updateContent.call(bar, { nid: "F7", hub_id: "H" }, global.window.Wm);
  assert.equal(bar.browsed.length, 1);
  updateContent.call(bar, { nid: "F7", hub_id: "H" }, { aFolderWindow: 1 });
  assert.equal(bar.browsed.length, 1, "a window's private navigation does not retitle the bar");
});
