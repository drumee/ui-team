// tests/calendar-day-task-card.test.js — the Personal Calendar's Day-view task
// card (Figma 2066:180690, task-board/calendar): under the name and the
// description, the attached files (two, then "+N") and a "Subtasks done/total"
// footer. Only the Day view's card (detail) draws them; the month cell and the
// Week board keep theirs.
//
//   node --test tests/calendar-day-task-card.test.js
//
// Runs the REAL normalizeRow / chip against stub Skeletons.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const DIR = path.join(__dirname, "../src/drumee/builtins/panel/calendar/skeleton");

global.Dayjs = require("dayjs");
global.LOCALE = { SUBTASKS: "Subtasks", PERSONAL: "Personal" };
global._a = { share: "share", folder: "folder" };
global._ = Object.assign(global._ || {}, { uniqueId: (p) => `${p}1` });
global.Skeletons = {
  Box: { X: (o) => ({ t: "X", ...o }), Y: (o) => ({ t: "Y", ...o }) },
  Note: (o) => ({ t: "Note", ...o }),
  Element: (o) => ({ t: "Element", ...o }),
  Image: { Svg: (o) => ({ t: "Svg", ...o }) },
  Button: { Svg: (o) => ({ t: "BtnSvg", ...o }) },
};

const { normalizeRow, subtaskCounts } = require(path.join(DIR, "helpers.js"));
// chip.js reaches the folder art through a webpack alias.
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === "media/grid/template/folder") return () => "";
  return origLoad.call(this, req, ...rest);
};
let chip;
try {
  ({ chip } = require(path.join(DIR, "chip.js")));
} finally {
  Module._load = origLoad;
}

const ui = { fig: { family: "calendar-main" } };
const find = (node, cls, out = []) => {
  if (!node || typeof node !== "object") return out;
  if (String(node.className || "").split(/\s+/).includes(`calendar-main__${cls}`)) out.push(node);
  (node.kids || []).forEach((k) => find(k, cls, out));
  return out;
};

const taskRow = (extra = {}) =>
  normalizeRow({
    kind: "task",
    id: "t1",
    title: "Prepare Q3",
    description: "Summarize",
    due_date: "2026-06-10",
    scope: "personal",
    can_write: 1,
    ...extra,
  });

test("normalizeRow keeps files with their full name", () => {
  const row = taskRow({
    linked_files: [
      { nid: "n1", filename: "spec_v1", extension: "docx" },
      { nid: "n2", filename: "a.pdf", extension: "pdf" },
      { nid: "n3", filename: "README", extension: null },
    ],
  });
  assert.deepEqual(row.files, [
    { nid: "n1", name: "spec_v1.docx" },
    { nid: "n2", name: "a.pdf" },
    { nid: "n3", name: "README" },
  ]);
});

test("normalizeRow defaults when the server sends nothing", () => {
  const row = taskRow();
  assert.deepEqual(row.files, []);
  assert.equal(row.subtask_total, 0);
  assert.equal(row.subtask_done, 0);
});

test("normalizeRow reads the counts as numbers", () => {
  const row = taskRow({ subtask_total: "3", subtask_done: "1" });
  assert.equal(row.subtask_total, 3);
  assert.equal(row.subtask_done, 1);
});

test("subtaskCounts clamps done into [0, total]", () => {
  assert.deepEqual(subtaskCounts({ subtask_total: 2, subtask_done: 5 }), { done: 2, total: 2 });
  assert.deepEqual(subtaskCounts({ subtask_total: 2, subtask_done: -1 }), { done: 0, total: 2 });
  assert.deepEqual(subtaskCounts({ subtask_total: "x" }), { done: 0, total: 0 });
});

const busy = () =>
  taskRow({
    linked_files: [
      { nid: "n1", filename: "spec_v1", extension: "docx" },
      { nid: "n2", filename: "spec_v2", extension: "docx" },
      { nid: "n3", filename: "notes", extension: "txt" },
    ],
    subtask_total: 2,
    subtask_done: 1,
  });

test("the Day card draws two files, then +N", () => {
  const card = chip(ui, busy(), { board: 1, detail: 1 });
  const files = find(card, "chip-files");
  assert.equal(files.length, 1);
  const pills = find(files[0], "chip-file");
  assert.equal(pills.length, 2);
  assert.deepEqual(
    pills.map((p) => find(p, "chip-file-name")[0].content),
    ["spec_v1.docx", "spec_v2.docx"],
  );
  const more = find(files[0], "chip-file-more");
  assert.equal(more.length, 1);
  assert.equal(more[0].content, "+1");
});

test("the Day card draws the subtasks footer with done/total", () => {
  const card = chip(ui, busy(), { board: 1, detail: 1 });
  const foot = find(card, "chip-subtasks");
  assert.equal(foot.length, 1);
  assert.equal(find(foot[0], "chip-subtasks-label")[0].content, "Subtasks");
  assert.equal(find(foot[0], "chip-subtasks-count")[0].content, "1/2");
});

test("files and footer are inert: the card's click opens the task", () => {
  const card = chip(ui, busy(), { board: 1, detail: 1 });
  for (const cls of ["chip-files", "chip-file", "chip-file-more", "chip-subtasks"]) {
    for (const n of find(card, cls)) assert.equal(n.active, 0, `${cls} is inert`);
  }
});

test("a task with no files and no subtasks draws neither block", () => {
  const card = chip(ui, taskRow(), { board: 1, detail: 1 });
  assert.equal(find(card, "chip-files").length, 0);
  assert.equal(find(card, "chip-subtasks").length, 0);
});

test("two files or fewer: no +N pill", () => {
  const row = taskRow({ linked_files: [{ nid: "n1", filename: "a", extension: "pdf" }] });
  const card = chip(ui, row, { board: 1, detail: 1 });
  assert.equal(find(card, "chip-file").length, 1);
  assert.equal(find(card, "chip-file-more").length, 0);
});

test("the Week board and the month cell keep their cards", () => {
  for (const opt of [{ board: 1 }, { compact: 1 }]) {
    const card = chip(ui, busy(), opt);
    assert.equal(find(card, "chip-files").length, 0);
    assert.equal(find(card, "chip-subtasks").length, 0);
  }
});
