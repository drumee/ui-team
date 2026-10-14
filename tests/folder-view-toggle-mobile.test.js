// folder-view-toggle-mobile.test.js — on a phone (the folder window's compact
// layout, <=700px) the group/list/grid toggle stays visible in an empty folder;
// the empty-folder hide applies to wide windows only.
//
//   node --test tests/folder-view-toggle-mobile.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass.compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), {
  loadPaths: [SRC, path.join(SRC, "skin")],
  logger: sass.Logger.silent,
}).css.replace(/\s+/g, " ");

const HIDE = /\.window__files-panel:not\(\[data-loading="1"\]\):not\(\[data-search\]\):has\([^)]*no-content\) \.window-folder-topbar__view-toggle \{ display: none !important; \}/;

test("the empty-folder hide only applies to a wide folder window", () => {
  const i = css.search(HIDE);
  assert.ok(i >= 0, "rule still exists");
  const before = css.slice(0, i);
  const open = before.lastIndexOf("@container window-folder-w (min-width: 701px)");
  assert.ok(open >= 0, "wrapped in the wide-window container query");
  // and nothing closed that block between its opening and the rule
  const between = before.slice(open);
  const depth = (between.match(/\{/g) || []).length - (between.match(/\}/g) || []).length;
  assert.ok(depth >= 1, "rule sits inside the container block");
});

test("off the Files tab the toggle still hides (data-visible=0)", () => {
  assert.match(css, /\.window-folder-topbar__view-toggle\[data-visible="0"\] \{ display: none; \}/);
});
