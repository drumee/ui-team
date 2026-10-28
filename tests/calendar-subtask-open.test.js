// tests/calendar-subtask-open.test.js — in the Personal Calendar's task modal,
// clicking a saved subtask row (calendar-main__subtask) opens that subtask's
// own detail in the same modal, as clicking tasks-panel__subtask-row does on
// the board (open-detail). A row still being typed has no record yet and opens
// nothing; its chips and its × keep their own clicks.
//
//   node --test tests/calendar-subtask-open.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const CAL = path.join(__dirname, "../src/drumee/builtins/panel/calendar");
const SRC = fs.readFileSync(path.join(CAL, "index.js"), "utf8");
const FORM = fs.readFileSync(path.join(CAL, "skeleton/task-form.js"), "utf8");
const openSubtask = eval(`(${sliceFunction(SRC, "_openSubtask(key)")})`);
const switchForm = eval(`(${sliceFunction(SRC, "_switchTaskForm(row, opts = {})")})`);

function calendar(form) {
  const opened = [];
  const self = {
    _form: form,
    cancelled: [],
    _cancelFormUploads(f) {
      this.cancelled.push(f);
    },
    _syncSubtaskMenuDismiss() {},
    _switchTaskForm: switchForm,
    _openTaskForm(row, opts = {}) {
      opened.push(row);
      this._form = { kind: "task", mode: "edit", row, draft: {}, parentRow: opts.parentRow || null };
    },
  };
  return { self, opened };
}

const parentForm = (extra = {}) => ({
  kind: "task",
  mode: "edit",
  row: { id: "p1", hub_id: "hubP", scope: "personal", can_write: true, kind: "task" },
  draft: {
    subtasks: [
      { localKey: "id:s1", id: "s1", title: "Child", description: "notes", status: "done",
        priority: "high", due_date: "2026-10-30", start_date: "2026-10-29" },
      { localKey: "new:1", title: "typing…" },
    ],
  },
  ...extra,
});

test("a saved subtask opens in the modal as its own task", () => {
  const { self, opened } = calendar(parentForm());
  openSubtask.call(self, "id:s1");
  assert.equal(opened.length, 1);
  assert.deepEqual(opened[0], {
    kind: "task",
    id: "s1",
    hub_id: "hubP",
    scope: "personal",
    can_write: true,
    title: "Child",
    description: "notes",
    status: "done",
    priority: "high",
    due_date: "2026-10-30",
    start_date: "2026-10-29",
  });
});

test("a row still being typed opens nothing", () => {
  const { self, opened } = calendar(parentForm());
  openSubtask.call(self, "new:1");
  assert.equal(opened.length, 0);
});

test("the parent's pending uploads are dropped, its writes still reload on close", () => {
  const parent = parentForm({ wrote: true });
  const { self } = calendar(parent);
  openSubtask.call(self, "id:s1");
  assert.deepEqual(self.cancelled, [parent]);
  assert.equal(self._form.wrote, true);
});

test("a saved row carries the open service; its name lets the click through", () => {
  const n = FORM.indexOf("function subtaskRow");
  const row = FORM.slice(n, FORM.indexOf("// Progress rail", n));
  assert.match(row, /service: s\.id \? "cal-subtask-open" : undefined|s\.id\s*\?\s*\{[^}]*service: "cal-subtask-open"/);
  assert.match(row, /className: `\$\{pfx\}__subtask-name`, content: s\.title \|\| "", active: 0/);
});

test("_loadSubtasks keeps the description a subtask opens with", () => {
  const body = sliceFunction(SRC, "async _loadSubtasks(form)");
  assert.match(body, /description: t\.description \|\| ""/);
});

test("onUiEvent routes cal-subtask-open", () => {
  const at = SRC.indexOf('case "cal-subtask-open":');
  assert.ok(at > 0);
  assert.match(SRC.slice(at, at + 120), /_openSubtask\(cmd\.mget\("calSubKey"\)\)/);
});

// ── "Parent / child" crumb, as the board's tasks-panel__detail-parent ───────
test("a subtask's form remembers the parent it was opened from", () => {
  const parent = parentForm();
  const { self } = calendar(parent);
  openSubtask.call(self, "id:s1");
  assert.equal(self._form.parentRow, parent.row);
});

const openParent = eval(`(${sliceFunction(SRC, "_openParentTask()")})`);

test("the crumb's parent link reopens the parent, carrying a write", () => {
  const { self, opened } = calendar(parentForm());
  openSubtask.call(self, "id:s1");
  self._form.wrote = true;
  const child = self._form;
  openParent.call(self);
  assert.equal(opened.at(-1).id, "p1");
  assert.deepEqual(self.cancelled.at(-1), child);
  assert.equal(self._form.wrote, true);
});

test("no parent on record: the link does nothing", () => {
  const { self, opened } = calendar({ kind: "task", mode: "edit", row: { id: "x" }, draft: {} });
  openParent.call(self);
  assert.equal(opened.length, 0);
});

test("the form draws the crumb only for a subtask", () => {
  assert.match(FORM, /form\.parentRow\s*\?\s*Skeletons\.Box\.X\(\{\s*className: `\$\{pfx\}__detail-parent`/);
  assert.match(FORM, /className: `\$\{pfx\}__detail-parent-title`,[\s\S]{0,200}service: "cal-open-parent"/);
  assert.match(FORM, /className: `\$\{pfx\}__detail-parent-current`/);
  assert.match(SRC, /case "cal-open-parent":\s*return this\._openParentTask\(\);/);
});

test("the crumb sits in the modal head, above the title", () => {
  const head = FORM.slice(FORM.indexOf("className: `${pfx}__modal-head`"), FORM.indexOf("// Two columns; the skin stacks them"));
  assert.match(head, /__modal-head-main[\s\S]*__detail-parent[\s\S]*__modal-title/);
  const body = FORM.slice(FORM.indexOf("// Two columns; the skin stacks them"));
  assert.doesNotMatch(body, /__detail-parent/);
});

// ui-core binds a click to every widget not marked active:0, and that handler
// stopPropagation()s before triggerHandlers. The row's slots (the two chip
// cells and the × slot, 96px each) were left active, so a click anywhere in
// them died there and only a click on the name opened the subtask.
test("the row's slots let a click through to the row", () => {
  const n = FORM.indexOf("function subtaskRow");
  const row = FORM.slice(n, FORM.indexOf("// Progress rail", n));
  const inert = (cls) => new RegExp(`className: \`\\$\\{pfx\\}__${cls}\`,(\\s*//[^\\n]*)*\\s*active: 0,`);
  assert.match(row, inert("subtask-cell"));
  assert.match(row, inert("subtask-end"));
  // The open dropdown keeps swallowing its own background clicks.
  assert.doesNotMatch(row, /className: `\$\{pfx\}__subtask-menu`,\s*active: 0/);
});
