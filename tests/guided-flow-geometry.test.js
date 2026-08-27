/**
 * libs/guided-flow/geometry — the box the spotlight cuts when a step's surface
 * is really two elements.
 *
 * The cutout has exactly one hole, so the invite popup plus whichever of its
 * dropdowns is open have to be unioned into a single box. Getting this wrong is
 * visible: too small and an open list sits half-lit and half in the dim, too
 * large and a band of undimmed desk shows beside the popup.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { unionRects } = require("../src/drumee/libs/guided-flow/geometry");

/** A DOMRect-alike. */
function rect(left, top, width, height) {
  return {
    left, top, width, height, right: left + width, bottom: top + height,
  };
}

// The popup itself, roughly its real size.
const POPUP = rect(490, 200, 420, 260);

test("no dropdowns open → the popup's own box, unchanged", () => {
  assert.deepEqual(unionRects(POPUP, []), {
    left: 490, top: 200, right: 910, bottom: 460, width: 420, height: 260,
  });
});

test("the rects argument is optional", () => {
  assert.deepEqual(unionRects(POPUP), unionRects(POPUP, []));
});

test("a dropdown hanging below the popup extends the box downwards", () => {
  // `top: calc(100% + 4px)` — flush under the popup, same width.
  const suggestions = rect(490, 464, 420, 180);
  const box = unionRects(POPUP, [suggestions]);
  assert.equal(box.top, 200);        // popup's top survives
  assert.equal(box.bottom, 644);     // grown to the list's bottom
  assert.equal(box.height, 444);
  assert.equal(box.left, 490);
  assert.equal(box.width, 420);
});

test("a dropdown wider than the popup extends it sideways too", () => {
  const roleMenu = rect(860, 300, 180, 120);
  const box = unionRects(POPUP, [roleMenu]);
  assert.equal(box.left, 490);
  assert.equal(box.right, 1040);
  assert.equal(box.width, 550);
});

test("a dropdown flush to the popup's left edge keeps the box tight", () => {
  // Exactly abutting: nothing to grow.
  const flush = rect(490, 460, 200, 100);
  const box = unionRects(POPUP, [flush]);
  assert.equal(box.left, 490);
  assert.equal(box.right, 910);
  assert.equal(box.bottom, 560);
});

test("several open at once are all taken in", () => {
  const below = rect(500, 464, 300, 120);
  const right = rect(880, 220, 200, 90);
  const above = rect(470, 150, 120, 40);
  const box = unionRects(POPUP, [below, right, above]);
  assert.equal(box.left, 470);
  assert.equal(box.top, 150);
  assert.equal(box.right, 1080);
  assert.equal(box.bottom, 584);
  assert.equal(box.width, 610);
  assert.equal(box.height, 434);
});

test("zero-size rects are ignored, not unioned", () => {
  // A closed dropdown still MEASURES — it is visibility:hidden, not display:none
  // — and some collapse to a zero box at the viewport origin. Unioning one drags
  // the hole up to 0,0 and lights up a quarter of the screen.
  const collapsed = rect(0, 0, 0, 0);
  assert.deepEqual(unionRects(POPUP, [collapsed]), unionRects(POPUP, []));

  const zeroHeight = rect(490, 464, 420, 0);
  assert.deepEqual(unionRects(POPUP, [zeroHeight]), unionRects(POPUP, []));

  const zeroWidth = rect(490, 464, 0, 180);
  assert.deepEqual(unionRects(POPUP, [zeroWidth]), unionRects(POPUP, []));
});

test("a nested rect changes nothing", () => {
  const inside = rect(600, 300, 100, 50);
  assert.deepEqual(unionRects(POPUP, [inside]), unionRects(POPUP, []));
});

test("junk entries are skipped rather than thrown on", () => {
  // querySelectorAll cannot hand us these, but the signature is public and the
  // caller runs inside a MutationObserver where a throw is invisible.
  const good = rect(490, 464, 420, 180);
  assert.deepEqual(
    unionRects(POPUP, [null, undefined, good]),
    unionRects(POPUP, [good]),
  );
});

test("the anchor rect is not mutated", () => {
  const before = { ...POPUP };
  unionRects(POPUP, [rect(0, 0, 2000, 2000)]);
  assert.deepEqual(POPUP, before);
});
