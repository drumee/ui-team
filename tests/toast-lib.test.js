// libs/toast — Settings' transient toast as a shared helper.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.Skeletons = {
  Note: (o) => ({ note: o }),
  Box: { X: (o) => o },
  Image: { Svg: (o) => ({ svg: o }) },
};
global.document = { querySelector: () => null };
const { showToast, clearToast, TOAST_MS } = require(path.join(__dirname, "..", "src/drumee/libs/toast"));

const slot = () => ({ el: { style: {} }, feed(x) { (this.fed = this.fed || []).push(x); } });
const host = () => ({ fig: { family: "invite-popup" }, isDestroyed: () => false });

test("feeds the card, then empties the slot after TOAST_MS", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = host();
  const s = slot();
  showToast(h, { part: s, message: "Copied" });
  const card = s.fed[0];
  assert.equal(card.className, "invite-popup__toast invite-popup__toast--success");
  assert.equal(card.kids[0].svg.ico, "app-check");
  assert.equal(card.kids[1].note.content, "Copied");
  t.mock.timers.tick(TOAST_MS);
  assert.deepEqual(s.fed[1], []);
});

test("a second toast restarts the timer instead of being cut short", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = host();
  const s = slot();
  showToast(h, { part: s, message: "one" });
  t.mock.timers.tick(TOAST_MS - 100);
  showToast(h, { part: s, message: "two", kind: "error" });
  t.mock.timers.tick(200);
  assert.equal(s.fed.length, 2, "first timer must not clear the second toast");
  assert.equal(s.fed[1].kids[0].svg.ico, "apps-warning");
});

test("clearToast drops the pending timer; no slot is a no-op", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = host();
  const s = slot();
  showToast(h, { part: s, message: "x" });
  clearToast(h);
  t.mock.timers.tick(TOAST_MS);
  assert.equal(s.fed.length, 1);
  assert.doesNotThrow(() => showToast(h, { part: null, message: "x" }));
});
