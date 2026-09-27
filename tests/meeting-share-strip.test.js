const test = require("node:test");
const assert = require("node:assert/strict");
const { planShareStrip, SLOTS } = require("../src/drumee/builtins/webrtc/share-strip");

const tiles = (n, focused = -1) => Array.from({ length: n }, (_, i) => ({ focused: i === focused }));

test("up to four people: everyone gets a slot, no +N", () => {
  for (let n = 1; n <= SLOTS; n++) {
    const p = planShareStrip(tiles(n));
    assert.equal(p.more, 0);
    assert.ok(p.visible.every(Boolean));
  }
});

test("more than four: three faces plus a +N tile", () => {
  const p = planShareStrip(tiles(7));
  assert.equal(p.visible.filter(Boolean).length, 3);
  assert.equal(p.more, 4);
});

test("the spotlighted tile takes slot one, even when it would be folded", () => {
  const p = planShareStrip(tiles(7, 6));
  assert.equal(p.rank[6], 0);
  assert.equal(p.visible[6], true);
  // The others keep join order behind it.
  assert.deepEqual([p.rank[0], p.rank[1], p.rank[2]], [1, 2, 3]);
  assert.equal(p.visible[2], false);
});

test("empty input is harmless", () => {
  assert.deepEqual(planShareStrip([]), { rank: [], visible: [], more: 0 });
  assert.deepEqual(planShareStrip(undefined), { rank: [], visible: [], more: 0 });
});
