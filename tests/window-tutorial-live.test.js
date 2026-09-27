// The in-window tour host once its migrate step goes live: the gates, the
// switch, and a lifecycle that no longer ends on the first success.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const seen = [];
const said = [];
const blocked = [];
const hk = {};
let locked = false;
const STUBS = {
  "./skin": {},
  "desk/tutorial/skin": {},
  "libs/tutorial-tours": { armed() {}, markSeen: (id) => seen.push(id) },
  "desk/tutorial/tours": {
    tour: () => ({ id: "migrate", flag: "migrate", mark_on: "success", steps: [{ kind: "tutorial_migrate", screens: 4 }] }),
  },
  "desk/tutorial/host-kit": require(path.join(SRC, "modules/desk/tutorial/host-kit.js")),
  "libs/over-limit": { isLocked: () => locked, notifyBlocked: (k) => blocked.push(k) },
  "libs/permission-denied": { sayWeakPrivilege: (...a) => said.push(a) },
  "libs/hotkeys": { register: (d) => { hk.def = d; return d; }, unregister() {} },
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};

global._ = { isFunction: (f) => typeof f === "function" };
global._a = { content: "content", privilege: "privilege", service: "service" };
global._K = { permission: { write: 4 } };
global.LOCALE = { PERMISSION_ACTION_IMPORT: "import" };
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
  softDestroy() { this.destroyedSoftly = (this.destroyedSoftly || 0) + 1; }
  ensurePart(n) { return Promise.resolve(this.parts[n]); }
  getPart(n) { return this.parts[n]; }
  warn() {}
};

const Host = require(path.join(SRC, "builtins/window/tutorial/index.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["_", "_a", "_K", "LOCALE", "LetcBox", "document"]) delete global[k];
});

const flush = () => new Promise((r) => setImmediate(r));
const dest = { hub_id: "h1", nid: "n1", name: "Docs", area: "private", filetype: "hub" };

function make({ canUpload = true, ws: wsExtra = {} } = {}) {
  seen.length = 0; said.length = 0; blocked.length = 0; locked = false;
  const ws = {
    events: [], refreshed: 0,
    mget: (k) => (k === "privilege" ? 3 : undefined),
    canUpload: () => canUpload,
    gdriveDestination: () => dest,
    refreshContent() { ws.refreshed++; },
    onUiEvent(c, a) { ws.events.push(a.service); },
    newContent() { return "orig"; },
    ...wsExtra,
  };
  const stepW = { lived: null, goLive(d) { stepW.lived = d; } };
  const spot = { cleared: 0, clear() { spot.cleared++; } };
  const h = new Host({ tour: "migrate", target_window: ws });
  h.initialize({});
  h.el = { dataset: {}, contains: () => true };
  h.parts = { spotlight: spot, content: { children: { last: () => stepW } } };
  return { h, ws, stepW, spot };
}
const trig = { mget: () => undefined };

test("every step payload is live_capable", () => {
  const { h } = make();
  assert.ok(h._widgets.length > 0);
  assert.ok(h._widgets.every((w) => w.live_capable === 1));
});

test("go-live: all gates pass → spotlight down, step live, tour recorded, host stays", async () => {
  const { h, stepW, spot } = make();
  h.onUiEvent(trig, { service: "window-tutorial:go-live" });
  await flush();
  assert.equal(h.el.dataset.live, "1");
  assert.equal(spot.cleared, 1);
  assert.deepEqual(stepW.lived, dest);
  assert.deepEqual(seen, ["migrate"]);
  assert.equal(h.destroyedSoftly, undefined);
});

test("go-live: over-limit → notice, tour ends", async () => {
  const { h, stepW } = make();
  locked = true;
  h.onUiEvent(trig, { service: "window-tutorial:go-live" });
  await flush();
  assert.deepEqual(blocked, ["write"]);
  assert.equal(stepW.lived, null);
  assert.equal(h.destroyedSoftly, 1);
});

test("go-live: no write right → permission message, tour ends", async () => {
  const { h, stepW } = make({ canUpload: false });
  h.onUiEvent(trig, { service: "window-tutorial:go-live" });
  await flush();
  assert.deepEqual(said, [["import", 3, 4]]);
  assert.equal(stepW.lived, null);
  assert.equal(h.destroyedSoftly, 1);
});

test("go-live: no destination → tour ends", async () => {
  const { h, stepW } = make({ ws: { gdriveDestination: () => null } });
  h.onUiEvent(trig, { service: "window-tutorial:go-live" });
  await flush();
  assert.equal(stepW.lived, null);
  assert.equal(h.destroyedSoftly, 1);
});

test("while live, files landing in the window record but do not end the tour", async () => {
  const { h, ws } = make();
  h._watchForSuccess(ws);
  h.onUiEvent(trig, { service: "window-tutorial:go-live" });
  await flush();
  assert.equal(ws.newContent(), "orig");
  assert.equal(h.destroyedSoftly, undefined);
  assert.deepEqual(seen, ["migrate"], "recorded once, not twice");
});

test("before live, a success still ends the tour as today", () => {
  const { h, ws } = make();
  h._watchForSuccess(ws);
  ws.newContent();
  assert.equal(h.destroyedSoftly, 1);
});

test("close-live ends; refresh-target refreshes; fallback launches the popup then ends", () => {
  const { h, ws } = make();
  h.onUiEvent(trig, { service: "window-tutorial:refresh-target" });
  assert.equal(ws.refreshed, 1);
  h.onUiEvent(trig, { service: "window-tutorial:fallback-popup" });
  assert.deepEqual(ws.events, ["launch-gdrive-migration"]);
  assert.equal(h.destroyedSoftly, 1);
  const b = make();
  b.h.onUiEvent(trig, { service: "window-tutorial:close-live" });
  assert.equal(b.h.destroyedSoftly, 1);
});

test("dead window: refresh and fallback do not throw", () => {
  const { h, ws } = make();
  ws.isDestroyed = () => true;
  assert.doesNotThrow(() => h.onUiEvent(trig, { service: "window-tutorial:refresh-target" }));
  assert.doesNotThrow(() => h.onUiEvent(trig, { service: "window-tutorial:fallback-popup" }));
  assert.equal(ws.refreshed, 0);
});

test("escape while typing in the live dialog keeps it; otherwise ends", async () => {
  const { h } = make();
  h._bindEscape();
  h.onUiEvent(trig, { service: "window-tutorial:go-live" });
  await flush();
  global.document = { activeElement: { tagName: "INPUT" } };
  assert.equal(hk.def.run(), false);
  assert.equal(h.destroyedSoftly, undefined);
  global.document = { activeElement: { tagName: "DIV" } };
  assert.equal(hk.def.run(), true);
  assert.equal(h.destroyedSoftly, 1);
});

test("a tour already leaving opens no popup and goes live on nothing", async () => {
  const { h, ws, stepW } = make();
  h.onUiEvent(trig, { service: "window-tutorial:go-live" });
  h.onUiEvent(trig, { service: "window-tutorial:close-live" });
  await flush();
  assert.equal(stepW.lived, null, "went live under a closing tour");
  h.onUiEvent(trig, { service: "window-tutorial:fallback-popup" });
  assert.deepEqual(ws.events, [], "popup launched after the user left");
});

test("every step payload carries the window's import destination", () => {
  const { h } = make();
  assert.ok(h._widgets.every((w) => w.import_dest && w.import_dest.name === "Docs"));
});

test("no destination answer → no import_dest, the step keeps its example", () => {
  const { h } = make({ ws: { gdriveDestination: undefined } });
  assert.ok(h._widgets.every((w) => w.import_dest == null));
});
