// tests/tasks-rich-text-editor.test.js — the tasks panel's editors read and
// write the rich-text grammar: Ctrl+B text survives save and reopen, posted
// bodies draw marks (and linkify inside them), and previews / the list's
// inline edit go through rich-text.js.
//
//   node --test tests/tasks-rich-text-editor.test.js
//
// Runs the REAL _serializeEditor / _renderEditorContent (sliced out of
// index.js, which only loads under webpack) against tests/helpers/fake-dom.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const { el, document, shape } = require("./helpers/fake-dom");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "src/drumee/builtins/window/tasks");
const read = (p) => fs.readFileSync(path.join(ROOT, p.replace(/^TASKS/, "src/drumee/builtins/window/tasks")), "utf8");
const INDEX_SRC = read("TASKS/index.js");
const R = require(path.join(DIR, "rich-text.js"));
const M = require(path.join(DIR, "mention-markers.js"));

global.document = document;
const method = (sig) =>
  new Function(
    "parse",
    "stringify",
    "fromDom",
    "toDom",
    "linkifyTokens",
    "safeUrl",
    `return ${sliceFunction(INDEX_SRC, sig)}`,
  )(R.parse, R.stringify, R.fromDom, R.toDom, M.linkifyTokens, M.safeUrl);

const ui = {
  fig: { family: "tasks-panel" },
  _serializeEditor: method("_serializeEditor(editorEl)"),
  _renderEditorContent: method("_renderEditorContent(editorEl, markerText)"),
  _richOpt: method("_richOpt()"),
  _richMakers: method("_richMakers(editable)"),
  _makeMentionChip: (uid, name) =>
    el("span", [`@${name}`], { className: "tasks-panel__mention-chip", dataset: { uid, name } }),
  _makeInlineImage: (nid) => el("span", [], { className: "tasks-panel__inline-img", dataset: { nid } }),
  _makeLinkNode: (label, href) => el("a", [label], { dataset: { href } }),
};
const editor = (kids, editable = true) =>
  el("div", kids, { attrs: { contenteditable: editable ? "true" : "false" } });

test("Ctrl+B text survives save and reopen", () => {
  const ed = editor([el("div", ["Fix the ", el("b", ["important"]), " bug"])]);
  const stored = ui._serializeEditor(ed);
  assert.equal(stored, "Fix the **important** bug");
  const back = editor([]);
  ui._renderEditorContent(back, stored);
  assert.deepEqual(shape(back), ["Fix the ", { b: ["important"] }, " bug"]);
  assert.equal(ui._serializeEditor(back), stored);
});

test("a read-only body linkifies inside marks", () => {
  const ro = editor([], false);
  ui._renderEditorContent(ro, "**see https://x.dev**");
  assert.deepEqual(shape(ro), [{ b: ["see ", { a: ["https://x.dev"] }] }]);
});

test("mentions and links keep their stored form", () => {
  const ed = editor([]);
  const s = "hi [@Ann](user:7) [doc](link:https://a.b)";
  ui._renderEditorContent(ed, s);
  assert.equal(ui._serializeEditor(ed), s);
});

test("previews and the list-edit guard use rich-text", () => {
  assert.match(read("TASKS/skeleton/list.js"), /toPlain\(t\.description/);
  assert.match(read("TASKS/skeleton/calendar.js"), /toPlain\(t\.description\)/);
  assert.match(read("TASKS/skeleton/index.js"), /toPlain\(task\.description\)/);
  assert.match(read("TASKS/list-inline.js"), /hasRichContent\(task\.description/);
});

test("paste keeps formatting through the same bridge", () => {
  const body = sliceFunction(INDEX_SRC, "_pasteFragment(html, plain)");
  assert.match(body, /fromDom\(doc\.body, this\._richOpt\(\)\)/);
  assert.match(body, /toDom\(/);
});
