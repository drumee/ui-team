// tests/location-url.test.js — the address bar follows the visitor's location
// inside Internal and External workspaces (Lexis, 2026-10-22).
//
//   node --test tests/location-url.test.js
//
// Runs the REAL libs/location-url, libs/compact-deep-link and
// libs/file-deep-link, plus the real wm.route() / desk._hasDeepLink() sliced
// out of their sources, against a stub browser + desk. What must not move: a
// reload still restores the remembered screen, a pasted / new-tab URL still
// opens as an Internal Link, and nothing is written while a navigation, a
// restore or a sign-in relay is in flight.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/drumee");

// ── stub browser ──────────────────────────────────────────────────────────────
const store = new Map();
global.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const loc = { hash: "#/desk/wm/home", pathname: "/-/", search: "" };
const hist = {
  state: null,
  writes: 0,
  replaceState(state, _t, url) {
    this.writes++;
    this.state = state;
    loc.hash = url.slice(url.indexOf("#"));
  },
};
global.window = { location: loc, history: hist };
Object.defineProperty(global, "Wm", { get: () => global.window.Wm });
global.location = loc;
global.history = hist;

// ── injected globals ─────────────────────────────────────────────────────────
global._ = { isFunction: (f) => typeof f === "function", isEmpty: (v) => !v };
global._a = {
  filetype: "filetype", nid: "nid", hub_id: "hub_id", kind: "kind", folder: "folder",
  hub: "hub", contact: "contact", actual_home_id: "actual_home_id", home_id: "home_id",
  minimize: "minimize", state: "state", headless: "headless", home: "home",
};
global._K = { module: { desk: "#/desk" } };
let area = "private";
global.bootstrap = () => ({ area });
let online = 1;
global.Visitor = {
  isOnline: () => online,
  parseModuleArgs: () => ({}),
  timeout: (t) => t,
};
// parseModule as ui-core does it: split, then drop leading empties.
global.Visitor.parseModule = (l) => {
  const b = (l != null ? l : loc.hash).split(/[#/&?]/g);
  while (b.length && !b[0]) b.shift();
  return b;
};
let broadcastHandler = null;
global.RADIO_BROADCAST = { on: (ev, fn) => { if (ev === "breadcrumb:content") broadcastHandler = fn; } };

// ── aliases ──────────────────────────────────────────────────────────────────
let tutorialArmed = false;
let hubArmed = false;
const stub = (id, exports) => {
  require.cache[id] = { id, filename: id, loaded: true, exports };
  return id;
};
const TUTORIAL = stub("tutorial-stub", { armed: () => tutorialArmed });
const HUB = stub("hub-stub", { has: () => hubArmed });
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "libs/window-tutorial-intent") return TUTORIAL;
  if (req === "libs/hub-deep-link") return HUB;
  if (req.startsWith("libs/")) return path.join(SRC, `${req}.js`);
  if (req === "window/configs/application") return path.join(SRC, "builtins/window/configs/application.js");
  return origResolve.call(this, req, ...rest);
};

const locationUrl = require("libs/location-url");
const compact = require("libs/compact-deep-link");
const fileDeepLink = require("libs/file-deep-link");

// ── stub desk ────────────────────────────────────────────────────────────────
function view(attrs, { state, media } = {}) {
  return {
    el: { dataset: state != null ? { state: `${state}` } : {} },
    mget: (k) => attrs[k],
    media,
    isDestroyed: () => false,
  };
}
const layer = (views) => ({
  children: { toArray: () => views },
  on(ev, fn) { (this.listeners = this.listeners || []).push([ev, fn]); },
});
function desk({ screen = false, restoring = false } = {}) {
  global.window.Desk = {
    _mainScreenOnTop: () => screen,
    _restoreInFlight: restoring,
    isDestroyed: () => false,
  };
}
function wm({ panes = [], floating = [] } = {}) {
  global.window.Wm = { headlessLayer: layer(panes), windowsLayer: layer(floating) };
}
const pane = (attrs, state = 1) =>
  view({ kind: "window_folder", headless: 1, state, ...attrs });

function reset() {
  store.clear();
  loc.hash = "#/desk/wm/home";
  hist.state = null;
  hist.writes = 0;
  area = "private";
  online = 1;
  tutorialArmed = false;
  hubArmed = false;
  locationUrl.settle(); // clears the hold; its scheduled sync is harmless
  desk();
  wm();
}

