// tests/file-switcher-hides-schedules.test.js — the player's Files panel never
// lists a scheduled meeting (an MFS node with no bytes to open).
//
//   node --test tests/file-switcher-hides-schedules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/player/widget/file-switcher/index.js"),
  "utf8",
);
global.isScheduleNode = require("../src/drumee/builtins/window/skeleton/toolkit/list-skip").isScheduleNode;
const match = eval(`(${sliceFunction(SRC, "match(node)")})`);

test("schedule rows are dropped, with or without a query", () => {
  for (const _query of ["", "meet"]) {
    const ui = { _query };
    assert.equal(match.call(ui, { filename: "meeting", filetype: "schedule" }), false);
    assert.equal(match.call(ui, { filename: "meeting", category: "schedule" }), false);
  }
});

test("ordinary files still match", () => {
  assert.equal(match.call({ _query: "" }, { filename: "a", ext: "docx", filetype: "document" }), true);
  assert.equal(match.call({ _query: "rep" }, { filename: "report", ext: "pdf" }), true);
  assert.equal(match.call({ _query: "zzz" }, { filename: "report", ext: "pdf" }), false);
});
