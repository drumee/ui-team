// libs/progress-fill: a re-fed view's new fill starts where the last one stood.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { animateFill } = require(path.join(__dirname, "../src/drumee/libs/progress-fill.js"));

function fill(width) {
  const writes = [];
  const style = {};
  let w = width;
  Object.defineProperty(style, "width", { get: () => w, set: (v) => { w = v; writes.push(v); } });
  const el = { style, writes, reads: 0 };
  Object.defineProperty(el, "offsetWidth", { get: () => { el.reads += 1; return 1; } });
  return el;
}
const root = (el) => ({ querySelector: () => el });

test("first fill is left alone; the next one runs from the last width", () => {
  const memo = {};
  const a = fill("0%");
  animateFill(root(a), ".f", memo);
  assert.deepEqual(a.writes, []);
  assert.equal(memo.width, "0%");

  const b = fill("100%");
  animateFill(root(b), ".f", memo);
  assert.deepEqual(b.writes, ["0%", "100%"], "start width, then the target");
  assert.equal(b.reads, 1, "start width committed before the target");
  assert.equal(b.style.width, "100%");
  assert.equal(memo.width, "100%");
});

test("same width: nothing to animate; no fill: memory cleared", () => {
  const memo = { width: "40%" };
  const a = fill("40%");
  animateFill(root(a), ".f", memo);
  assert.deepEqual(a.writes, []);
  animateFill(root(null), ".f", memo);
  assert.equal(memo.width, null);
});