const ROOT_PANE = { filetype: "hub", hub_id: "hubA", nid: 0, actual_home_id: "root1" };

// ── compact-deep-link ────────────────────────────────────────────────────────
test("compactHash builds the Internal Link hash and refuses what cannot be read back", () => {
  assert.equal(compact.compactHash({ nid: "n1", hub_id: "h1", filetype: "image" }), "#/desk/wm/o/n1/h1/image");
  assert.equal(compact.compactHash({ nid: "n1", hub_id: "h1", filetype: "folder" }), "#/desk/wm/o/n1/h1/folder");
  assert.equal(compact.compactHash({ nid: "n%2F", hub_id: "h1", filetype: "image" }), null);
  assert.equal(compact.compactHash({ nid: "n1", hub_id: "h1", filetype: "nonsense" }), null);
  assert.equal(compact.compactHash({ nid: "n1", filetype: "image" }), null);
  // Round-trips through the parser the opener uses.
  const p = compact.parseCompactPath(Visitor.parseModule("#/desk/wm/o/n1/h1/folder"));
  assert.deepEqual([p.nid, p.hub_id, p.filetype], ["n1", "h1", "folder"]);
});

test("toCompactUrl output is unchanged by the refactor", () => {
  const long = "https://drumee.in/-/#/desk/wm/open/nid=n1&hub_id=h1&kind=image_viewer&filetype=image";
  assert.equal(compact.toCompactUrl(long), "https://drumee.in/-/#/desk/wm/o/n1/h1/image");
  const hub = "https://drumee.in/-/#/desk/wm/open/nid=n1&hub_id=h1&kind=window_team&filetype=hub";
  assert.equal(compact.toCompactUrl(hub), hub);
});

// ── where the visitor is ─────────────────────────────────────────────────────
test("workspace root → folder link to the root folder; subfolder → that folder", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/root1/hubA/folder");
  wm({ panes: [pane({ filetype: "folder", hub_id: "hubA", nid: "sub9", actual_home_id: "root1" })] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/sub9/hubA/folder");
});

test("External (share) and personal panes get the same link", () => {
  reset();
  wm({ panes: [pane({ filetype: "share", area: "share", hub_id: "ext1", actual_home_id: "r2" })] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/r2/ext1/folder");
  wm({ panes: [pane({ filetype: "personal", hub_id: "me", actual_home_id: "r3" })] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/r3/me/folder");
});

test("the focused pane wins over a background one", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE, 1), pane({ ...ROOT_PANE, hub_id: "hubB", actual_home_id: "rB" }, 0)] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/root1/hubA/folder");
});

test("an open file is the location; closing / minimising it falls back to the folder", () => {
  reset();
  const media = { actualNode: () => ({ nid: "f7", hub_id: "hubA" }), mget: () => "document" };
  const player = view({ kind: "document_reader", filetype: "document", nid: "f7", hub_id: "hubA" }, { state: 1, media });
  wm({ panes: [pane(ROOT_PANE)], floating: [player] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/f7/hubA/document");
  const minimised = view({ kind: "document_reader", filetype: "document", nid: "f7", hub_id: "hubA", minimize: 1 }, { state: 1, media });
  wm({ panes: [pane(ROOT_PANE)], floating: [minimised] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/root1/hubA/folder");
  wm({ panes: [pane(ROOT_PANE)], floating: [] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/root1/hubA/folder");
});

test("a DOCKED player (headless layer, beside the pane) is the location too", () => {
  reset();
  const media = { actualNode: () => ({ nid: "img1", hub_id: "hubA" }), mget: () => "image" };
  const docked = view({ kind: "image_viewer", filetype: "image", nid: "img1", hub_id: "hubA", headless: 1 }, { state: 1, media });
  const p = pane(ROOT_PANE);
  p.el.dataset.state = "0";
  wm({ panes: [p, docked] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/img1/hubA/image");
  wm({ panes: [p] }); // closed
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/root1/hubA/folder");
});

test("a shortcut's player names its target, like the Internal Link row", () => {
  reset();
  const media = { actualNode: () => ({ nid: "target", hub_id: "hubT" }), mget: () => "image" };
  wm({ floating: [view({ filetype: "image", nid: "shortcut", hub_id: "hubA" }, { state: 1, media })] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/target/hubT/image");
});

test("a focused non-file window (meeting, chat, a workspace window) does not hijack the URL", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)], floating: [view({ kind: "window_meeting", filetype: "hub", hub_id: "hubA", nid: "x" }, { state: 1 })] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/root1/hubA/folder");
});

test("a floating folder window that is focused is the location", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)], floating: [view({ kind: "window_folder", filetype: "folder", nid: "fl1", hub_id: "hubC" }, { state: 1 })] });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/o/fl1/hubC/folder");
});

test("Inbox / Calendar / Settings / org screen, or no workspace → resting home", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)] });
  desk({ screen: true });
  assert.equal(locationUrl.currentHash(), "#/desk/wm/home");
  desk();
  wm();
  assert.equal(locationUrl.currentHash(), "#/desk/wm/home");
  wm({ panes: [pane({ filetype: "hub", hub_id: "hubA", nid: 0 })] }); // root nid unknown
  assert.equal(locationUrl.currentHash(), "#/desk/wm/home");
});

