const test = require("node:test");
const assert = require("node:assert/strict");
const {
  snapshotTask,
  planDetailCommit,
  advanceBase,
  settlePendingFiles,
} = require("../src/drumee/builtins/window/tasks/detail-commit");

const TASK = {
  id: "t1",
  title: "Write spec",
  description: "first",
  due_date: "2026-10-01",
  start_date: "",
  status: "todo",
  priority: "medium",
  reporter_uid: "alice",
  created_by: "alice",
  assignee_uids: ["alice", "bob"],
  label_ids: ["l1"],
};
const snap = (t) => snapshotTask(t, { assignees: t.assignee_uids || [], noStatus: "todo" });
const draftOf = (s, over = {}) => ({
  ...s,
  assignees: s.assignees.slice(),
  labels: s.labels.slice(),
  mention_uids: [],
  _mentioned_before: [],
  pending_files: [],
  ...over,
});

test("snapshotTask normalises defaults and copies arrays", () => {
  const s = snapshotTask(
    { id: "x", created_by: "carol", label_ids: ["a"] },
    { assignees: ["u"], noStatus: "todo" },
  );
  assert.deepEqual(s, {
    title: "", description: "", due_date: "", start_date: "",
    duration_on: false, status: "todo", priority: "medium",
    reporter_uid: "carol", assignees: ["u"], labels: ["a"],
  });
  const t = { label_ids: ["a"] };
  const s2 = snapshotTask(t, { assignees: [], noStatus: "todo" });
  s2.labels.push("b");
  assert.deepEqual(t.label_ids, ["a"]);
});

test("nothing touched: nothing sent", () => {
  const base = snap(TASK);
  assert.deepEqual(planDetailCommit(base, draftOf(base), base), {
    update: null, status: null, assignees: null, link: [], unlink: [],
  });
});

test("peer changed priority, I changed title: priority is NOT sent back", () => {
  const base = snap(TASK);
  const fresh = snap({ ...TASK, priority: "urgent" });
  const plan = planDetailCommit(base, draftOf(base, { title: "Write the spec" }), fresh);
  assert.deepEqual(plan.update, {
    title: "Write the spec",
    due_date: "2026-10-01",
    start_date: null,
  });
  assert.equal(plan.status, null);
});

test("untouched dates go back as the FRESH value, not the opened one", () => {
  const base = snap(TASK);
  const fresh = snap({ ...TASK, due_date: "2026-12-24" });
  const plan = planDetailCommit(base, draftOf(base, { priority: "high" }), fresh);
  assert.deepEqual(plan.update, {
    priority: "high",
    due_date: "2026-12-24",
    start_date: null,
  });
});

test("peer moved status, I did not: status is NOT sent", () => {
  const base = snap(TASK);
  const fresh = snap({ ...TASK, status: "in_progress" });
  assert.equal(planDetailCommit(base, draftOf(base), fresh).status, null);
});

test("same field changed by both: mine wins", () => {
  const base = snap(TASK);
  const fresh = snap({ ...TASK, status: "in_progress", title: "Peer title" });
  const plan = planDetailCommit(
    base,
    draftOf(base, { status: "to_review", title: "My title" }),
    fresh,
  );
  assert.equal(plan.status, "to_review");
  assert.equal(plan.update.title, "My title");
});

test("toggled back: nothing sent", () => {
  const base = snap(TASK);
  const plan = planDetailCommit(base, draftOf(base, { priority: "medium" }), base);
  assert.equal(plan.update, null);
});

test("my change already equals fresh: nothing sent", () => {
  const base = snap(TASK);
  const fresh = snap({ ...TASK, priority: "high" });
  assert.equal(planDetailCommit(base, draftOf(base, { priority: "high" }), fresh).update, null);
});

test("empty title is never sent", () => {
  const base = snap(TASK);
  assert.equal(planDetailCommit(base, draftOf(base, { title: "   " }), base).update, null);
});

test("description change sends only newly-tagged mentions", () => {
  const base = snap(TASK);
  const draft = draftOf(base, {
    description: "hi [@Bob](user:bob) [@Cy](user:cy)",
    mention_uids: ["bob", "cy"],
    _mentioned_before: ["bob"],
  });
  const plan = planDetailCommit(base, draft, base);
  assert.equal(plan.update.description, "hi [@Bob](user:bob) [@Cy](user:cy)");
  assert.deepEqual(plan.update.mention_uids, ["cy"]);
});

