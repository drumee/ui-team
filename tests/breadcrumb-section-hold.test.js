// breadcrumb-section-hold.test.js — a section label outlives late path paints.
//
//   node --test tests/breadcrumb-section-hold.test.js
//
// On a reload the saved screen (Trash, Calendar…) opens while the workspace's
// get_path is still in flight, and its answer — plus the pane's mirror of it —
// used to repaint the workspace icon and name over the section label a moment
// after it appeared. The hold refuses those path paints while the section is
// opening or its screen is still up; a deliberate exit releases it.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createSectionHold,
  OPENING_MS,
} = require("../src/drumee/modules/desk/breadcrumb/section-hold");

function clock(start = 1000) {
  let t = start;
  return {
    now: () => t,
    advance(ms) {
      t += ms;
    },
  };
}

const label = [{ filename: "Trash" }];
const opt = { section: true, ico: "top-trash" };

test("the opening window is 5s", () => {
  assert.equal(OPENING_MS, 5000);
});

test("nothing held: path paints go through", () => {
  const hold = createSectionHold({ now: clock().now, screenUp: () => null });
  assert.equal(hold.holds(), false);
  assert.equal(hold.current(), null);
});

test("while the section is opening, path paints are refused even before its screen reports up", () => {
  const c = clock();
  const hold = createSectionHold({ now: c.now, screenUp: () => null });
  hold.enter(label, opt);
  c.advance(OPENING_MS - 1);
  assert.equal(hold.holds(), true);
});

test("after the opening window, it holds only while the screen is up", () => {
  const c = clock();
  let up = "toggle-trash";
  const hold = createSectionHold({ now: c.now, screenUp: () => up });
  hold.enter(label, opt);
  c.advance(OPENING_MS);
  assert.equal(hold.holds(), true);
  up = null; // the screen closed itself (its own ✕, an outside click)
  assert.equal(hold.holds(), false);
});

test("a deliberate exit releases it at once, inside the opening window too", () => {
  const hold = createSectionHold({ now: clock().now, screenUp: () => "toggle-trash" });
  hold.enter(label, opt);
  hold.leave();
  assert.equal(hold.holds(), false);
  assert.equal(hold.current(), null);
});

test("remembers what it holds, for a remounted breadcrumb to repaint", () => {
  const hold = createSectionHold({ now: clock().now, screenUp: () => null });
  hold.enter(label, opt);
  assert.deepEqual(hold.current(), { data: label, opt });
});

test("entering again restarts the opening window", () => {
  const c = clock();
  const hold = createSectionHold({ now: c.now, screenUp: () => null });
  hold.enter(label, opt);
  c.advance(OPENING_MS - 10);
  hold.enter([{ filename: "Settings" }], { section: true });
  c.advance(OPENING_MS - 10);
  assert.equal(hold.holds(), true);
  assert.equal(hold.current().data[0].filename, "Settings");
});

test("a throwing screen probe fails open (the path paints, as before)", () => {
  const c = clock();
  const hold = createSectionHold({
    now: c.now,
    screenUp: () => {
      throw new Error("desk not ready");
    },
  });
  hold.enter(label, opt);
  c.advance(OPENING_MS);
  assert.equal(hold.holds(), false);
});