test("a secure-share link pane keeps its own address", () => {
  reset();
  wm({ panes: [pane({ ...ROOT_PANE, link_scope: 1 })] });
  assert.equal(locationUrl.currentHash(), null);
});

// ── writing it ───────────────────────────────────────────────────────────────
test("sync writes with replaceState, marks the entry, keeps foreign history state", () => {
  reset();
  hist.state = { exitGuardSentinel: 1 };
  wm({ panes: [pane(ROOT_PANE)] });
  assert.equal(locationUrl.sync(), true);
  assert.equal(loc.hash, "#/desk/wm/o/root1/hubA/folder");
  assert.equal(hist.state.exitGuardSentinel, 1);
  assert.equal(hist.state[locationUrl.MARK], 1);
  assert.equal(locationUrl.isMirrorEntry(), true);
  // Idempotent: nothing rewritten when already there.
  const writes = hist.writes;
  locationUrl.sync();
  assert.equal(hist.writes, writes);
  // A hash typed / navigated elsewhere is no longer ours.
  loc.hash = "#/desk/wm/o/zz/hubA/folder";
  assert.equal(locationUrl.isMirrorEntry(), false);
});

test("nothing is written while blocked", () => {
  const cases = {
    "signed out": () => { online = 0; },
    "dmz host": () => { area = "dmz"; },
    "tour from URL": () => { tutorialArmed = true; },
    "routing a hash navigation": () => { locationUrl.hold(); },
    "desk-state restore": () => { desk({ restoring: true }); },
    "file relay armed": () => { fileDeepLink.arm("#/desk/wm/o/a/b/image"); },
    "workspace relay armed": () => { hubArmed = true; },
    "billing hash": () => { loc.hash = "#/desk/billing?plan=pro"; },
    "desk args read by others": () => { loc.hash = "#/desk?activate=1"; },
    "other module": () => { loc.hash = "#/welcome/signin"; },
  };
  for (const [name, block] of Object.entries(cases)) {
    reset();
    wm({ panes: [pane(ROOT_PANE)] });
    const before = loc.hash;
    block();
    const was = loc.hash;
    assert.equal(locationUrl.sync(), false, name);
    assert.equal(loc.hash, was, name);
    assert.equal(hist.writes, 0, `${name} (from ${before})`);
  }
});

test("plain '#/desk' and a routed wm hash are written over", () => {
  for (const h of ["#/desk", "", "#/desk/wm/reveal/?hub_id=hubA&nid=0&ts=1"]) {
    reset();
    loc.hash = h;
    wm({ panes: [pane(ROOT_PANE)] });
    assert.equal(locationUrl.sync(), true, h);
    assert.equal(loc.hash, "#/desk/wm/o/root1/hubA/folder", h);
  }
});

test("a window closing is noticed through Wm's layers (attached once)", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)] });
  locationUrl.sync();
  locationUrl.sync();
  for (const l of [Wm.headlessLayer, Wm.windowsLayer]) {
    assert.equal(l.listeners.length, 1);
    assert.equal(l.listeners[0][0], "add:child remove:child");
  }
});

