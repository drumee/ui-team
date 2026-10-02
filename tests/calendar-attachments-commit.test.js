// tests/calendar-attachments-commit.test.js
//   node --test tests/calendar-attachments-commit.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const A = require("../src/drumee/builtins/panel/calendar/attachments");

const SRC = fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/panel/calendar/index.js"), "utf8");
const METHODS = [
  "async _gateFiles(form)", "async _linkTaskFiles(hub_id, task_id, nids)", "async _linkMeetingFiles(nid, nids)",
  "async _writeTask(draft, title)", "async _loadLinkedFiles(form)", "async _submitTask()",
];

function harness({ answers = {}, confirm = "keep" } = {}) {
  const said = [];
  const asked = [];
  const posted = [];
  const UploadProgress = { confirmUnfinished: async (o) => { asked.push(o); return confirm; }, dropEntries: () => {} };
  const req = (m) => (m === "window/upload-progress" ? UploadProgress : null);
  const self = {
    _personalHub: "me", _personalNid: "home",
    _renderFiles() {}, _renderModal() {}, _reload: async () => {},
    _absorbFormText() { return this._form.draft; },
    _validateRequired: () => true,
    _cancelFormUploads() {},
    _showToast: (m, k) => said.push([m, k]),
    postService: async (o) => { posted.push(o); const a = answers[o.service]; return typeof a === "function" ? a(o) : a; },
    fetchService: async (o) => { posted.push(o); return answers[o.service]; },
  };
  global.Butler = { say: (m) => said.push(m) };
  global.LOCALE = new Proxy({}, { get: (_t, k) => k });
  global.Wm = { alert: (m) => said.push(m) };
  for (const sig of METHODS) {
    const fn = new Function("require", "A", "SERVICE", "rowOf", `return ${sliceFunction(SRC, sig)}`)(
      req, A, {}, (r) => { const row = Array.isArray(r) ? r[0] : r; return row && row.id ? row : null; });
    self[fn.name] = fn.bind(self);
  }
  return { self, said, asked, posted };
}

test("create links every uploaded file to the new task, on the personal hub", async () => {
  const { self, posted } = harness({ answers: { "task.create": [{ id: "t1" }], "task.link_file": (o) => [{ file_nid: o.file_nid }] } });
  self._form = { kind: "task", mode: "create", draft: { title: "T", files: [
    { localKey: "l1", nid: "n1", status: "queued" }, { localKey: "l2", nid: "n2", status: "queued" }] } };
  await self._writeTask(self._form.draft, "T");
  const links = posted.filter((p) => p.service === "task.link_file").map((p) => [p.hub_id, p.task_id, p.file_nid]);
  assert.deepEqual(links, [["me", "t1", "n1"], ["me", "t1", "n2"]]);
  assert.equal(self._form, null);
});

test("a refused link is reported, the task still exists", async () => {
  const { self, said } = harness({ answers: { "task.create": [{ id: "t1" }], "task.link_file": () => ({ error: "x" }) } });
  self._form = { kind: "task", mode: "create", draft: { title: "T", files: [{ localKey: "l1", nid: "n1", status: "queued" }] } };
  await self._writeTask(self._form.draft, "T");
  assert.deepEqual(said, [["CAL_FILES_NOT_ATTACHED", "error"]]);
});

test("edit links only the newly added files, on the row's hub", async () => {
  const { self, posted } = harness({ answers: { "task.update": [{ id: "t1" }], "task.link_file": (o) => [o] } });
  self._form = { kind: "task", mode: "edit", row: { id: "t1", hub_id: "me", status: "todo" }, draft: { title: "T", status: "todo", files: [
    { nid: "old", linked: 1, status: "linked" }, { localKey: "l2", nid: "new", status: "queued" }] } };
  await self._writeTask(self._form.draft, "T");
  assert.deepEqual(posted.filter((p) => p.service === "task.link_file").map((p) => p.file_nid), ["new"]);
});

test("submit with a failed file is refused (Review Focus 5)", async () => {
  const { self, said, posted } = harness();
  self._form = { kind: "task", mode: "create", draft: { title: "T", files: [{ localKey: "l1", status: "error" }] } };
  await self._submitTask();
  assert.deepEqual(said, ["CAL_FILES_FAILED"]);
  assert.equal(posted.length, 0);
});

test("submit waits on unfinished uploads: keep → no write (Review Focus 5)", async () => {
  const { self, asked, posted } = harness({ confirm: "keep" });
  const job = { cancelEntry: () => true };
  self._form = { kind: "task", mode: "create", draft: { title: "T", files: [
    { localKey: "l1", file: {}, status: "uploading", bundleEntry: { status: "uploading" }, bundleJob: job }] } };
  await self._submitTask();
  assert.equal(asked.length, 1);
  assert.equal(asked[0].action, "create");
  assert.equal(posted.length, 0);
});

test("meeting: link_files gets every uploaded nid", async () => {
  const { self, posted } = harness({ answers: { "room.link_files": { nid: "m1", attachments: ["n1"] } } });
  assert.equal(await self._linkMeetingFiles("m1", ["n1"]), true);
  assert.deepEqual(posted.map((p) => [p.service, p.hub_id, p.nid, p.file_nids]), [["room.link_files", "me", "m1", ["n1"]]]);
  assert.equal(await self._linkMeetingFiles("m1", []), true);
  assert.equal(posted.length, 1);
});

test("edit mode loads the task's linked files as removable chips", async () => {
  const { self } = harness({ answers: { "task.get_linked_files": [{ file_nid: "n1", filename: "a", extension: "pdf" }] } });
  const form = { kind: "task", mode: "edit", row: { id: "t1", hub_id: "me" }, draft: { files: [] } };
  self._form = form;
  await self._loadLinkedFiles(form);
  assert.deepEqual(form.draft.files, [{ nid: "n1", linked: 1, status: "linked", filename: "a", extension: "pdf" }]);
});
