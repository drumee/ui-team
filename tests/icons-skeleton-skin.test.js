// icons-skeleton-skin.test.js — the folder skin's skeleton/search gating.
//
//   node --test tests/icons-skeleton-skin.test.js
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
const rule = (sel) => {
  const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};
const P = ".window-folder .window__files-panel";

test("skeleton hidden at rest, shown while loading", () => {
  assert.match(rule(`${P} .window__icons-skeleton`), /display: none !important/);
  assert.match(rule(`${P}[data-loading="1"] .window__icons-skeleton`), /display: block !important/);
});

test("while loading the real list and its spinner are hidden", () => {
  assert.match(rule(`${P}[data-loading="1"] .window__icons-list, ${P}[data-loading="1"] .window__content-row`), /display: none !important/);
});

test("search: folder empty text hidden; No results only when empty", () => {
  assert.match(rule(`${P}[data-search] .no-content`), /display: none !important/);
  assert.match(rule(`${P} .window__search-status`), /display: none !important/);
  assert.match(rule(`${P}[data-search=empty] .window__search-status`), /display: block !important/);
});

test("grid tiles use the real cell geometry", () => {
  const g = rule(`${P} .window__icons-skeleton-grid`);
  assert.match(g, /grid-template-columns: repeat\(auto-fill, var\(--grid-cell-w\)\)/);
  assert.match(g, /gap: var\(--grid-gap\)/);
  assert.match(rule(`${P} .window__icons-skeleton-tile`), /height: var\(--grid-cell-h-file\)/);
  assert.match(rule(`${P} .window__icons-skeleton-row`), /height: 42px/);
});

test("reduced motion stops the pulse; dropdown rules are gone", () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.ok(!/window-folder-topbar__search-suggestions/.test(css));
});
