// folder-new-ctrl-beside-filters.test.js — on a phone (compact folder window,
// <=700px), while the view toggle is hidden (an empty folder, not loading or
// searched), + New sits on the filter bar's own row, after the tabs, instead of
// alone on a row of its own.
//
//   node --test tests/folder-new-ctrl-beside-filters.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass.compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), {
  loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent,
}).css.replace(/\s+/g, " ");
const compact = css.slice(css.indexOf("@container window-folder-w (max-width: 700px)"));
const EMPTY = /\.window__files-panel:not\(\[data-loading="1"\]\):not\(\[data-search\]\):has\(\.window__icons-list \.smart-container > \.no-content\)/.source;
const rule = (tail, decl) => new RegExp(`${EMPTY} ${tail} \\{[^}]*${decl}`);

test("the bar keeps one row", () => {
  assert.match(compact, rule("\\.window-folder__filter-bar", "flex-wrap: nowrap"));
});

test("the tabs give way (shrink, scroll sideways) so + New fits beside them", () => {
  assert.match(compact, rule("\\.window-folder__filter-track", "flex: 1 1 auto"));
  assert.match(compact, rule("\\.window-folder__filter-track", "overflow-x: auto"));
});

test("+ New sits after the tabs at its own width, not a full row in front", () => {
  assert.match(compact, rule("\\.window-folder-topbar__file-controls", "order: 0"));
  assert.match(compact, rule("\\.window-folder-topbar__file-controls", "flex: 0 0 auto"));
});
