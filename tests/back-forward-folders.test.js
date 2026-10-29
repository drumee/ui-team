// Back and Forward move between folders (2026-10-29).
//
// Folder navigation used to rewrite the address with replaceState only, so the
// browser's Back button never went to the folder the visitor came from; it
// went to whatever page preceded the desk in the tab's history (prod report
// 2026-10-28). Now: moving from one folder to another ADDS an entry, Back /
// Forward (a popstate) make wm.route() OPEN the entry's folder in place, and
// nothing is written to the address bar until the pane stands on it. The
// resting "home" hash, the first write onto a foreign entry and a file opened
// on top of a folder keep rewriting the current entry.
//
// Runs the REAL libs/location-url against a stub browser + desk, the way
// tests/location-url.test.js does; wm.route()'s traversal branch is checked
// from the source.
//
//   node --test tests/back-forward-folders.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/drumee");

// ── stub browser ──────────────────────────────────────────────────────────────
const store = new Map();
global.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
global.localStorage = global.sessionStorage;
const loc = { hash: "#/desk/wm/home", pathname: "/-/", search: "" };
const hist = {
  state: null,
  pushes: [],
  replaces: [],
  pushState(state, _t, url) {
    this.pushes.push(url);
    this.state = state;
    loc.hash = url.slice(url.indexOf("#"));
  },
  replaceState(state, _t, url) {
    this.replaces.push(url);
    this.state = state;
    loc.hash = url.slice(url.indexOf("#"));
  },
};
const listeners = {};
global.window = {
  location: loc,
  history: hist,
  addEventListener: (ev, fn) => { listeners[ev] = fn; },
};
Object.defineProperty(global, "Wm", { get: () => global.window.Wm });
global.location = loc;
global.history = hist;

// ── injected globals ─────────────────────────────────────────────────────────
global._ = { isFunction: (f) => typeof f === "function", isEmpty: (v) => !v };
global._a = {
  filetype: "filetype", nid: "nid", hub_id: "hub_id", kind: "kind", folder: "folder",
  hub: "hub", actual_home_id: "actual_home_id", home_id: "home_id",
  minimize: "minimize", state: "state", headless: "headless",
};
global._K = { module: { desk: "#/desk" } };
global.bootstrap = () => ({ area: "private" });
global.Visitor = {
  isOnline: () => 1,
  parseModuleArgs: () => ({}),
  parseModule: (l) => {
    const b = (l != null ? l : loc.hash).split(/[#/&?]/g);
    while (b.length && !b[0]) b.shift();
    return b;
  },
};
global.RADIO_BROADCAST = { on: () => {} };

// ── aliases ──────────────────────────────────────────────────────────────────
const stub = (id, exports) => {
  require.cache[id] = { id, filename: id, loaded: true, exports };
  return id;
};
const HUB = stub("hub-stub", { has: () => false });
const FILE = stub("file-stub", { peek: () => null });
const OPEN_MEDIA = stub("open-media-stub", { CONTAINER_FILETYPES: ["folder", "hub", "private", "share"] });
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "libs/hub-deep-link") return HUB;
  if (req === "libs/file-deep-link") return FILE;
  if (req === "libs/open-media") return OPEN_MEDIA;
  if (req.startsWith("libs/")) return path.join(SRC, `${req}.js`);
  // compactHash() proves the filetype has a viewer before it writes a hash.
  if (req === "window/configs/application") return path.join(SRC, "builtins/window/configs/application.js");
  return origResolve.call(this, req, ...rest);
};
const locationUrl = require("libs/location-url");

