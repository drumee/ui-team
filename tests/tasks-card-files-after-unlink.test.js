// tests/tasks-card-files-after-unlink.test.js — the card's file strip after
// removing a linked file in the detail panel.
//
//   node --test tests/tasks-card-files-after-unlink.test.js
//
// Repro: upload 3 files on a task's detail, Update, remove one, Update — the
// card (tasks-panel__task-files) still showed all three. The ✕ unlinks at
// once (_unlinkAttachment), so Update has no file op to send and never
// patches the row; the server's broadcast skips the caller's socket. Runs the
// REAL panel methods, sliced out of index.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const { peerPatch } = require(path.join(DIR, "live-sync.js"));

const build = (sig, ...names) =>
  new Function(...names, `return ${sliceFunction(SRC, sig)}`);

const normalizeTask = build("_normalizeTask(row)")();
const mergeTask = build("_mergeTask(row)")();
const unlinkAttachment = build("async _unlinkAttachment(trigger)", "SERVICE")({
  task: { unlink_file: "task.unlink_file" },
});

function panel(tasks) {
  const p = {
    _hubId: "hub1",
    _tasks: [],
    _attachments: {},
    posted: [],
    repaints: 0,
    postService(o) { this.posted.push(o); return Promise.resolve({ task_id: o.task_id, file_nid: o.file_nid }); },
    _repaintBoard() { this.repaints++; return Promise.resolve(); },
    _refreshAttachmentsList() {},
    _refreshFileSearchDropdown() {},
  };
  p._normalizeTask = normalizeTask.bind(p);
  p._mergeTask = mergeTask.bind(p);
  p._unlinkAttachment = unlinkAttachment.bind(p);
  p._tasks = tasks.map(p._normalizeTask);
  return p;
}

const trigger = (taskId, fileNid) => ({ mget: (k) => ({ taskId, fileNid })[k] });

test("removing a linked file in the detail drops its chip from the card", async () => {
  // Shape the detail commit merges in after the 3 uploads (task_link_file).
  const files = ["a", "b", "c"].map((n) => ({ task_id: "t1", file_nid: n, filename: n, extension: "pdf" }));
  const p = panel([{ id: "t1", title: "T", linked_files: files }]);
  p._attachments.t1 = files.slice();

  await p._unlinkAttachment(trigger("t1", "b"));

  assert.deepEqual(p._tasks[0].linked_files.map((f) => f.file_nid), ["a", "c"]);
  assert.equal(p.repaints, 1, "the board under the overlay is repainted");
  assert.deepEqual(p._attachments.t1.map((f) => f.file_nid), ["a", "c"]);
});

test("same, for a card loaded by task.list (entries carry `nid`, not `file_nid`)", async () => {
  const p = panel([{
    id: "t1",
    linked_files: JSON.stringify([{ nid: "a", filename: "a" }, { nid: "b", filename: "b" }]),
  }]);
  await p._unlinkAttachment(trigger("t1", "a"));
  assert.deepEqual(p._tasks[0].linked_files.map((f) => f.file_nid), ["b"]);
});

test("a peer's unlink now matches a task.list-loaded card", () => {
  const p = panel([{ id: "t1", linked_files: [{ nid: "a" }, { nid: "b" }] }]);
  const patch = peerPatch("task.unlink_file", { task_id: "t1", file_nid: "a" }, p._tasks[0]);
  assert.deepEqual(patch.linked_files.map((f) => f.file_nid), ["b"]);
});
