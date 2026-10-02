// tests/calendar-attachments-controller.test.js
//   node --test tests/calendar-attachments-controller.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const A = require("../src/drumee/builtins/panel/calendar/attachments");

const SRC = fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/panel/calendar/index.js"), "utf8");
const METHODS = [
  "async _stageFiles(files)", "async _startUploads(form)", "_onFileDone(form, entry, node)",
  "_onBatchDone(form, pfs)", "async _removeFile(key)", "_retryFile(key)", "_cancelFormUploads(form)",
  "_onDrop(e)", "_closeForm()",
];

function harness({ runBundle, answer } = {}) {
  const dropped = [];
  const said = [];
  const UploadProgress = {
    runBundle: runBundle || (async (roots, dest, hub, _t, opt) => {
      opt.onJob({ id: "job" });
      return {};
    }),
    dropEntries: (items) => { dropped.push(...items); items.forEach((it) => (it.entry.status = "canceled")); },
  };
  const Entry = { entriesFromFileList: (files) => files.map((f) => ({ source: f, status: "queued" })) };
  const req = (m) => (m === "window/upload-progress" ? UploadProgress : m === "media/bundle/entry" ? Entry : null);
  const self = {
    fig: { family: "calendar-main" },
    _personalHub: "me",
    _form: { kind: "task", mode: "create", draft: { files: [] } },
    _attachmentNid: async () => "dest",
    _renderFiles() { this.rendered = (this.rendered || 0) + 1; },
    _renderModal() {},
    _reload: async () => {},
    postService: async (o) => { self.posted.push(o); return answer ? answer(o) : [o]; },
    posted: [],
  };
  global.Butler = { say: (m) => said.push(m) };
  global.LOCALE = new Proxy({}, { get: (_t, k) => k });
  global.URL = { revokeObjectURL: () => {}, createObjectURL: () => "blob:x" };
  global.Wm = { alert: (m) => said.push(m) };
  for (const sig of METHODS) {
    const fn = new Function("require", "A", "SERVICE", `return ${sliceFunction(SRC, sig)}`)(req, A, {});
    self[fn.name] = fn.bind(self);
  }
  return { self, dropped, said };
}

test("staging a file queues it, renders, and starts an upload into the task folder", async () => {
  let call;
  const { self } = harness({ runBundle: async (roots, dest, hub, _t, opt) => { call = { roots, dest, hub }; opt.onJob({}); } });
  await self._stageFiles([{ name: "a.pdf" }]);
  assert.equal(self._form.draft.files.length, 1);
  assert.equal(self._form.draft.files[0].status, "uploading");
  assert.deepEqual([call.dest, call.hub, call.roots.length], ["dest", "me", 1]);
  assert.ok(self.rendered >= 1);
});

test("over the limit: the extra files are refused out loud", async () => {
  const { self, said } = harness();
  await self._stageFiles(Array.from({ length: A.MAX_FILES + 1 }, (_, i) => ({ name: `f${i}` })));
  assert.equal(self._form.draft.files.length, A.MAX_FILES);
  assert.deepEqual(said, ["CAL_FILES_LIMIT"]);
});

test("file done → nid recorded, status queued (= waiting for the commit to link it)", async () => {
  let opt;
  const { self } = harness({ runBundle: async (_r, _d, _h, _t, o) => { opt = o; o.onJob({}); } });
  await self._stageFiles([{ name: "a.pdf" }]);
  const pf = self._form.draft.files[0];
  opt.onFileDone({ nid: "n1" }, null, pf.bundleEntry);
  assert.deepEqual([pf.nid, pf.status], ["n1", "queued"]);
});

test("late file-done for a closed form is ignored (Review Focus 2)", async () => {
  let opt;
  const { self } = harness({ runBundle: async (_r, _d, _h, _t, o) => { opt = o; o.onJob({}); } });
  await self._stageFiles([{ name: "a.pdf" }]);
  const form = self._form;
  const pf = form.draft.files[0];
  self._form = { kind: "task", draft: { files: [] } };
  const before = self.rendered;
  opt.onFileDone({ nid: "n1" }, null, pf.bundleEntry);
  assert.equal(self.rendered, before);
});