// ── stub desk ────────────────────────────────────────────────────────────────
function view(attrs, { state = 1, media } = {}) {
  return { el: { dataset: { state: `${state}` } }, mget: (k) => attrs[k], media, isDestroyed: () => false };
}
const layer = (views) => ({ el: {}, children: { toArray: () => views } });
const pane = (attrs) => view({ kind: "window_folder", headless: 1, state: 1, ...attrs });
const FOLDER = (nid) => ({ filetype: "folder", hub_id: "h1", nid });
let screenOnTop = false;
function desk() {
  global.window.Desk = { _mainScreenOnTop: () => screenOnTop, _restoreInFlight: false, isDestroyed: () => false };
}
function at(attrs, floating = []) {
  global.window.Wm = { headlessLayer: layer([pane(attrs)]), windowsLayer: layer(floating) };
}
function reset() {
  loc.hash = "#/desk/wm/home";
  hist.state = null;
  hist.pushes = [];
  hist.replaces = [];
  screenOnTop = false;
  locationUrl.following(null);
  locationUrl.settle();
  desk();
}
const F1 = "/-/#/desk/wm/o/n1/h1/folder";
const F2 = "/-/#/desk/wm/o/n2/h1/folder";

test("the first write onto a foreign entry replaces; folder to folder pushes; home replaces", () => {
  reset();
  at(FOLDER("n1"));
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces, hist.pushes], [[F1], []]);
  assert.equal(hist.state[locationUrl.MARK], 1);
  // Into another folder: a new entry, so Back returns to n1.
  at(FOLDER("n2"));
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces, hist.pushes], [[F1], [F2]]);
  assert.equal(hist.state.hash, "#/desk/wm/o/n2/h1/folder");
  // Already there: nothing written.
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces.length, hist.pushes.length], [1, 1]);
  // A full-canvas screen rests on home — on the same entry.
  screenOnTop = true;
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces, hist.pushes], [[F1, "/-/#/desk/wm/home"], [F2]]);
  // Back onto the folder from home is not a folder-to-folder move either.
  screenOnTop = false;
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces.length, hist.pushes.length], [3, 1]);
});

test("a file opened on top of a folder, and its close, rewrite the folder's entry", () => {
  reset();
  at(FOLDER("n1"));
  locationUrl.sync();
  const viewer = view({ kind: "player_image", filetype: "image", nid: "f9", hub_id: "h1" }, { state: 1 });
  at({ ...FOLDER("n1"), state: 0 }, [viewer]);
  assert.equal(locationUrl.sync(), true);
  assert.equal(hist.pushes.length, 0);
  assert.equal(hist.replaces[hist.replaces.length - 1], "/-/#/desk/wm/o/f9/h1/image");
  // Closed: the folder is back on the same entry, no entry for the file.
  at(FOLDER("n1"));
  assert.equal(locationUrl.sync(), true);
  assert.equal(hist.pushes.length, 0);
  assert.equal(hist.replaces[hist.replaces.length - 1], F1);
});

test("isFolderHash recognises exactly the compact folder address", () => {
  assert.equal(locationUrl.isFolderHash("#/desk/wm/o/n1/h1/folder"), true);
  assert.equal(locationUrl.isFolderHash("#/desk/wm/o/n1/h1/image"), false);
  assert.equal(locationUrl.isFolderHash("#/desk/wm/home"), false);
  assert.equal(locationUrl.isFolderHash("#/desk/wm/o/n1/h1/folder?x=1"), false);
  assert.equal(locationUrl.isFolderHash(null), false);
});

test("a popstate marks the next route as Back / Forward", () => {
  reset();
  locationUrl.start();
  assert.equal(typeof listeners.popstate, "function");
  listeners.popstate();
  assert.equal(locationUrl.traversed(), true);
});

test("while an entry is being followed nothing is written until the pane stands on it", () => {
  reset();
  // Back landed on n1's entry; the pane still shows n2.
  loc.hash = "#/desk/wm/o/n1/h1/folder";
  hist.state = { [locationUrl.MARK]: 1, hash: loc.hash };
  locationUrl.following(loc.hash);
  at(FOLDER("n2"));
  assert.equal(locationUrl.sync(), false);
  assert.deepEqual([hist.replaces, hist.pushes], [[], []]);
  assert.equal(locationUrl.followingHash(), "#/desk/wm/o/n1/h1/folder");
  // The pane arrived: the entry already says so, nothing to write, follow over.
  at(FOLDER("n1"));
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces, hist.pushes], [[], []]);
  assert.equal(locationUrl.followingHash(), null);
});

