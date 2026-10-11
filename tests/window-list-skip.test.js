// window-list-skip.test.js — what a window's file list never shows.
//
//   node --test tests/window-list-skip.test.js
//
// Schedules (room.book nodes) are dropped from every view, with or without
// showHidden; dotfiles only without it. Applied the way ui-core List
// prepareData applies `skip`: a string key must differ, a RegExp must not match.
const test = require("node:test");
const assert = require("node:assert/strict");

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => (store[k] = String(v)),
  removeItem: (k) => delete store[k],
};
const { fileListSkip } = require("../src/drumee/builtins/window/skeleton/toolkit/list-skip");

// Mirror of letc/widgets/list/index.js prepareData.
function prepareData(data, skip) {
  for (const k in skip) {
    data = data.filter((e) =>
      typeof skip[k] === "string" ? e[k] != skip[k] : !skip[k].test(e[k]),
    );
  }
  return data;
}

const rows = [
  { filename: "Report.docx", ftype: "document" },
  { filename: "Standup", ftype: "schedule" },
  { filename: "Standup", category: "schedule" },
  { filename: ".hidden", ftype: "other" },
];
const names = (skip) => prepareData(rows, skip).map((r) => r.filename);

test("hides schedules (either key) and dotfiles by default", () => {
  delete store.showHidden;
  assert.deepEqual(names(fileListSkip()), ["Report.docx"]);
});

test("showHidden brings dotfiles back, never schedules", () => {
  store.showHidden = "yes";
  assert.deepEqual(names(fileListSkip()), ["Report.docx", ".hidden"]);
  assert.deepEqual(names(fileListSkip(true)), ["Report.docx", ".hidden"]);
  assert.deepEqual(names(fileListSkip(false)), ["Report.docx"]);
});
