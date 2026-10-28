// tests/calendar-close-form-no-reload.test.js — closing the calendar's modal
// re-feeds the modal only. The page is reloaded only when something changed:
// a push held back while the modal was open (_dirty), or a write the form
// made itself (form.wrote — subtasks, files, a task saved before a failure).
//
//   node --test tests/calendar-close-form-no-reload.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const CAL_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/builtins/panel/calendar/index.js"),
  "utf8"
);
const closeForm = eval(`(${sliceFunction(CAL_SRC, "_closeForm()")})`);
const markFormWrote = eval(`(${sliceFunction(CAL_SRC, "_markFormWrote(form = this._form)")})`);

function calendar(form, dirty = false) {
  return {
    _form: form,
    _dirty: dirty,
    reloads: 0,
    modals: 0,
    _cancelFormUploads() {},
    _renderModal() {
      this.modals++;
    },
    _reload() {
      this.reloads++;
    },
    _markFormWrote: markFormWrote,
  };
}

test("Cancel on a task form that wrote nothing leaves the page alone", () => {
  const self = calendar({ kind: "task", draft: {} });
  closeForm.call(self);
  assert.equal(self.modals, 1);
  assert.equal(self.reloads, 0);
});

test("closing a meeting form leaves the page alone", () => {
  const self = calendar({ kind: "meeting", draft: {} });
  closeForm.call(self);
  assert.equal(self.reloads, 0);
});

test("a form that wrote (subtask, file, task) reloads on close", () => {
  const self = calendar({ kind: "task", draft: {} });
  self._markFormWrote();
  closeForm.call(self);
  assert.equal(self.reloads, 1);
});

test("a push held back while the modal was open reloads on close", () => {
  const self = calendar({ kind: "task", draft: {} }, true);
  closeForm.call(self);
  assert.equal(self.reloads, 1);
});

test("every write a form can make while staying open marks it", () => {
  // The writes that leave the modal open — a later Cancel must still reload.
  for (const sig of [
    "async _removeFile(key)",
    "_createSubtask(form, s)",
    "async _removeSubtask(key)",
    "async _setSubtaskValue(key, kind, value)",
    "async _writeTask(draft, title)",
    "async _linkTaskFiles(hub_id, task_id, nids)",
  ]) {
    const body = sliceFunction(CAL_SRC, sig);
    const mark = body.search(/form\.wrote = true|this\._markFormWrote\(\)/);
    const post = body.indexOf("this.postService(");
    assert.ok(mark >= 0 && post >= 0 && mark < post, `${sig} marks the form before it posts`);
  }
});
