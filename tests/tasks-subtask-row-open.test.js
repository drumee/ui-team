// tests/tasks-subtask-row-open.test.js — on the task detail panel, a click
// anywhere on a subtask row (tasks-panel__subtask-row) opens that subtask, not
// only a click on its title. ui-core binds a click to every widget not marked
// active:0 and stopPropagation()s before triggerHandlers, so the row now
// carries open-detail and its title and slots let the click through; the
// chips, the assignee button and the × keep their own services. The create
// modal's rows (no open service) open nothing.
//
//   node --test tests/tasks-subtask-row-open.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const SKL = fs.readFileSync(path.join(DIR, "skeleton/index.js"), "utf8");
const SKIN = fs.readFileSync(path.join(DIR, "skin/index.scss"), "utf8");

const subRow = () => {
  const at = SKL.indexOf("const subRow = (t) => {");
  return SKL.slice(at, SKL.indexOf("const creator = () => {", at));
};
const inert = (cls) => new RegExp(`className: \`\\$\\{pfx\\}__${cls}\`,(\\s*//[^\\n]*)*\\s*active: 0,`);

test("the row itself carries the open service, where there is one", () => {
  assert.match(subRow(), /\.\.\.\(svc\.open \? \{ service: svc\.open, uiHandler: \[ui\], taskId: t\.id \} : \{\}\)/);
});

test("the title and the slots let the click through to the row", () => {
  const row = subRow();
  assert.match(row, inert("subtask-title"));
  const cells = [...row.matchAll(new RegExp(inert("subtask-cell").source, "g"))];
  assert.equal(cells.length, 2, "both chip slots");
  assert.match(row, inert("subtask-row-end"));
});

test("the row: --border-default, 6px radius, the pointer on the row", () => {
  const at = SKIN.indexOf("  &__subtask-row {");
  const rule = SKIN.slice(at, SKIN.indexOf("\n  }\n", at));
  assert.match(rule, /border: 1px solid var\(--border-default\);/);
  assert.match(rule, /border-radius: 6px;/);
  assert.match(rule, /cursor: pointer;/);
});
