// Task and meeting tours, phone layout (Figma flows "Task" 386:57322 and
// "Meet" 386:58198 / 386:58622): a hero, a swipe deck, no timer.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const SRC = path.join(__dirname, "..", "src/drumee");
const T = path.join(SRC, "modules/desk/tutorial");
const ALIASES = {
  "media/grid/template/folder": () => ({ type: "folderArt" }),
  "libs/billing": { planLabel: () => "Plan" },
};
const baseLoad = Module._load;
Module._load = function (r, p, m) {
  if (/^assets\//.test(r)) return "asset.png"; // webpack asset modules
  return Object.prototype.hasOwnProperty.call(ALIASES, r) ? ALIASES[r] : baseLoad.call(this, r, p, m);
};

const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global._ = require("lodash");
test.after(() => { Module._load = baseLoad; for (const k of ["Skeletons", "LOCALE", "_a", "_"]) delete global[k]; });

const ui = { fig: { family: "tutorial-x", group: "tutorial" }, mget: () => null };
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};

for (const [step, tab, cards] of [["task", "task", 5], ["meeting", "meet", 2]]) {
  test(`${step}: the screen has a phone entry targeting the CTA`, () => {
    const S = require(path.join(T, step, "screens.js"));
    assert.equal(S.length, 1);
    assert.equal(S[0].phone.target, "ph-cta");
  });

  test(`${step}: phone hero — CTA advances, ${cards} dots, ${tab} tab lit`, () => {
    const view = require(path.join(T, step, "skeleton/phone.js"));
    const tree = view(ui, { index: 0 });
    assert.equal(find(tree, "ph-cta").service, "next-step");
    assert.equal(find(tree, "ph-dots").kids.length, cards);
    assert.equal(find(tree, `ph-tab-${tab}`).dataset.active, "1");
  });

  test(`${step}: no auto-advance on a phone`, () => {
    const load = Module._load;
    Module._load = function (r, p, m) {
      if (r === "./skin") return {};
      if (r === "./skeleton") return Object.assign(() => ({}), { VIEWS: [1, 2, 3, 4, 5], ITEMS: [1, 2] });
      return load.call(this, r, p, m);
    };
    global.LetcBox = class {
      constructor(m = {}) { this._m = { ...m }; }
      initialize() {}
      declareHandlers() {}
      mget(k) { return this._m[k]; }
    };
    const realTimeout = global.setTimeout;
    let armed = 0;
    global.setTimeout = () => { armed++; return 0; };
    try {
      const Step = require(path.join(T, step, "index.js"));
      const s = new Step({ layout: "phone" });
      s.initialize({});
      s._armAutoSlide();
      assert.equal(armed, 0);
      const d = new Step({ layout: "desk" });
      d.initialize({});
      d._armAutoSlide();
      assert.equal(armed, 1, "desk still slides");
    } finally {
      global.setTimeout = realTimeout;
      Module._load = load;
      delete global.LetcBox;
    }
  });
}

test("task phone (386:57322): frame's well pictures, captions, + on the CTA", () => {
  const tree = require(path.join(T, "task/skeleton/phone.js"))(ui, {});
  const json = JSON.stringify(tree);
  assert.equal((json.match(/tutorial-task__ph-well-img/g) || []).length, 5);
  assert.match(json, /TASK_CARD_BOARD/);
  assert.match(json, /TASK_CARD_HEALTH/);
  const cta = find(tree, "ph-cta");
  assert.ok(cta.className.includes("tutorial-phone__hero-cta--ico"));
  assert.equal(cta.service, "next-step");
  assert.equal(tree.dataset.view, "task");
});

test("meeting phone (386:58198 / 386:58622): frame wells, camera tile, CTA", () => {
  const tree = require(path.join(T, "meeting/skeleton/phone.js"))(ui, {});
  const json = JSON.stringify(tree);
  assert.equal((json.match(/tutorial-meeting__ph-well-img/g) || []).length, 2);
  assert.equal((json.match(/tutorial-meeting__ph-feature-glyph/g) || []).length, 2);
  assert.match(json, /INSTANT_MEETING_HINT/);
  assert.match(json, /SCHEDULE_MEETING_HINT/);
  assert.equal(find(tree, "ph-cta").service, "next-step");
  assert.equal(tree.dataset.view, "meeting");
});