test("legacy reporter fallback is not a change", () => {
  const legacy = { ...TASK, reporter_uid: null, created_by: "alice" };
  const base = snap(legacy);
  const plan = planDetailCommit(base, draftOf(base, { title: "New" }), snap(legacy));
  assert.equal("reporter_uid" in plan.update, false);
});

test("reporter reassigned is sent", () => {
  const base = snap(TASK);
  const plan = planDetailCommit(base, draftOf(base, { reporter_uid: "bob" }), base);
  assert.equal(plan.update.reporter_uid, "bob");
});

test("duration off clears start, sends my dates", () => {
  const ranged = { ...TASK, start_date: "2026-09-25" };
  const base = snap(ranged);
  const fresh = snap({ ...ranged, due_date: "2026-11-11" });
  const plan = planDetailCommit(base, draftOf(base, { duration_on: false }), fresh);
  assert.deepEqual(plan.update, { due_date: "2026-10-01", start_date: null });
});

test("date touched but already equal to fresh: nothing sent", () => {
  const base = snap(TASK);
  const fresh = snap({ ...TASK, due_date: "2026-10-05" });
  const plan = planDetailCommit(base, draftOf(base, { due_date: "2026-10-05" }), fresh);
  assert.equal(plan.update, null);
});

test("assignees: my add/remove applied on top of the peer's set", () => {
  const base = snap(TASK); // alice, bob
  const fresh = snap({ ...TASK, assignee_uids: ["alice", "bob", "dan"] }); // peer added dan
  const draft = draftOf(base, { assignees: ["alice", "eve"] }); // I removed bob, added eve
  assert.deepEqual(planDetailCommit(base, draft, fresh).assignees, ["alice", "dan", "eve"]);
});

test("assignees untouched: not sent even when the peer changed them", () => {
  const base = snap(TASK);
  const fresh = snap({ ...TASK, assignee_uids: ["dan"] });
  assert.equal(planDetailCommit(base, draftOf(base), fresh).assignees, null);
});

test("labels: only my toggles, and only where fresh still differs", () => {
  const base = snap(TASK); // l1
  const fresh = snap({ ...TASK, label_ids: ["l1", "l9"] }); // peer added l9
  const draft = draftOf(base, { labels: ["l2"] }); // I removed l1, added l2
  const plan = planDetailCommit(base, draft, fresh);
  assert.deepEqual(plan.link, ["l2"]);
  assert.deepEqual(plan.unlink, ["l1"]); // l9 is NOT unlinked
});

test("advanceBase settles what landed", () => {
  const base = snap(TASK);
  const draft = draftOf(base, { title: "New", labels: ["l1", "l2", "l3"] });
  const next = advanceBase(base, draft, {
    update: true,
    status: false,
    assignees: false,
    labels: [
      { op: "link", label_id: "l2", ok: true },
      { op: "link", label_id: "l3", ok: false },
    ],
  });
  assert.equal(next.title, "New");
  assert.deepEqual(next.labels, ["l1", "l2"]);
  // Retry: only the failed label is planned; the title is not re-sent.
  const plan = planDetailCommit(next, draft, snap({ ...TASK, title: "New", label_ids: ["l1", "l2"] }));
  assert.equal(plan.update, null);
  assert.deepEqual(plan.link, ["l3"]);
});

test("advanceBase leaves failed groups untouched", () => {
  const base = snap(TASK);
  const draft = draftOf(base, { status: "complete", assignees: ["zed"] });
  const next = advanceBase(base, draft, { update: false, status: false, assignees: false, labels: [] });
  assert.deepEqual(next, base);
  assert.notEqual(next.labels, base.labels); // a copy, not the same array
});

test("settlePendingFiles drops linked, keeps failed with its uploaded nid", () => {
  const a = { localKey: "a", file: { name: "a.png" } };
  const b = { localKey: "b", file: { name: "b.png" } };
  const c = { localKey: "c", file: { name: "c.png" } };
  const d = { nid: "n-d" }; // added while the commit was in flight: no outcome
  const out = settlePendingFiles([a, b, c, d], [
    { pf: a, nid: "n-a", linked: true },
    { pf: b, nid: "n-b", linked: false }, // uploaded, link failed
    { pf: c, nid: null, linked: false }, // upload failed
  ]);
  assert.deepEqual(out, [
    { localKey: "b", file: { name: "b.png" }, nid: "n-b" },
    c,
    d,
  ]);
});
