// Final-review fixes: rotation must not lose a step's state (I1, I2), the
// mobile desk chrome must not cover a tour (I3), and the phone layout is
// behind the same rollout flag as phone tours (I4).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const T = path.join(SRC, "modules/desk/tutorial");
let flag = 0;
const STUBS = {
  "./skin": {},
  "desk/tutorial/skin": {},
  "libs/tutorial-tours": { armed() {}, markSeen() {}, mobileToursOn: () => !!flag },
  "./tours": {
    tour: () => ({ id: "workspace", flag: "workspace", steps: [{ kind: "tutorial_workspace", screens: 7, live_screens: 2 }] }),
    flaggedIds: () => [], stepChrome: () => ({ rail: null }),
    isLastScreen: () => true, entryScreen: () => 0, stepProgress: () => ({}),
  },
  "desk/tutorial/tours": {
    tour: () => ({ id: "chat", flag: "chat", mark_on: "success", steps: [{ kind: "tutorial_chat", screens: 5 }] }),
  },
  "desk/tutorial/host-kit": require(path.join(T, "host-kit.js")),
  "desk/tutorial/layout": require(path.join(T, "layout.js")),
  "libs/hotkeys": { register: (d) => d, unregister() {} },
  "builtins/widget/migrate-gdrive-popup/skin": {},
  "media/grid/template/folder": () => ({ type: "folderArt" }),
  "libs/billing": { planLabel: () => "Plan" },
};
const load = Module._load;
Module._load = function (r, p, m) {
  if (Object.prototype.hasOwnProperty.call(STUBS, r)) return STUBS[r];
  if (/^assets\//.test(r)) return "asset.png";
  if (/^libs\//.test(r)) return load.call(this, path.join(SRC, r), p, m);
  return load.call(this, r, p, m);
};
global._ = require("lodash");
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global._a = { content: "content", service: "service" };
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
  mset(k, v) { this._m[k] = v; }
  ensurePart(n) { return Promise.resolve(this.parts && this.parts[n]); }
  getPart(n) { return this.parts && this.parts[n]; }
  feed(x) { this.fed = (this.fed || 0) + 1; this.lastFed = x; }
  triggerHandlers(a) { (this.raised = this.raised || []).push(a); }
  warn() {}
};
let vw = 390;
global.window = { get innerWidth() { return vw; }, innerHeight: 844, matchMedia: () => ({ matches: true }) };
test.after(() => {
  Module._load = load;
  for (const k of ["_", "_a", "LOCALE", "LetcBox", "window", "Skeletons"]) delete global[k];
});

function fakeStep(layout) {
  const m = { layout };
  return {
    renders: 0, _screenIndex: 5, _name: "Acme", _created: { hub_id: "h1" },
    mget: (k) => m[k], mset: (k, v) => { m[k] = v; },
    _showScreen() { this.renders++; },
  };
}

test("I1: a desk-host rotation re-renders the SAME step instance (live state survives)", () => {
  flag = 1;
  vw = 390;
  const Desk = require(path.join(T, "index.js"));
  const h = new Desk({ tour: "workspace" });
  h.initialize({});
  const s = fakeStep("phone");
  h.parts = { content: { children: { last: () => s } } };
  h.el = { dataset: {} };
  h.fed = 0;
  vw = 1280;
  assert.equal(h._applyLayout(), true);
  assert.equal(h.fed, 0, "the shell and the step are not re-fed");
  assert.equal(s.renders, 1);
  assert.equal(s.mget("layout"), "desk");
  assert.equal(s._name, "Acme");
  assert.deepEqual(s._created, { hub_id: "h1" });
});

test("I2: re-rendering migrate during its live import redraws the live dialog, not the mock", async () => {
  const Migrate = require(path.join(T, "migrate/index.js"));
  const st = new Migrate({ layout: "desk" });
  st.initialize({});
  st._screenIndex = 3;
  st.fig = { family: "tutorial-migrate", group: "tutorial" };
  st.parts = {};
  let rendered = null;
  st._live = { dest: { hub_id: "h" }, link: "" };
  st._sa = { snapshot: () => ({ state: "idle" }) };
  st._readLiveLink = () => { st._live.link = "https://drive/x"; return st._live.link; };
  st._renderLive = (snap) => { rendered = snap; };
  st.fed = 0;
  await st._showScreen();
  assert.deepEqual(rendered, { state: "idle" });
  assert.equal(st.fed, 0, "the mock is not fed over the live dialog");
  assert.equal((st.raised || []).filter((a) => a.service === "spotlight:focus").length, 0);
  assert.equal(st._live.link, "https://drive/x", "the pasted link is kept");
});

test("I3: while a tour is up the mobile desk chrome stands down", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  for (const attr of ['data-desk-tour="1"', 'data-window-tour="1"']) {
    for (const part of ["mobile-topbar", "mobile-actions", "mrail"]) {
      const re = new RegExp(`\\.desk-module\\[${attr.replace(/[[\]"]/g, (c) => `\\${c}`)}\\][^{]*\\.desk-module__${part}[,\\s{][^}]*\\{[^}]*display: none`);
      assert.match(css, re, `${attr} hides __${part}`);
    }
  }
});

test("I4: the phone layout is behind mobile_tours unless the tour is a preview", () => {
  const Host = require(path.join(SRC, "builtins/window/tutorial/index.js"));
  vw = 390;
  flag = 0;
  const off = new Host({ tour: "chat" });
  off.initialize({});
  assert.equal(off._widgets[0].layout, "desk", "flag off: narrow desktop keeps today's layout");
  const preview = new Host({ tour: "chat", preview: 1 });
  preview.initialize({});
  assert.equal(preview._widgets[0].layout, "phone", "a preview always shows the phone layout");
  flag = 1;
  const on = new Host({ tour: "chat" });
  on.initialize({});
  assert.equal(on._widgets[0].layout, "phone");
});

test("I4: layoutFor answers desk when phone is not allowed", () => {
  const hk = require(path.join(T, "host-kit.js"));
  assert.equal(hk.layoutFor(390, false), "desk");
  assert.equal(hk.layoutFor(390, true), "phone");
  assert.equal(hk.layoutFor(390), "phone", "default allows (pure function keeps its old contract)");
});
