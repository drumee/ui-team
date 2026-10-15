// Every phone tour callout carries Back except on a tour's very first screen,
// and the workspace tour hands on to migrate (confetti) as the desk one does —
// a preview run included.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const SRC = path.join(__dirname, "..", "src/drumee");
const T = path.join(SRC, "modules/desk/tutorial");
const load = Module._load;
Module._load = function (r, p, m) {
  if (r === "./skin" || r === "builtins/widget/migrate-gdrive-popup/skin") return {};
  if (/^assets\//.test(r)) return `asset:${r}`;
  if (r === "media/grid/template/folder") return () => "";
  if (r === "libs/billing") return { planLabel: () => "Plan" };
  if (r === "libs/tutorial-tours") return { armed() {}, markSeen() {}, mobileToursOn: () => false };
  if (/^libs\//.test(r)) return load.call(this, path.join(SRC, r), p, m);
  return load.call(this, r, p, m);
};
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({ content: "content" }, { get: (t, k) => t[k] ?? String(k) });
global._e = { upload: "upload", destroy: "destroy" };
global._ = require("lodash");
global.requestAnimationFrame = (cb) => cb();
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; this._on = {}; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
  feed() {}
  ensurePart() { return Promise.resolve({ el: { scrollIntoView() {} } }); }
  getPart() { return null; }
  isDestroyed() { return false; }
  once(ev, cb) { this._on[ev] = cb; }
  triggerHandlers(a) { (this.raised = this.raised || []).push(a); }
  warn() {}
};
test.after(() => {
  Module._load = load;
  for (const k of ["Skeletons", "LOCALE", "_a", "_e", "_", "LetcBox", "requestAnimationFrame"]) delete global[k];
});
const focus = (s) => (s.raised || []).filter((a) => a.service === "spotlight:focus").pop();

function step(file, model, at) {
  const C = require(path.join(T, file));
  const s = new C({ layout: "phone", ...model });
  s.initialize({});
  s.fig = { family: "tutorial-x", group: "tutorial" };
  s._screenIndex = at;
  return s;
}

test("share: Back on every phone screen but the tour's first", async () => {
  const SCREENS = require(path.join(T, "share/screens.js"));
  const first = step("share/index.js", { is_first: true, is_last: true }, 0);
  await first._focusOnPhone(SCREENS[0], { el: { scrollIntoView() {} } });
  assert.equal(focus(first).tooltip.hide_back, true);
  const later = step("share/index.js", { is_first: true, is_last: true }, 2);
  await later._focusOnPhone(SCREENS[2], { el: { scrollIntoView() {} } });
  assert.equal(focus(later).tooltip.hide_back, false);
});

test("migrate: the phone pane has Back when it is not the tour's first screen (inside `full`)", async () => {
  const solo = step("migrate/index.js", { is_first: true, is_last: true }, 0);
  await solo._showScreen();
  assert.equal(focus(solo).tooltip.hide_back, true);
  const inFull = step("migrate/index.js", { is_first: false, is_last: true }, 0);
  await inFull._showScreen();
  assert.equal(focus(inFull).tooltip.hide_back, false);
});

test("workspace: Back on the internal/external screens too", async () => {
  const s = step("workspace/index.js", { screen_count: 7, is_first: true, is_last: true }, 2);
  s._bindPhoneName = () => {};
  await s._showScreen();
  assert.equal(focus(s).tooltip.hide_back, false);
});

test("hand-off: a preview workspace tour still hands on to migrate, as a preview", () => {
  global.Visitor = { id: "u1" };
  try {
    const Desk = require(path.join(T, "index.js"));
    const h = new Desk({ tour: "workspace", preview: 1 });
    h.initialize({});
    const calls = [];
    const pane = { isDestroyed: () => false, showTutorial: (t, o) => calls.push([t, o]) };
    h._chainMigrateTour(pane);
    h._on.destroy();
    assert.deepEqual(calls, [["migrate", { celebrate: 1, preview: 1 }]]);
  } finally {
    delete global.Visitor;
  }
});

test("hand-off: a real run hands on without preview (the seen-set still applies)", () => {
  const Desk = require(path.join(T, "index.js"));
  const h = new Desk({ tour: "workspace" });
  h.initialize({});
  const calls = [];
  h._chainMigrateTour({ isDestroyed: () => false, showTutorial: (t, o) => calls.push([t, o]) });
  h._on.destroy();
  assert.deepEqual(calls, [["migrate", { celebrate: 1 }]]);
});
