// desk-mobile-new-ctrl-proxy.test.js — on a phone, while the folder's view
// toggle is hidden (empty folder), the folder's "+ New" sits beside the desk's
// search pill: a pill in the action row that opens the folder's own new-ctrl
// menu, shown by CSS exactly when the toggle is hidden.
//
//   node --test tests/desk-mobile-new-ctrl-proxy.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const D = path.join(SRC, "modules/desk");

test("the action row carries the + New pill beside the search pill", () => {
  const sk = fs.readFileSync(path.join(D, "skeleton/index.js"), "utf8");
  const start = sk.indexOf("const _build_mobile_action_row");
  const row = sk.slice(start, sk.indexOf("\n};", start));
  assert.ok(row.indexOf("mobile-search-pill") < row.indexOf("mobile-new-ctrl"), "after the search pill");
  assert.match(row, /service: "mobile-new-ctrl"/);
});

test("pressing it opens the folder's own + New menu (clicks its trigger)", () => {
  const js = fs.readFileSync(path.join(D, "index.js"), "utf8");
  assert.match(js, /case "mobile-new-ctrl":\s*\n\s*return this\._openFolderNewMenu\(\);/);
  const m = js.match(/\n {2}_openFolderNewMenu\(\) \{\n([\s\S]*?)\n {2}\}\n/);
  assert.ok(m, "_openFolderNewMenu defined");
  let clicked = 0, asked = null;
  const trigger = { click: () => { clicked++; } };
  const ctx = { _railWorkspace: () => ({ el: { querySelector: (s) => { asked = s; return trigger; } } }) };
  assert.equal(new Function(m[1]).call(ctx), true);
  assert.equal(clicked, 1);
  assert.match(asked, /window-folder-topbar__new-ctrl/);
  assert.equal(new Function(m[1]).call({ _railWorkspace: () => null }), false, "no pane, nothing");
});

const css = sass.compile(path.join(D, "skin/index.scss"), {
  loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent,
}).css.replace(/\s+/g, " ");
const EMPTY = /\.window__files-panel:not\(\[data-loading="1"\]\):not\(\[data-search\]\) \.window__icons-list \.smart-container > \.no-content/.source;

test("the pill is hidden by default", () => {
  assert.match(css, /\.desk-module__mobile-new-ctrl \{[^}]*display: none/);
});

test("shown exactly while the toggle is hidden: empty folder, not loading or searching, and + New permitted", () => {
  assert.match(css, new RegExp(`\\.desk-module__ui:has\\(${EMPTY}\\):has\\(\\.window-folder-topbar__new-ctrl\\[data-visible="1"\\]\\) \\.desk-module__mobile-new-ctrl \\{[^}]*display: flex`));
});

test("meanwhile the folder's own pill steps aside (visibility, so its menu card can still open)", () => {
  assert.match(css, /\.desk-module__ui:has\(\.desk-module__mobile-new-ctrl\) \.window__files-panel:not\(\[data-loading="1"\]\):not\(\[data-search\]\):has\(\.window__icons-list \.smart-container > \.no-content\) \.window-folder-topbar__new-ctrl [^{]*label-button[^{]*\{[^}]*visibility: hidden/);
});
