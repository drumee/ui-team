// files-empty-state-skin.test.js — compiles the folder skin and pins the
// Files empty-state rules whose absence is a functional bug: stamp gating
// (cards fail closed, filter swaps hero for plain text), the search hide
// still winning, and the Figma 920:123317 geometry.
//
//   node --test tests/files-empty-state-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rule = (sel, src = css) => {
  const m = src.match(new RegExp("(?:^|[}\\s])" + esc(sel) + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};
const E = ".window-folder .window__files-empty";

test("cards hidden unless data-can-create=1 (fail closed)", () => {
  assert.match(rule(`${E}-actions`), /display: none !important/);
  assert.match(rule(`.window-folder[data-can-create="1"] .window__files-empty-actions`), /display: grid !important/);
});

test("filter stamp swaps hero for plain text", () => {
  assert.match(rule(`${E}-filtered`), /display: none !important/);
  assert.match(rule(`.window-folder[data-file-filter] .window__files-empty-hero`), /display: none !important/);
  assert.match(rule(`.window-folder[data-file-filter] .window__files-empty-filtered`), /display: flex !important/);
});

test("root carries no display rule, so the search hide keeps winning", () => {
  const root = rule(".window-folder .window__icons-list .smart-container > .window__files-empty.no-content");
  assert.doesNotMatch(root, /display/);
  assert.match(root, /max-width: none/); // undoes common.scss's 320px note cap
  assert.match(rule(".window-folder .window__files-panel[data-search] .no-content"), /display: none !important/);
});

test("Figma geometry: heading, grid, card", () => {
  assert.match(rule(`${E}-hero`), /gap: 48px/);
  const title = rule(`${E}-title`);
  assert.match(title, /font-size: 24px/); assert.match(title, /line-height: 1\.1/); assert.match(title, /#34343a/i);
  const desc = rule(`${E}-desc`);
  assert.match(desc, /font-size: 18px/); assert.match(desc, /var\(--tertiary-grey-80/);
  const card = rule(`${E}-card`);
  assert.match(card, /padding: 16px/); assert.match(card, /border-radius: 24px/); assert.match(card, /gap: 24px/);
  // Figma cards are left-aligned; common.scss's .no-content centres text and
  // the hero root carries that class, so the card must reset it.
  assert.match(card, /text-align: left/);
  // revamp.scss redefines --primary-100 to #f4e7ff (pale lavender) later in
  // :root — card titles rendered near-invisible. Use the purple ramp's 100.
  const cardTitle = rule(`${E}-card-title`);
  assert.doesNotMatch(cardTitle, /--primary-100\b/);
  assert.match(cardTitle, /var\(--primary-purple-100, #0b0a21\)/);
  const tile = rule(`${E}-ico`);
  assert.match(tile, /width: 48px/); assert.match(tile, /height: 48px/); assert.match(tile, /overflow: hidden/); assert.match(tile, /opacity: 0\.6/);
});

test("SVG icons keep their root size; PNGs are sized to their Figma slot", () => {
  for (const k of ["spreadsheet", "document", "presentation", "upload"]) {
    const r = rule(`${E}-card[data-card=${k}] .window__files-empty-img`);
    assert.doesNotMatch(r, /(^|;)\s*(width|height):/, `${k} must not resize its SVG`);
  }
  assert.match(rule(`${E}-card[data-card=gdrive] .window__files-empty-img`), /width: 46\.725px/);
  const scratch = rule(`${E}-card[data-card=scratch] .window__files-empty-img`);
  assert.match(scratch, /width: 24\.438px/); assert.match(scratch, /mix-blend-mode: multiply/); assert.match(scratch, /opacity: 0\.3/);
});

// No size containment anywhere on the hero: `.window-folder .window__icons-list`
// is align-items:flex-start, so the smart-container sizes to its content, and
// `container-type: inline-size` zeroes that content's width — the whole hero
// collapsed to ~50px in the headless render. The grid narrows on its own
// instead: auto-fit, never more than 3 columns, never under 200px.
test("narrow panes reflow without container queries (no size containment)", () => {
  assert.doesNotMatch(css, /files-empty[^{}]*\{[^}]*container(-type)?:/);
  assert.doesNotMatch(css, /@container files-empty/);
  const grid = rule(`.window-folder[data-can-create="1"] .window__files-empty-actions`);
  assert.match(grid, /grid-template-columns: repeat\(auto-fit, minmax\(max\(200px, \(100% - 32px\) \/ 3\), 1fr\)\)/);
  assert.match(rule(`${E}-hero`), /padding: clamp\(32px, 9%, 87px\) clamp\(16px, 11%, 128px\)/);
});
