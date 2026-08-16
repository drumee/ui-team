/**
 * libs/guided-flow/anchor — where a guide's coach callout lands.
 *
 * This geometry decided the placement of every coach in the reward flow while
 * it sat as two methods on a LetcBox subclass, where nothing could reach it.
 * Extracting it is what makes these cases checkable.
 *
 * `left` is the coach's CENTRE throughout: the skins translate it -50% on X.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  coachAnchor, coachCenter, M, TOP, CH, CW,
} = require("../src/drumee/libs/guided-flow/anchor");

const VIEW = { vw: 1280, vh: 800 };

/** A DOMRect-alike. */
function rect(left, top, width, height) {
  return {
    left, top, width, height, right: left + width, bottom: top + height,
  };
}

const px = (v) => Number.parseFloat(v);

test("coachCenter centres horizontally and vertically", () => {
  const { side, style } = coachCenter(VIEW);
  assert.equal(side, "below");
  assert.equal(px(style.left), 640);
  assert.equal(px(style.top), (800 - CH) / 2);
});

test("coachCenter never rides up under the topbar on a short viewport", () => {
  const { style } = coachCenter({ vw: 1280, vh: 120 });
  assert.equal(px(style.top), TOP);
});

test("a small target with room below gets the coach below it", () => {
  const { side, style } = coachAnchor(rect(600, 100, 40, 32), 620, VIEW);
  assert.equal(side, "below");
  assert.equal(px(style.top), 132 + M);
  assert.equal(px(style.left), 620);
});

test("a small target with no room below flips above", () => {
  // Bottom of the viewport: below would need 156 + 12 more px than there are.
  const { side, style } = coachAnchor(rect(600, 700, 40, 32), 620, VIEW);
  assert.equal(side, "above");
  assert.equal(px(style.top), 700 - M - CH);
});

test("prefAbove wins over a below that would also have fitted", () => {
  const target = rect(600, 400, 40, 32);
  const below = coachAnchor(target, 620, VIEW);
  assert.equal(below.side, "below");

  const above = coachAnchor(target, 620, { ...VIEW, prefAbove: true });
  assert.equal(above.side, "above");
  assert.equal(px(above.style.top), 400 - M - CH);
});

test("prefAbove stands down when there is no room above", () => {
  // Target hard against the topbar: above would be clipped, so below wins
  // despite the preference.
  const { side } = coachAnchor(rect(600, 70, 40, 32), 620, { ...VIEW, prefAbove: true });
  assert.equal(side, "below");
});

test("neither above nor below fits → pinned under the topbar", () => {
  // A SMALL target (140 of a 400px viewport, so under the 60% tall-panel rule)
  // sitting where the coach fits on neither side: below would overrun the
  // bottom, above would be clipped by the topbar.
  const { side, style } = coachAnchor(rect(600, 100, 40, 140), 620, { vw: 1280, vh: 400 });
  assert.equal(side, "below");
  assert.equal(px(style.top), TOP);
});

test("x is clamped so the coach cannot hang off either edge", () => {
  const half = CW / 2;
  const left = coachAnchor(rect(0, 100, 20, 20), 4, VIEW);
  assert.equal(px(left.style.left), M + half);

  const right = coachAnchor(rect(1270, 100, 20, 20), 1278, VIEW);
  assert.equal(px(right.style.left), 1280 - M - half);
});

test("a tall panel puts the coach in the wider margin beside it", () => {
  // Right-hand rail 360 wide, filling the height: the 920px left margin wins.
  const { side, style } = coachAnchor(rect(920, 0, 360, 800), 1100, VIEW);
  assert.equal(side, "left");
  // Just outside the panel's near edge, not centred in the gap.
  assert.equal(px(style.left), 920 - M - CW / 2);
});

test("a tall panel on the left puts the coach on its right", () => {
  const { side, style } = coachAnchor(rect(0, 0, 360, 800), 180, VIEW);
  assert.equal(side, "right");
  assert.equal(px(style.left), 360 + M + CW / 2);
});

test("a tall panel is vertically centred on, and clamped to, the viewport", () => {
  const { style } = coachAnchor(rect(920, 0, 360, 800), 1100, VIEW);
  assert.equal(px(style.top), (800 - CH) / 2);
});

test("a full-width tall panel leaves no margin, so the coach pins below", () => {
  const { side, style } = coachAnchor(rect(0, 0, 1280, 800), 640, VIEW);
  assert.equal(side, "below");
  assert.equal(px(style.top), TOP);
  assert.equal(px(style.left), 640);
});

test("the tall-panel rule triggers past 60% of the viewport height", () => {
  // 480 is exactly 60% — not "past" it, so this is still a small target.
  assert.equal(coachAnchor(rect(600, 0, 40, 480), 620, VIEW).side, "below");
  assert.equal(coachAnchor(rect(900, 0, 380, 481), 1090, VIEW).side, "left");
});
