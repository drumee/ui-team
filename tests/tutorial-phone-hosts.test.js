// Both tour hosts decide phone vs desk from the viewport, stamp it on every
// step, and redraw the SAME screen when a rotation crosses the line.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const STUBS = {
  "./skin": {},
  "desk/tutorial/skin": {},
  // mobile_tours on: these tests are about the phone layout itself; the
  // flag's own gate is pinned in tutorial-phone-review-fixes.test.js.
  "libs/tutorial-tours": { armed() {}, markSeen() {}, mobileToursOn: () => true },
  "desk/tutorial/tours": {
    tour: () => ({ id: "chat", flag: "chat", mark_on: "success", steps: [{ kind: "tutorial_chat", screens: 5 }] }),
  },
  "desk/tutorial/host-kit": require(path.join(SRC, "modules/desk/tutorial/host-kit.js")),
  "desk/tutorial/layout": require(path.join(SRC, "modules/desk/tutorial/layout.js")),
  "libs/hotkeys": { register: (d) => d, unregister() {} },
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};
global._ = { isFunction: (f) => typeof f === "function" };
global._a = { content: "content", service: "service" };
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
  ensurePart(n) { return Promise.resolve(this.parts && this.parts[n]); }
  getPart(n) { return this.parts && this.parts[n]; }
  warn() {}
};
let vw = 390;
global.window = { get innerWidth() { return vw; }, innerHeight: 844, matchMedia: () => ({ matches: true }) };
const { relayoutStep } = require(path.join(SRC, "modules/desk/tutorial/layout.js"));
const Host = require(path.join(SRC, "builtins/window/tutorial/index.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["_", "_a", "LetcBox", "window"]) delete global[k];
});

function step(layout) {
  const m = { layout };
  return {
    renders: 0, _screenIndex: 3,
    mget: (k) => m[k], mset: (k, v) => { m[k] = v; },
    _showScreen() { this.renders++; },
  };
}

test("relayoutStep: no-op when unchanged, re-renders on flip, keeps the screen index", () => {
  const s = step("phone");
  assert.equal(relayoutStep(s, "phone"), false);
  assert.equal(s.renders, 0);
  assert.equal(relayoutStep(s, "desk"), true);
  assert.equal(s.mget("layout"), "desk");
  assert.equal(s.renders, 1);
  assert.equal(s._screenIndex, 3);
});

test("window host: payloads carry the viewport layout", () => {
  vw = 390;
  const h = new Host({ tour: "chat" });
  h.initialize({});
  assert.equal(h._widgets[0].layout, "phone");
  vw = 1280;
  const d = new Host({ tour: "chat" });
  d.initialize({});
  assert.equal(d._widgets[0].layout, "desk");
});

test("window host: a flip relayouts the mounted step and later payloads", () => {
  vw = 390;
  const h = new Host({ tour: "chat" });
  h.initialize({});
  const s = step("phone");
  h.parts = { content: { children: { last: () => s } } };
  h.el = { dataset: {}, classList: { add() {} }, getBoundingClientRect: () => ({ width: 390, height: 844 }), style: {} };
  vw = 900;
  h._applyLayout();
  assert.equal(h.el.dataset.layout, "desk");
  assert.equal(h.el.dataset.touch, "1");
  assert.equal(s.mget("layout"), "desk");
  assert.equal(h._widgets[0].layout, "desk");
});

test("desk ignores mobile-close-drawer while a tour is up", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/index.js"), "utf8");
  const i = src.indexOf('case "mobile-close-drawer":');
  const body = src.slice(i, i + 400);
  assert.match(body, /dataset\.deskTour \|\| this\.el\.dataset\.windowTour/);
});

test("phone host owns the viewport above the mobile chrome", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/tutorial/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.tutorial-main\[data-layout=phone\] \{[^}]*z-index: 100001/);
  assert.match(css, /\.tutorial-main\[data-layout=phone\] \{[^}]*--pane-fit: 1/);
});
