// files-empty-state-wiring.test.js — the folder window writes the two stamps
// the Files empty-state skin gates on. Source-level: the window class cannot
// be instantiated outside the app.
//
//   node --test tests/files-empty-state-wiring.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/builtins/window/folder/index.js"), "utf8");
const method = (name) => {
  const start = src.search(new RegExp(`\\n  ${name}\\([^)]*\\) \\{`));
  assert.ok(start > 0, `${name} not found`);
  const next = src.slice(start + 1).search(/\n  (async )?[_a-zA-Z]+\([^)]*\) \{/);
  return src.slice(start, start + 1 + next);
};

test("stamp is written before the new-ctrl early return", () => {
  const body = method("syncNewCtrlVisibility");
  const stamp = body.indexOf("this.el.dataset.canCreate");
  const early = body.indexOf("if (!newCtrl || !newCtrl.el) return;");
  assert.ok(stamp > 0, "no canCreate stamp");
  assert.ok(early > 0, "early return moved or renamed");
  assert.ok(stamp < early, "a window without + New would never get the stamp");
});

test("_stampFileFilter writes / clears data-file-filter from _filterType", () => {
  const body = method("_stampFileFilter");
  assert.match(body, /this\.el\.dataset\.fileFilter = this\._filterType/);
  assert.match(body, /delete this\.el\.dataset\.fileFilter/);
});

test("filter handler stamps the window", () => {
  const i = src.indexOf('this._filterType = value && value !== "all" ? value : null;');
  assert.ok(i > 0);
  assert.match(src.slice(i, i + 200), /this\._stampFileFilter\(\);\s*\n\s*return this\.loadContent\(\);/);
});

test("navigation reset clears the stamp", () => {
  assert.match(method("_resetFileTypeFilter"), /this\._filterType = null;\s*\n\s*this\._stampFileFilter\(\);/);
});