test("a follow that ran out makes the next write replace the entry, not push over it", () => {
  reset();
  loc.hash = "#/desk/wm/o/n1/h1/folder";
  hist.state = { [locationUrl.MARK]: 1, hash: loc.hash };
  locationUrl.following(loc.hash);
  const now = Date.now;
  try {
    Date.now = () => now() + 60000;
    assert.equal(locationUrl.followingHash(), null);
  } finally {
    Date.now = now;
  }
  // The pane never got to n1 (the folder is gone): its position takes n1's entry.
  at(FOLDER("n2"));
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces, hist.pushes], [[F2], []]);
  // And the next folder move pushes again.
  at(FOLDER("n3"));
  assert.equal(locationUrl.sync(), true);
  assert.deepEqual([hist.replaces, hist.pushes], [[F2], ["/-/#/desk/wm/o/n3/h1/folder"]]);
});

test("the trail starts at the desk: sign-in and the host switch replace their entries", () => {
  // The sign-in screen enters the desk through one helper, which replaces.
  const welcome = fs.readFileSync(path.join(SRC, "modules/welcome/index.js"), "utf8");
  assert.equal((welcome.match(/this\._enterDesk\(/g) || []).length, 3);
  const helper = welcome.slice(welcome.indexOf("  _enterDesk(hash) {"), welcome.indexOf("async _redeemInviteThenEnter()"));
  assert.match(helper, /location\.replace\(`\$\{location\.pathname\}\$\{location\.search\}\$\{hash\}`\)/);
  assert.ok(!/location\.hash\s*=\s*_K\.module\.desk/.test(welcome));
  assert.ok(!/location\.hash\s*=\s*\n?\s*`#\/desk\/wm\/reveal/.test(welcome));
  // The switch to the organisation's host replaces this origin's entry.
  const router = fs.readFileSync(path.join(SRC, "router/index.js"), "utf8");
  const change = router.slice(router.indexOf("  changeHost(host) {"), router.indexOf("  loadModule() {"));
  assert.equal((change.match(/location\.replace\(/g) || []).length, 2);
  assert.ok(!/location\.host\s*=/.test(change));
  assert.ok(!/location\.href\s*=/.test(change));
  assert.match(change, /\$\{location\.protocol\}\/\/\$\{host\}\$\{location\.pathname\}\$\{location\.search\}/);
});

test("wm.route opens the entry travelled to, closing viewers the way their X does", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/wm/index.js"), "utf8");
  const route = src.slice(src.indexOf("  route(l) {"), src.indexOf("let args = Visitor.parseModuleArgs() || {};"));
  const traversal = route.indexOf("if (locationUrl.traversed()) {");
  assert.ok(traversal > 0);
  assert.ok(traversal < route.indexOf("locationUrl.schedule();"));
  assert.match(route, /this\._followHistory\(\);\s*return;/);
  const follow = src.slice(src.indexOf("  _followHistory() {"), src.indexOf("  async openDesignationLink("));
  assert.match(follow, /locationUrl\.following\(hash\)/);
  assert.match(follow, /this\._closeViewersForTraversal\(\), this\._leaveScreenForTraversal\(\), this\._openDesignationFolder\(compact\)/);
  assert.match(follow, /desk\._mainScreenOnTop\(\)\) return;[\s\S]*desk\.closeSectionScreen\(\);/);
  assert.match(follow, /this\.openDesignationLink\(compact, \{ compact: true \}\)/);
  assert.match(follow, /v\.mget\(_a\.kind\) === "window_folder"\) continue;/);
  assert.ok(follow.indexOf("v.closeAfterSave()") < follow.indexOf("v.goodbye()"));
});
