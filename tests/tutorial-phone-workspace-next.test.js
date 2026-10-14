// The phone name screen (380:54800) and create screen (385:1226) carry a Next
// button; on a run that may create, Next on the create screen creates.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const SRC = path.join(__dirname, "..", "src/drumee");
const T = path.join(SRC, "modules/desk/tutorial");
const load = Module._load;
Module._load = function (r, p, m) {
  if (r === "./skin") return {};
  if (/^assets\//.test(r)) return `asset:${r}`;
  if (r === "media/grid/template/folder") return () => "";
  if (r === "libs/billing") return { planLabel: () => "Plan" };
  return load.call(this, r, p, m);
};
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global._K = { privilege: { write: 4 } };
global._ = require("lodash");
global.Visitor = { id: "u1", firstname: () => "A", lastname: () => "B" };
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
  feed() {}
  ensurePart() { return Promise.resolve({ el: {} }); }
  getPart() { return null; }
  isDestroyed() { return false; }
  triggerHandlers(a) { (this.raised = this.raised || []).push(a); }
  warn() {}
};
const Step = require(path.join(T, "workspace/index.js"));
test.after(() => {
  Module._load = load;
  for (const k of ["Skeletons", "LOCALE", "_a", "_K", "_", "Visitor", "LetcBox"]) delete global[k];
});

function make(screens, at) {
  const s = new Step({ layout: "phone", screen_count: screens, is_first: true, is_last: true });
  s.initialize({});
  s._screenIndex = at;
  s._bindPhoneName = () => {};
  s.fig = { family: "tutorial-workspace", group: "tutorial" };
  return s;
}
const focus = (s) => s.raised.filter((a) => a.service === "spotlight:focus").pop();

for (const [label, screens] of [["live run", 7], ["preview/full", 5]]) {
  test(`${label}: name screen shows a Next button`, async () => {
    const s = make(screens, 1);
    await s._showScreen();
    const t = focus(s).tooltip;
    assert.equal(t.hide_next, undefined);
    assert.equal(t.hide_back, false, "Back on every phone screen but the first");
    assert.equal(t.align, "center");
  });

  test(`${label}: create screen shows a Next button`, async () => {
    const s = make(screens, 4);
    await s._showScreen();
    assert.equal(focus(s).tooltip.hide_next, undefined);
  });
}

test("live run: Next on the create screen creates", async () => {
  const s = make(7, 4);
  await s._showScreen();
  let created = 0;
  s._create = () => { created++; };
  s.onUiEvent({ mget: () => null }, { service: "next-step" });
  assert.equal(created, 1);
});

test("live run: Next on the name screen advances (keeping the name)", async () => {
  const s = make(7, 1);
  await s._showScreen();
  let advanced = 0;
  s._advance = () => { advanced++; };
  s.onUiEvent({ mget: () => null }, { service: "next-step" });
  assert.equal(advanced, 1);
});

test("preview: Next on the create screen just advances", async () => {
  const s = make(5, 4);
  await s._showScreen();
  let created = 0, advanced = 0;
  s._create = () => { created++; };
  s._advance = () => { advanced++; };
  s.onUiEvent({ mget: () => null }, { service: "next-step" });
  assert.equal(created, 0);
  assert.equal(advanced, 1);
});
