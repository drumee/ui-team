// media-grid-rename-hides-date.test.js — renaming a file tile hides its date
// line (the editor drew over "a day ago"), and the date comes back when the
// editor closes.
//
//   node --test tests/media-grid-rename-hides-date.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("grid _createInput stamps data-renaming on file tiles and clears it", () => {
  const src = read("src/drumee/builtins/media/grid/index.js");
  const body = src.slice(src.indexOf("async _createInput("), src.indexOf("rowsCount("));
  const stamp = body.indexOf('this.el.dataset.renaming = "1"');
  const folderGuard = body.indexOf("type === _a.folder || type === _a.hub");
  const rowLookup = body.indexOf("meta-row-top");
  assert.ok(stamp > folderGuard, "folders/workspaces have no date: stamp after their guard");
  assert.ok(stamp < rowLookup, "stamped before the inline lookup, so the fallback path is covered");
  assert.match(body, /entry\.once\(_e\.destroy,[\s\S]*?delete this\.el\.dataset\.renaming/);
});

test("the skin hides the date while renaming", () => {
  const scss = read("src/drumee/builtins/media/grid/skin/filename.scss");
  assert.match(scss, /\.media-grid\[data-renaming="1"\] \.media-grid__date \{\s*display: none;/);
});
