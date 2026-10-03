// icons-skeleton.test.js — the Files list's skeleton placeholder and the
// search status note, plus the toolbar search box without its dropdown.
//
//   node --test tests/icons-skeleton.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") }, Entry: node("Entry") };
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });

const K = require("../src/drumee/builtins/window/skeleton/toolkit/icons-skeleton");
const ui = { fig: { group: "window", family: "window-folder" } };
const count = (html, cls) => (html.match(new RegExp(`class="${cls}[ "]`, "g")) || []).length;

test("grid skeleton: 12 tiles, each card + two lines, decorative", () => {
  const html = K.iconsSkeletonHtml("window", "grid");
  assert.equal(count(html, "window__icons-skeleton-tile"), K.GRID_TILES);
  assert.equal(count(html, "window__icons-skeleton-card"), K.GRID_TILES);
  assert.equal(count(html, "window__icons-skeleton-line"), K.GRID_TILES * 2);
  assert.match(html, /^<div class="window__icons-skeleton-grid" aria-hidden="true">/);
});

test("row skeleton: 8 rows, icon + two lines", () => {
  const html = K.iconsSkeletonHtml("window", "row");
  assert.equal(count(html, "window__icons-skeleton-row"), K.ROW_LINES);
  assert.equal(count(html, "window__icons-skeleton-icon"), K.ROW_LINES);
  assert.match(html, /^<div class="window__icons-skeleton-rows" aria-hidden="true">/);
});

test("iconsSkeleton / searchStatus descriptors", () => {
  const s = K.iconsSkeleton(ui, "grid");
  assert.equal(s.type, "Note");
  assert.equal(s.className, "window__icons-skeleton");
  assert.equal(s.dataset.mode, "grid");
  const st = K.searchStatus(ui);
  assert.equal(st.className, "window__search-status");
  assert.equal(st.content, en.NO_RESULTS);
});
test("toolkit: search box has no dropdown; Entry value carries the active query; skeleton mounted", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const read = (p) => fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window", p), "utf8");
  const src = read("skeleton/toolkit/index.js");
  const box = src.slice(src.indexOf("function workspaceSearchBox"), src.indexOf("function fileFilterControls"));
  assert.ok(box.length > 0, "workspaceSearchBox not found");
  assert.ok(!/ws-search-suggestions|ws-search-results/.test(box), "dropdown parts still built");
  assert.match(box, /value: ui\._wsQuery \|\| ""/);
  assert.match(box, /watch: "ws-search-typed"/);
  const files = src.slice(src.indexOf("export function filesContainer"), src.indexOf("export function folderFilesRowContainer"));
  assert.match(files, /iconsSkeleton\(ui, "grid"\)/);
  assert.match(files, /searchStatus\(ui\)/);
  const rows = src.slice(src.indexOf("export function folderFilesRowContainer"));
  assert.match(rows.slice(0, 1200), /searchStatus\(ui\)/);
  assert.match(read("skeleton/content/row/index.js"), /iconsSkeleton\(ui, "row"\)/);
});

test("folder view toggle rebuilds the panel with the skeleton + status", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const src = fs.readFileSync(path.join(__dirname, "..", "src/drumee/builtins/window/folder/index.js"), "utf8");
  assert.match(src, /gridFilesBrowser\(this\),\s*iconsSkeleton\(this, "grid"\),\s*searchStatus\(this\),/);
  assert.match(src, /require\("\.\.\/skeleton\/content\/row"\)\(this\),\s*searchStatus\(this\),/);
});
