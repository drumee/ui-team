// tests/tasks-desc-save.test.js — every change made in the description editor
// reaches the saved task. Update (_commitDetail → planDetailCommit) and Create
// (_commitTask) save the DRAFT, which only _onDescInput fills; so the draft is
// re-read from the editor at commit time, an empty list is not wiped as an
// empty editor, and formatting-only edits count as edits.
//
//   node --test tests/tasks-desc-save.test.js
//
// planDetailCommit and rich-text.js are required for real; _flushDescEditor /
// _onDescInput are sliced out of index.js (webpack-only) and run on stubs.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const INDEX_SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const { planDetailCommit } = require(path.join(DIR, "detail-commit.js"));
const R = require(path.join(DIR, "rich-text.js"));
const method = (sig) => new Function(`return ${sliceFunction(INDEX_SRC, sig)}`)();

const snap = (description) => ({
  title: "t",
  description,
  priority: "medium",
  reporter_uid: "u",
  due_date: "",
  start_date: "",
  status: "todo",
  assignees: [],
  labels: [],
});

test("a formatting-only edit is an edit", () => {
  assert.equal(planDetailCommit(snap("fix it"), snap("**fix** it"), snap("fix it")).update.description, "**fix** it");
});

test("unsaved formatting wins over a peer's change made while the card was open", () => {
  assert.equal(planDetailCommit(snap("a"), snap("**a**"), snap("a b")).update.description, "**a**");
});

test("a mention inside bold still notifies", () => {
  const d = { ...snap("**hi [@Ann](user:7)**"), mention_uids: ["7"], _mentioned_before: [] };
  assert.deepEqual(planDetailCommit(snap(""), d, snap("")).update.mention_uids, ["7"]);
});

// ── the draft is re-read from the editor at commit time ────────────────────
const domEditor = { serialized: "", editable: true };
const flushUi = {
  el: {
    querySelector: () => ({ getAttribute: (k) => (k === "contenteditable" ? String(domEditor.editable) : null) }),
  },
  _mentionTarget: () => ({
    editorSelector: ".tasks-panel__detail-panel .tasks-panel__desc-editor",
    set: (text) => (flushUi._detailDraft.description = text),
  }),
  _serializeEditor: () => domEditor.serialized,
  _collectMentionUids: () => [],
  _flushDescEditor: method("_flushDescEditor(scope)"),
};

test("Update and Create save what is on screen, even without an input event", () => {
  flushUi._detailDraft = { description: "old" };
  domEditor.serialized = "**new**";
  domEditor.editable = true;
  flushUi._flushDescEditor("detail");
  assert.equal(flushUi._detailDraft.description, "**new**");
  assert.match(sliceFunction(INDEX_SRC, "async _commitDetail()"), /^async function _commitDetail\(\) \{\s*this\._flushDescEditor\("detail"\);/);
  assert.match(
    sliceFunction(INDEX_SRC, "async _commitTask()"),
    /^async function _commitTask\(\) \{\s*this\._flushDescEditor\("create"\);\s*this\._captureCreateDraft\(\);/,
  );
});

test("a read-only description is never flushed", () => {
  flushUi._detailDraft = { description: "keep" };
  domEditor.serialized = "";
  domEditor.editable = false;
  flushUi._flushDescEditor("detail");
  assert.equal(flushUi._detailDraft.description, "keep");
});

// ── the empty-editor cleanup spares a list ─────────────────────────────────
function stubEditor({ text, has }) {
  const ed = {
    textContent: text,
    innerHTMLWrites: [],
    querySelector: (sel) => (has.includes(sel) ? {} : null),
  };
  Object.defineProperty(ed, "innerHTML", { set: (v) => ed.innerHTMLWrites.push(v) });
  return ed;
}
const inputUi = {
  fig: { family: "tasks-panel" },
  _mentionTarget: () => ({ set: () => {} }),
  _serializeEditor: () => "",
  _collectMentionUids: () => [],
  _handleEditorMention: () => {},
  _onDescInput: method("_onDescInput(scope, editorEl)"),
};

test("an empty list survives the empty-editor cleanup; an empty editor is still cleared", () => {
  const list = stubEditor({ text: "", has: ["ul, ol"] });
  inputUi._onDescInput("detail", list);
  assert.deepEqual(list.innerHTMLWrites, []);
  const blank = stubEditor({ text: "", has: [] });
  inputUi._onDescInput("detail", blank);
  assert.deepEqual(blank.innerHTMLWrites, [""]);
});

test("a description holding only escapes is kept out of the list's plain text box", () => {
  assert.equal(R.hasRichContent("2\\*3"), true);
  assert.equal(R.hasRichContent("\\- not a list"), true);
  assert.equal(R.hasRichContent("C:\\temp"), false);
});
