// tests/tasks-quick-open-close-subtask.test.js — the Personal Calendar's
// quick-open card. Closing a subtask (X, Cancel, a saved Update) closes the
// card and its backdrop; it does not walk back to the parent the way the
// workspace board does. And the card's loading screen draws no × any more.
//
//   node --test tests/tasks-quick-open-close-subtask.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const SKL = fs.readFileSync(path.join(DIR, "skeleton/index.js"), "utf8");
const walkBack = eval(`(${sliceFunction(SRC, "_walkBackTarget()")})`);

const panel = (quick, back, tasks = [{ id: "p1" }]) => ({
  _quickOpen: quick,
  _detailReturnTo: back,
  _tasks: tasks,
});

test("on the board, a child's close walks back to its parent", () => {
  assert.equal(walkBack.call(panel(false, "p1")), "p1");
});

test("in the quick-open card, a child's close goes nowhere: the card closes", () => {
  assert.equal(walkBack.call(panel(true, "p1")), null);
});

test("no parent to return to, or a parent no longer listed: plain close", () => {
  assert.equal(walkBack.call(panel(false, null)), null);
  assert.equal(walkBack.call(panel(false, "gone")), null);
});

test("close-detail and a saved Update both ask _walkBackTarget", () => {
  const at = SRC.indexOf('case "close-detail": {');
  const closeCase = SRC.slice(at, SRC.indexOf("case ", at + 20));
  assert.match(closeCase, /const back = this\._walkBackTarget\(\);/);
  const commit = SRC.slice(SRC.indexOf("// Update on a child returns to the parent"), SRC.indexOf("_openDetail(id) {"));
  assert.match(commit, /const back = this\._walkBackTarget\(\);/);
});

test("the quick-open loading screen draws no ×", () => {
  const at = SKL.indexOf("if (quickOpen) {");
  const quick = SKL.slice(at, SKL.indexOf("// Sub-views over the same folder-scoped task set", at));
  assert.doesNotMatch(quick, /quick-open-cancel|__quick-close/);
  assert.match(quick, /__quick-loading/);
});
