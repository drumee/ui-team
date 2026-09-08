// The in-window tour's shell.
//
// It is one decision made visible: the shell wears BOTH class sets. Its own
// `window-tutorial__*` classes carry the overlay geometry, and the
// `tutorial-main*` classes are what make every existing tutorial skin apply
// without a single selector being edited —
//
//   .tutorial-main[data-size]   the responsive tiers and --pane-fit
//                               (modules/desk/tutorial/skin/index.scss:620-676)
//   .tutorial-main[data-size] .tutorial__bubble-card
//                               (skin/tooltip.scss:415)
//   .tutorial-main__content > .tutorial__ui
//                               the scale that fits a dense mock into the pane
//   tutorial-main__layout       the hard stop for the spotlight's ancestor
//                               walk (spotlight/index.js:77) — without it the
//                               walk climbs into the folder window and starts
//                               lifting real chrome out of the scrim
//
// Drop any one of these class names and the tour still renders, wrong, with no
// error. That is why they are asserted by name.
const test = require("node:test");
const assert = require("node:assert/strict");
const { renderModule, find, hasClass, childrenWithClass } =
  require("./helpers/render-skeleton.js");

const SKEL = "src/drumee/builtins/window/tutorial/skeleton/index.js";
const ui = { fig: { family: "window-tutorial", group: "window" }, mget: () => null };

const tree = () => renderModule(SKEL, ui);

test("the root is the layout, wearing both class sets", () => {
  const root = tree();
  assert.ok(hasClass(root, "window-tutorial__layout"));
  assert.ok(hasClass(root, "tutorial-main__layout"));
});

test("the content slot wears both class sets and is the content part", () => {
  const slot = find(tree(), "tutorial-main__content");
  assert.ok(slot, "no node carries tutorial-main__content");
  assert.ok(hasClass(slot, "window-tutorial__content"));
  assert.equal(slot.sys_pn, "content");
});

test("the content slot starts EMPTY", () => {
  // The host feeds step 0 from the registry once the shell has mounted.
  // Planting a kind here hardcodes step one, and every tour opens on it
  // regardless of which tour was asked for — the bug the desk shell had.
  const slot = find(tree(), "tutorial-main__content");
  assert.equal([].concat(slot.kids || []).length, 0);
});

test("the spotlight is a direct child of the layout", () => {
  const root = tree();
  const kids = [].concat(root.kids || []);
  const spot = kids.find((k) => k && k.kind === "tutorial_spotlight");
  assert.ok(spot, "tutorial_spotlight is not a direct child of the layout");
  assert.equal(spot.sys_pn, "spotlight");
  assert.equal(spot.partHandler, ui);
});

test("the spotlight comes AFTER the content, so it paints over it", () => {
  const kids = [].concat(tree().kids || []);
  const iContent = kids.findIndex((k) => k && hasClass(k, "tutorial-main__content"));
  const iSpot = kids.findIndex((k) => k && k.kind === "tutorial_spotlight");
  assert.ok(iContent > -1 && iSpot > -1);
  assert.ok(iSpot > iContent, "the spotlight must be later in DOM order");
});

test("the content slot is a DIRECT child of the layout", () => {
  // `.tutorial-main__content > .tutorial__ui` is a child combinator: a wrapper
  // between the layout and the slot would silently kill --pane-fit.
  assert.equal(childrenWithClass(tree(), "tutorial-main__content").length, 1);
});

test("no mock chrome", () => {
  // The real folder window is underneath. A mock rail or topbar here would be
  // a second copy of chrome the user can already see.
  const { walk } = require("./helpers/render-skeleton.js");
  for (const n of walk(tree())) {
    const cls = typeof n.className === "string" ? n.className : "";
    assert.ok(!/__sb-/.test(cls), `mock rail node: ${cls}`);
    assert.ok(!/__tb-/.test(cls), `mock topbar node: ${cls}`);
  }
});