test("closing cancels in-flight uploads (Review Focus 2)", async () => {
  const { self, dropped } = harness();
  await self._stageFiles([{ name: "a.pdf" }]);
  self._closeForm();
  assert.equal(dropped.length, 1);
  assert.equal(self._form, null);
});

test("remove: a staged file leaves the list; an uploading one is cancelled first", async () => {
  const { self, dropped } = harness();
  await self._stageFiles([{ name: "a.pdf" }, { name: "b.pdf" }]);
  const key = A.fileKey(self._form.draft.files[0]);
  await self._removeFile(key);
  assert.equal(self._form.draft.files.length, 1);
  assert.equal(dropped.length, 1);
});

test("remove: a linked file in edit mode is unlinked on the server, on the row's hub", async () => {
  // task.unlink_file answers an OBJECT ({task_id, file_nid, ...}), not a list.
  const { self, said } = harness({ answer: (o) => ({ task_id: o.task_id, file_nid: o.file_nid }) });
  self._form = { kind: "task", mode: "edit", row: { id: "t1", hub_id: "me" },
    draft: { files: [{ nid: "n9", linked: 1, status: "linked", filename: "x", extension: "" }] } };
  await self._removeFile("nid:n9");
  assert.deepEqual(self.posted.map((p) => [p.service, p.hub_id, p.task_id, p.file_nid]), [["task.unlink_file", "me", "t1", "n9"]]);
  assert.equal(self._form.draft.files.length, 0);
  assert.deepEqual(said, []);
});

test("remove: a refused unlink keeps the chip and says so", async () => {
  const { self, said } = harness({ answer: () => ({ error: "x", reason: "nope" }) });
  self._form = { kind: "task", mode: "edit", row: { id: "t1", hub_id: "me" },
    draft: { files: [{ nid: "n9", linked: 1, status: "linked", filename: "x", extension: "" }] } };
  await self._removeFile("nid:n9");
  assert.equal(self._form.draft.files.length, 1);
  assert.deepEqual(said, ["ERROR_NETWORK"]);
});

test("retry re-queues an errored file and starts it again", async () => {
  let runs = 0;
  const { self } = harness({ runBundle: async (_r, _d, _h, _t, o) => { runs++; o.onJob({}); } });
  await self._stageFiles([{ name: "a.pdf" }]);
  const pf = self._form.draft.files[0];
  pf.status = "error"; pf.bundleEntry = null; pf.bundleJob = null;
  self._retryFile(A.fileKey(pf));
  await new Promise((r) => setImmediate(r));
  assert.equal(runs, 2);
  assert.equal(pf.status, "uploading");
});

test("drop outside the zone is refused and stopped (Review Focus 3)", () => {
  const { self, said } = harness();
  let stopped = 0, prevented = 0;
  const modal = { contains: () => true };
  self.el = { querySelector: () => modal };
  const e = {
    dataTransfer: { types: ["Files"], files: [{ name: "a.pdf" }] },
    target: { closest: () => null },
    preventDefault: () => prevented++, stopPropagation: () => stopped++,
  };
  self._onDrop(e);
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.deepEqual(said, ["WRONG_DROP_AREA"]);
  assert.equal(self._form.draft.files.length, 0);
});

test("_renderFiles re-feeds the chips and restamps the zone's file count", () => {
  const fn = new Function("require", "A", "SERVICE", "fileChips", "_",
    `return ${sliceFunction(SRC, "_renderFiles()")}`)(null, A, {}, (_ui, list) => list.map(() => ({})), { isFunction: (f) => typeof f === "function" });
  const attrs = {}, zoneAttrs = {};
  let fed = null;
  const zone = { setAttribute: (k, v) => (zoneAttrs[k] = v) };
  const part = { el: { setAttribute: (k, v) => (attrs[k] = v), closest: () => zone }, feed: (x) => (fed = x) };
  const self = { fig: { family: "calendar-main" }, getPart: () => part, _form: { draft: { files: [{}, {}] } } };
  fn.call(self);
  assert.equal(fed.length, 2);
  assert.deepEqual([attrs["data-count"], zoneAttrs["data-has-files"]], ["2", "1"]);
  self._form.draft.files = [];
  fn.call(self);
  assert.equal(zoneAttrs["data-has-files"], "0");
});
