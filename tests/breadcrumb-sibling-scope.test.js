// tests/breadcrumb-sibling-scope.test.js — the breadcrumb answers the switcher's
// "which level am I on?" from the crumbs it painted.
//
//   node --test tests/breadcrumb-sibling-scope.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const lib = require("../src/drumee/libs/folder-siblings");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/breadcrumb/index.js"),
  "utf8",
);
// Injected as scopeOfPath — the alias the widget imports it under. Not as
// `siblingScope`: the sliced method becomes a NAMED function expression, and
// that name would shadow the lib inside it.
const method = new Function(
  "scopeOfPath",
  `return ${sliceFunction(SRC, "siblingScope()")}`,
)(lib.siblingScope);

const root = { nid: "R1", hub_id: "H1", filetype: "hub", filename: "/", hub_name: "aaaa" };
const abc = { nid: "F1", hub_id: "H1", filetype: "folder", filename: "abc" };

test("requires the lib by its webpack alias", () => {
  assert.match(SRC, /const \{ siblingScope: scopeOfPath \} = require\("libs\/folder-siblings"\)/);
});

test("deeper path → the lib's scope", () => {
  const s = method.call({ _section: false, _data: [root, abc] });
  assert.equal(s.key, "H1:R1");
});

test("workspace alone → null", () => {
  assert.equal(method.call({ _section: false, _data: [root] }), null);
});

test("section screen → null even with a stale path in _data", () => {
  assert.equal(method.call({ _section: true, _data: [root, abc] }), null);
});