test("start() listens on the breadcrumb channel once", () => {
  locationUrl.start();
  const first = broadcastHandler;
  locationUrl.start();
  assert.equal(typeof first, "function");
  assert.equal(broadcastHandler, first);
});

// ── reload / new tab ─────────────────────────────────────────────────────────
test("file-deep-link: a reloaded mirror entry is not a link while a screen is remembered", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)] });
  locationUrl.sync();
  store.set(locationUrl.DESK_STATE_KEY, JSON.stringify({ workspace: { hub_id: "hubA", nid: "root1" } }));
  assert.equal(fileDeepLink.captureFromUrl(), false);
  assert.equal(fileDeepLink.peek(), null);
  // Nothing remembered: the URL is all there is — open it.
  store.delete(locationUrl.DESK_STATE_KEY);
  assert.equal(fileDeepLink.captureFromUrl(), true);
  assert.equal(fileDeepLink.peek(), "#/desk/wm/o/root1/hubA/folder");
});

test("file-deep-link: a pasted / new-tab URL (no marker) arms as before", () => {
  reset();
  store.set(locationUrl.DESK_STATE_KEY, "{}");
  loc.hash = "#/desk/wm/o/n1/h1/image";
  assert.equal(fileDeepLink.captureFromUrl(), true);
});

// ── desk._hasDeepLink (real method) ──────────────────────────────────────────
const DESK_SRC = fs.readFileSync(path.join(SRC, "modules/desk/index.js"), "utf8");
const hasDeepLink = eval(`(${sliceFunction(DESK_SRC, "_hasDeepLink()")})`);

test("_hasDeepLink: a mirror entry rests like home; a relay or a real link still wins", () => {
  global.hubDeepLink = { has: () => false };
  global.fileDeepLink = fileDeepLink;
  global.locationUrl = locationUrl;
  reset();
  wm({ panes: [pane(ROOT_PANE)] });
  locationUrl.sync();
  assert.equal(hasDeepLink.call({}), false);
  fileDeepLink.arm(loc.hash);
  assert.equal(hasDeepLink.call({}), true);
  fileDeepLink.clear();
  hist.state = null; // same URL, pasted into a new tab
  assert.equal(hasDeepLink.call({}), true);
  loc.hash = "#/desk/wm/home";
  assert.equal(hasDeepLink.call({}), false);
});

// ── wm.route (real method) ───────────────────────────────────────────────────
const WM_SRC = fs.readFileSync(path.join(SRC, "modules/desk/wm/index.js"), "utf8");
const route = eval(`(${sliceFunction(WM_SRC, "route(l)")})`);

test("wm.route: Back / Forward / reload onto a mirror entry opens nothing", () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)] });
  locationUrl.sync();
  const calls = [];
  const self = {
    openDesignationLink: (...a) => calls.push(["designation", ...a]),
    openFileLocation: (...a) => calls.push(["file", ...a]),
  };
  global.COMPACT_SEGMENT = compact.COMPACT_SEGMENT;
  global.NOTIFICATION_SEGMENT = "reveal"; // wm module constant
  global.parseCompactPath = compact.parseCompactPath;
  route.call(self);
  assert.deepEqual(calls, []);
  // With the relay armed (reload with nothing remembered) it opens as a link.
  fileDeepLink.arm(loc.hash);
  const realTimeout = global.setTimeout;
  global.setTimeout = () => 0; // the 5 s tidy-up is not under test here
  try {
    route.call(self);
  } finally {
    global.setTimeout = realTimeout;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "designation");
  assert.equal(calls[0][1].nid, "root1");
  assert.equal(fileDeepLink.peek(), null); // settled by the route
});

test("wm.route: a real navigation holds the URL, and the tidy-up settles it on the location", async () => {
  reset();
  wm({ panes: [pane(ROOT_PANE)] });
  loc.hash = "#/desk/wm/home";
  global.Visitor.timeout = () => 1;
  const self = { openDesignationLink() {}, openFileLocation() {} };
  route.call(self);
  assert.equal(locationUrl.sync(), false); // held
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(loc.hash, "#/desk/wm/o/root1/hubA/folder");
  assert.equal(locationUrl.isMirrorEntry(), true);
  global.Visitor.timeout = (t) => t;
});
