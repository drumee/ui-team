// The curtain the work area shows while a rail tour is coming up.
//
// It is a screen with no controls, so what is worth pinning is the two things
// that are silent when wrong: that it draws all of its parts, and that the ONE
// piece of state it shares with the tour is wired both ways. A curtain that
// goes up and never comes down hides the whole app.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { renderModule, find } = require("./helpers/render-skeleton.js");

const ROOT = join(__dirname, "..");
const SKEL = "src/drumee/modules/desk/tour-intro/skeleton/index.js";
const ui = { fig: { family: "desk-tour-intro" }, mget: () => null };

test("it draws the logo, the pill and both lines", () => {
  const t = renderModule(SKEL, ui);
  for (const cls of [
    "desk-tour-intro__main",
    "desk-tour-intro__logo",
    "desk-tour-intro__pill",
    "desk-tour-intro__line",
  ]) {
    assert.ok(find(t, cls), `${cls} is missing`);
  }
});

test("the second line is the accented one", () => {
  const t = renderModule(SKEL, ui);
  const accent = find(t, "desk-tour-intro__line--accent");
  assert.ok(accent, "no accent line");
  // Both classes, because the skin styles the base and only re-colours here.
  assert.match(accent.className, /desk-tour-intro__line\b/);
});

test("nothing on it is pressable", () => {
  // A curtain the user can click is a curtain that will be clicked. The tour
  // drawn over it owns every control on screen.
  const src = readFileSync(join(ROOT, SKEL), "utf8");
  assert.ok(!/service:/.test(src), "the curtain must raise no service");
  assert.ok(!/uiHandler/.test(src), "and route nothing");
});

test("the curtain and the tour share one piece of state, wired both ways", () => {
  const desk = readFileSync(join(ROOT, "src/drumee/modules/desk/index.js"), "utf8");
  const skin = readFileSync(join(ROOT, "src/drumee/modules/desk/skin/index.scss"), "utf8");

  // Revealed by the stamp, and by nothing else.
  assert.match(skin, /\.desk-module\[data-window-tour="1"\][\s\S]{0,400}__tour-intro-slot/);
  // Hidden by default: a Skeletons.Box is never CSS-empty (its emptyView
  // renders an element), so `:empty` would leave it laid out over the pane.
  assert.match(skin, /&__tour-intro-slot \{\s*\n\s*display: none;/);

  // Raised on the click...
  assert.match(desk, /_showTourCurtain\(\);/);
  // ...and taken down on BOTH exits: no tour raised, and the tour finishing.
  // The second is the one that matters — a tour claimed but never mounted
  // registers no destroy handler, so whenDone is the only thing left.
  const body = desk.slice(desk.indexOf("async _railTabWithTour("));
  const scope = body.slice(0, body.indexOf("\n  }\n"));
  assert.equal(
    (scope.match(/_hideTourCurtain\(\)/g) || []).length,
    2,
    "the curtain must come down whether or not a tour was raised",
  );
});
