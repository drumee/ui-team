// tests/tasks-quick-open-subtask-backdrop.test.js — Personal Calendar quick-open
// card: closing a subtask opened from its parent's detail panel walks back to
// the parent. The walk back cut the child's backdrop out with an inline
// `display: none` (_dismissOverlay's instant path); the quick-open card
// repaints through _render's patcher (it mounts only one of the overlay
// wrappers), which KEEPS that element — so the parent was drawn inside a
// hidden backdrop while the calendar's modal stayed up: a backdrop with no
// card. Opening a detail now clears any stale exit state on its backdrop.
//
//   node --test tests/tasks-quick-open-subtask-backdrop.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/tasks/index.js"),
  "utf8",
);
/* eslint-disable no-unused-vars */
const OVERLAY_EXIT_MS = 0;
/* eslint-enable no-unused-vars */
const dismiss = eval(`(${sliceFunction(SRC, "_dismissOverlay(cls, done)")})`);
const revive = eval(`(${sliceFunction(SRC, "_reviveOverlay(cls)")})`);

function panelWithBackdrop() {
  const backdrop = { style: {}, dataset: {} };
  return {
    backdrop,
    fig: { family: "tasks-panel" },
    el: { querySelector: (sel) => (sel === ".tasks-panel__detail-backdrop" ? backdrop : null) },
    _prefersReducedMotion: () => false,
    _cancelPendingExit() {},
  };
}

test("a walk back hides the kept backdrop; reopening shows it again", () => {
  const p = panelWithBackdrop();
  dismiss.call(p, "detail-backdrop"); // instant path: the walk back
  assert.equal(p.backdrop.style.display, "none");
  revive.call(p, "detail-backdrop"); // the parent opens into the same element
  assert.equal(p.backdrop.style.display, "");
  assert.equal(p.backdrop.dataset.closing, undefined);
});

test("an exit interrupted by a reopen does not keep fading out", () => {
  const p = panelWithBackdrop();
  dismiss.call(p, "detail-backdrop", () => {}); // animated path
  assert.equal(p.backdrop.dataset.closing, "1");
  revive.call(p, "detail-backdrop");
  assert.equal(p.backdrop.dataset.closing, undefined);
});

test("no backdrop on screen: revive is a no-op", () => {
  const p = panelWithBackdrop();
  p.el = { querySelector: () => null };
  assert.doesNotThrow(() => revive.call(p, "detail-backdrop"));
});

test("_openDetail revives the backdrop right after it paints", () => {
  const body = sliceFunction(SRC, "_openDetail(id)");
  const paint = body.indexOf("this._renderOverlays();");
  const rev = body.indexOf('this._reviveOverlay("detail-backdrop");');
  assert.ok(paint > 0 && rev > paint, "revive follows the paint");
});
