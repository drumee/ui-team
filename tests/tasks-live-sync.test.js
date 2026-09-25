const test = require("node:test");
const assert = require("node:assert/strict");
const {
  rowOf,
  ownedPatch,
  applyLabelOps,
  longestList,
  peerPatch,
} = require("../src/drumee/builtins/window/tasks/live-sync");

test("rowOf unwraps arrays and rejects rows without id", () => {
  assert.deepEqual(rowOf([{ id: "a" }]), { id: "a" });
  assert.deepEqual(rowOf({ id: "a" }), { id: "a" });
  assert.equal(rowOf(undefined), null);
  assert.equal(rowOf([]), null);
  assert.equal(rowOf({ error: "x" }), null);
});

test("ownedPatch keeps only the fields the service owns", () => {
  const row = { id: "t", title: "new", status: "todo", assignee_uids: "u1", mtime: 9 };
  assert.deepEqual(ownedPatch("task.update", row), { id: "t", title: "new", mtime: 9 });
  assert.deepEqual(ownedPatch("task.update_status", { ...row, rank: 3 }), {
    id: "t", status: "todo", rank: 3, mtime: 9,
  });
  assert.deepEqual(ownedPatch("task.update_assignee", row), {
    id: "t", assignee_uids: "u1", mtime: 9,
  });
});

test("ownedPatch returns the whole row for task.create and null for no row", () => {
  const row = { id: "t", title: "x", status: "todo" };
  assert.deepEqual(ownedPatch("task.create", row), row);
  assert.equal(ownedPatch("task.update", null), null);
});

test("applyLabelOps applies only successful ops, no duplicates", () => {
  const ops = [
    { op: "link", label_id: "b", ok: true },
    { op: "link", label_id: "a", ok: true },
    { op: "link", label_id: "c", ok: false },
    { op: "unlink", label_id: "x", ok: true },
    { op: "unlink", label_id: "y", ok: false },
  ];
  assert.deepEqual(applyLabelOps(["a", "x", "y"], ops), ["a", "y", "b"]);
  assert.deepEqual(applyLabelOps(undefined, []), []);
});

test("longestList picks the most complete file list", () => {
  assert.deepEqual(longestList([[1], [1, 2], undefined, [2]]), [1, 2]);
  assert.equal(longestList([undefined, null]), null);
});

test("peerPatch: full-row services pass the row through", () => {
  for (const s of ["task.create", "task.update", "task.update_status", "task.update_assignee"]) {
    assert.deepEqual(peerPatch(s, [{ id: "t", title: "x" }]), { id: "t", title: "x" });
  }
  // hub.delete_contributor announces on update_assignee WITHOUT a row
  assert.equal(peerPatch("task.update_assignee", { hub_id: "h", uid: "u" }), null);
});

test("peerPatch: label pushes", () => {
  assert.deepEqual(
    peerPatch("task.link_label", { task_id: "t", labels: [{ label_id: "a" }, { label_id: "b" }] }),
    { id: "t", label_ids: ["a", "b"] },
  );
  assert.deepEqual(
    peerPatch("task.unlink_label", { task_id: "t", label_id: "a" }, { id: "t", label_ids: ["a", "b"] }),
    { id: "t", label_ids: ["b"] },
  );
  // unlink with no cached row cannot be resolved
  assert.equal(peerPatch("task.unlink_label", { task_id: "t", label_id: "a" }, null), null);
});

test("peerPatch: file pushes", () => {
  const files = [{ file_nid: "n1" }, { file_nid: "n2" }];
  assert.deepEqual(peerPatch("task.link_file", { task_id: "t", files }), {
    id: "t", linked_files: files,
  });
  assert.deepEqual(
    peerPatch("task.unlink_file", { task_id: "t", file_nid: "n1" }, { id: "t", linked_files: files }),
    { id: "t", linked_files: [{ file_nid: "n2" }] },
  );
  assert.equal(peerPatch("task.link_file", { task_id: "t" }), null);
});

test("peerPatch: unknown service is unresolvable", () => {
  assert.equal(peerPatch("task.column_update", { id: "c" }), null);
});
