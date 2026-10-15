// Task tour, phone: the swipe deck advances by itself every 2s (Figma 386:57322).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const SRC = path.join(__dirname, "..", "src/drumee");

const baseLoad = Module._load;
Module._load = function (r, p, m) {
  if (/(^|\/)skin$/.test(r) || /^(builtins|libs|desk|media|assets)\//.test(r)) return new Proxy(function () {}, { get: () => () => ({}) });
  return baseLoad.call(this, r, p, m);
};
global.LetcBox = class { initialize() {} declareHandlers() {} mget() { return null; } };
global.Skeletons = new Proxy({}, { get: () => new Proxy(function () { return {}; }, { get: () => () => ({}) }) });
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global.window = { matchMedia: () => ({ matches: false }) };
const Step = require(path.join(SRC, "modules/desk/tutorial/task/index.js"));
test.after(() => { Module._load = baseLoad; for (const k of ["LetcBox", "Skeletons", "LOCALE", "_a", "window"]) delete global[k]; });

function fakeDeck(n) {
  const on = {};
  return {
    children: Array.from({ length: n }, (_, i) => ({ offsetLeft: 24 + i * 414 })),
    scrolls: [],
    scrollTo(o) { this.scrolls.push(o); },
    addEventListener(t, f) { on[t] = f; },
    removeEventListener(t) { delete on[t]; },
    fire(t) { on[t] && on[t](); },
    on,
  };
}

test("phone deck: one card on every 2s, wrapping after the last", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const step = Object.create(Step.prototype);
  step._card = 0;
  const deck = fakeDeck(5);
  const off = step._armPhoneSlide(deck);
  t.mock.timers.tick(1999);
  assert.equal(deck.scrolls.length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(deck.scrolls[0], { left: 414, behavior: "smooth" });
  step._card = 4; // syncDeck reports the last card
  t.mock.timers.tick(2000);
  assert.equal(deck.scrolls[1].left, 0);
  off();
  t.mock.timers.tick(10000);
  assert.equal(deck.scrolls.length, 2);
  assert.equal(Object.keys(deck.on).length, 0);
});

test("phone deck: a finger on it pauses the timer until release", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const step = Object.create(Step.prototype);
  step._card = 0;
  const deck = fakeDeck(5);
  step._armPhoneSlide(deck);
  deck.fire("pointerdown");
  t.mock.timers.tick(6000);
  assert.equal(deck.scrolls.length, 0);
  deck.fire("pointerup");
  t.mock.timers.tick(2000);
  assert.equal(deck.scrolls.length, 1);
});
