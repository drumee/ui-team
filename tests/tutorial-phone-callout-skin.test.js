// The phone callout (Figma 380:53148 flows) and the phone scrim.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const compile = (f) => sass.compile(path.join(SRC, f), { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
const tip = compile("modules/desk/tutorial/skin/tooltip.scss");
const spot = compile("modules/desk/tutorial/spotlight/skin/index.scss");

test("phone card is no longer forced into a bottom sheet", () => {
  assert.doesNotMatch(tip, /\[data-size=mobile\] \.tutorial__bubble-card \{[^}]*bottom: 12px !important/);
});

test("phone card: Figma radius and padding", () => {
  assert.match(tip, /\[data-layout=phone\] \.tutorial__bubble-card \{[^}]*padding: 24px[^}]*border-radius: 12px/);
});

test("phone card: Figma title size", () => {
  assert.match(tip, /\[data-layout=phone\] \.tutorial__bubble-title[^{]*\{[^}]*font-size: 20px/);
});

test("phone beak follows --beak-px", () => {
  assert.match(tip, /\[data-layout=phone\] \.tutorial__bubble-card\[data-direction=north\]::after[^{]*\{[^}]*left: var\(--beak-px/);
});

test("phone scrim is 20% black", () => {
  assert.match(spot, /\[data-layout=phone\][^{]*\[data-scrim="1"\][^{]*\{[^}]*rgba\(0, 0, 0, 0\.2\)/);
});
