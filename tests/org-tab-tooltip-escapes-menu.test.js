// The org chip's dropdown tooltips have to leave the card they are drawn in.
//
// Both counts in the panel header are bare numbers — "3" and "24" beside a cube
// and a people glyph — so the hover bubble is the only thing that says which is
// which. It was cut to a 4px sliver: ui-core appends the bubble INSIDE the icon
// (letc __addTooltips), the skin drops it 8px below a glyph that sits ~4px above
// the card's bottom padding, and something up the chain was clipping.
//
// Measured in tests/harness/org-tab-tooltip-clip.js — 4.0 of 26.0px visible
// before, 26.0 of 26.0 after, with the closed panel still fully swallowed.
const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const sass = (e) => execFileSync("sass", ["-I", ".", "-I", "skin", "--no-source-map", e],
  { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });

test("the org dropdown's tooltips are not clipped by the menu's own wrapper", () => {
  const css = sass("modules/desk/org-tab/skin/index.scss");

  // The override, and it must be !important: the widget writes
  // `overflow: hidden` as an INLINE style on .menu-topic-items__wrapper, and an
  // inline declaration beats any selector's specificity.
  const i = css.indexOf('.desk-org-tab__wrapper[data-state="1"] .menu-topic-items__wrapper');
  assert.ok(i > 0, "nothing lifts the menu wrapper's clip while the panel is open");
  const block = css.slice(i, css.indexOf("}", css.indexOf("{", i)) + 1);
  assert.match(block, /overflow:\s*visible\s*!important/);

  // GATED, and gated on the right element. The wrapper's own data-state is
  // written "open" once and never written back (menu/index.js line ~355 has no
  // counterpart in _onClosed), so keying the override on it would leave the
  // clip lifted for the rest of the session — and that clip is what hides the
  // CLOSED panel, which is parked above the wrapper by a gsap translate. The
  // menu ROOT's data-state is the honest signal: 1 in _onOpen, 0 in _close.
  assert.ok(
    !/\.menu-topic-items__wrapper\[data-state="open"\][^{]*\{[^}]*overflow:\s*visible/.test(css),
    "the wrapper's own data-state never returns to closed — do not gate on it",
  );

  // __panel MUST NOT be the place this is fixed. It is the box that LOOKS like
  // the clipper (the wrapper shrink-wraps it, so the two rects coincide), and
  // an `overflow: visible` here would be a no-op that reads as the solution.
  const p = css.indexOf(".desk-org-tab__panel {");
  const panel = css.slice(p, css.indexOf("}", p) + 1);
  assert.ok(!/overflow/.test(panel), "__panel never clipped anything — see the harness");
});

test("ui-core still clips the menu wrapper inline, so the override is still needed", () => {
  // The whole reason for an `!important` in a skin. If a ui-core upgrade drops
  // this line, the override can lose the `!important` (and the gate can go with
  // it) — this test is what will say so, rather than the rule quietly becoming
  // cargo cult.
  const menu = readFileSync(
    join(ROOT, "node_modules/@drumee/ui-core/letc/widgets/menu/index.js"), "utf8");
  const i = menu.indexOf("case 'items-wrapper':");
  assert.ok(i > 0, "the menu widget no longer has an items-wrapper part");
  const arm = menu.slice(i, i + 200);
  assert.match(arm, /overflow:\s*_a\.hidden/);
});
