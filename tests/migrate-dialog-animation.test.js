// The import card's entrance is gated on a flag, and the flag is the whole
// mechanism.
//
// Every screen change rebuilds the step's body (`feed` in migrate/index.js), so
// the card is a NEW element on each of the three dialog screens. An entrance
// declared on the card itself would therefore replay three times on the way
// through the form — read as a flicker, not a transition. `enter` is what says
// "this is the screen where the card arrives", and only that screen animates.
//
// Asserted on the descriptor tree because the alternative is a screenshot: the
// bug is a missing attribute, and a missing attribute renders perfectly.
const test = require("node:test");
const assert = require("node:assert/strict");
const { renderModule, find } = require("./helpers/render-skeleton.js");

const STEP = "src/drumee/modules/desk/tutorial/migrate/skeleton/index.js";
const ui = { fig: { family: "tutorial-migrate", group: "tutorial" }, mget: () => null };

const card = (screen, state) => find(renderModule(STEP, ui, screen, state), "tutorial-migrate__dialog");

test("the card animates in on the screen where it arrives", () => {
  const el = card({ dialog: true }, { enter: true });
  assert.ok(el, "the dialog screen draws a card");
  assert.equal(el.dataset.enter, 1);
  // The CSS selects on the ATTRIBUTE, not the dataset — a Skeletons node needs
  // both, and shipping only one is silent.
  assert.equal(el.attrOpt["data-enter"], 1);
});

test("it does not animate between two dialog screens", () => {
  const el = card({ dialog: true, copied: true }, { enter: false });
  assert.equal(el.dataset.enter, 0);
  assert.equal(el.attrOpt["data-enter"], 0);
});

test("a screen that says nothing about it does not animate", () => {
  // _showScreen always passes the flag, but a caller that forgets must fail
  // closed — a card that never animates is a missing flourish; one that
  // animates on every screen is a flicker the user reports as a bug.
  const el = card({ dialog: true }, {});
  assert.equal(el.dataset.enter, 0);
});

test("the pane screens draw no card at all", () => {
  assert.equal(card({ pane: true }, { enter: true }), null);
});
