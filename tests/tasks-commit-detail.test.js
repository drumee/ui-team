// tasks-commit-detail.test.js — the detail card's Update, end to end.
//
//   node --test tests/tasks-commit-detail.test.js
//
// Runs the REAL `_commitDetail`: the method is sliced out of the panel's
// index.js and evaluated against a stub panel, rather than copy-pasted here.
// index.js itself can't be required under plain node (webpack aliases, DOM),
// and the method's contract is exactly what it posts and what it leaves open.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const helpers = require("../src/drumee/builtins/window/tasks/detail-commit");
const liveSync = require("../src/drumee/builtins/window/tasks/live-sync");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/tasks/index.js"),
  "utf8",
);

function sliceMethod(name) {
  const start = SRC.indexOf(`\n  async ${name}() {`);
  assert.ok(start > -1, `${name} not found in index.js`);
  const end = SRC.indexOf("\n  }\n", start);
  return SRC.slice(start, end + 4).replace(`async ${name}()`, `async function ${name}()`);
}

const SERVICE = {
  task: {
    update: "task.update",
    update_status: "task.update_status",
    update_assignee: "task.update_assignee",
    link_label: "task.link_label",
    unlink_label: "task.unlink_label",
    link_file: "task.link_file",
  },
};
const LOCALE = { ERROR_NETWORK: "network error" };

const commitDetail = (Wm) =>
  new Function(
    "SERVICE", "Wm", "LOCALE", "snapshotTask", "planDetailCommit",
    "advanceBase", "settlePendingFiles", "rowOf", "ownedPatch",
    "applyLabelOps", "longestList",
    `${sliceMethod("_commitDetail")}\nreturn _commitDetail;`,
  )(
    SERVICE, Wm, LOCALE, helpers.snapshotTask, helpers.planDetailCommit,
    helpers.advanceBase, helpers.settlePendingFiles, liveSync.rowOf,
    liveSync.ownedPatch, liveSync.applyLabelOps, liveSync.longestList,
  );

// A successful answer for each service, shaped like the server's: the row
// as it is AFTER the write.
function ok(args, task) {
  const { service, hub_id, id, mention_uids, ...fields } = args;
  switch (args.service) {
    case "task.update":
      return [{ ...task, ...fields }];
    case "task.update_status":
      return [{ ...task, status: args.status }];
    case "task.update_assignee":
      return [{ ...task, assignee_uids: args.assignee_uids }];
    case "task.link_label":
      return [{ task_id: task.id, label_id: args.label_id }];
    case "task.unlink_label":
      return { task_id: task.id, label_id: args.label_id, affected: 1 };
    case "task.link_file":
      return [{ task_id: task.id, file_nid: args.file_nid }];
    default:
      return undefined;
  }
}

const TASK = {
  id: "t1",
  title: "Write spec",
  description: "",
  due_date: "2026-10-01",
  start_date: "",
  status: "todo",
  priority: "medium",
  reporter_uid: "alice",
  created_by: "alice",
  assignee_uids: ["alice"],
  label_ids: ["l1"],
};

// `opened` is the task as the card opened; `now` is the cache at Update time.
function makePanel({ opened = TASK, now = opened, edit = {}, fail = () => false }) {
  const alerts = [];
  const posted = [];
  const base = helpers.snapshotTask(opened, {
    assignees: opened.assignee_uids,
    noStatus: "todo",
  });
  const draft = {
    ...helpers.snapshotTask(opened, { assignees: opened.assignee_uids, noStatus: "todo" }),
    mention_uids: [],
    _mentioned_before: [],
    pending_files: [],
    ...edit,
  };
  const panel = {
    _detailId: opened.id,
    _detailDraft: draft,
    _detailBase: base,
    _detailReturnTo: null,
    _tasks: [{ ...now }],
    _hubId: "h1",
    closed: false,
    uploads: 0,
    loads: 0,
    getDefaultStatus: () => "todo",
    getKnownAssignees: (t) => t.assignee_uids || [],
    _captureDetailDraft() {},
    _setSubmitting() {},
    _resetFileSearch() {},
    _render() {},
    _renderOverlays() {},
    _openDetail() {},
    _refreshPendingList() {},
    _syncSubtaskBadges() {},
    _repaintBoard() {},
    _refreshAttachmentsList() {},
    async _refreshAttachments() {},
    // The in-place cache patch the perf path uses instead of a reload.
    _mergeTask(patch) {
      const i = panel._tasks.findIndex((t) => t.id === patch.id);
      if (i > -1) panel._tasks[i] = { ...panel._tasks[i], ...patch };
    },
    _closeDetailSilently(done) {
      panel._detailId = null;
      panel._detailDraft = null;
      panel.closed = true;
      if (done) done();
    },
    _dismissOverlay(_, done) {
      panel.closed = true;
      if (done) done();
    },
    // Must never run on a save: that is the point of the perf path.
    async _loadTasks() {
      panel.loads += 1;
    },
    async _uploadPendingFile(pf) {
      panel.uploads += 1;
      return { nid: `up-${pf.localKey}` };
    },
    async postService(args) {
      posted.push(args);
      return fail(args) ? undefined : ok(args, panel._tasks[0]);
    },
  };
  panel._commitDetail = commitDetail({ alert: (m) => alerts.push(m) });
  return { panel, posted, alerts };
}

const sent = (posted, service) => posted.filter((p) => p.service === service);

test("a peer's priority change is not written back when I only rename", async () => {
  const { panel, posted } = makePanel({
    now: { ...TASK, priority: "urgent" },
    edit: { title: "Write the spec" },
  });
  await panel._commitDetail();
  const [upd] = sent(posted, "task.update");
  assert.equal(upd.title, "Write the spec");
  assert.equal("priority" in upd, false);
});

test("a peer's column move is not undone when I edit the description", async () => {
  const { panel, posted } = makePanel({
    now: { ...TASK, status: "in_progress" },
    edit: { description: "more" },
  });
  await panel._commitDetail();
  assert.equal(sent(posted, "task.update_status").length, 0);
});

test("a peer's label is not unlinked when I toggle another", async () => {
  const { panel, posted } = makePanel({
    now: { ...TASK, label_ids: ["l1", "l9"] },
    edit: { labels: ["l1", "l2"] },
  });
  await panel._commitDetail();
  assert.deepEqual(sent(posted, "task.unlink_label"), []);
  assert.deepEqual(sent(posted, "task.link_label").map((p) => p.label_id), ["l2"]);
});

test("success closes the card", async () => {
  const { panel, alerts } = makePanel({ edit: { title: "New" } });
  await panel._commitDetail();
  assert.equal(panel.closed, true);
  assert.equal(panel._detailDraft, null);
  assert.deepEqual(alerts, []);
});

test("a failed update keeps the card open with the draft, and says so", async () => {
  const { panel, alerts } = makePanel({
    edit: { title: "New" },
    fail: (a) => a.service === "task.update",
  });
  await panel._commitDetail();
  assert.equal(panel.closed, false);
  assert.equal(panel._detailDraft.title, "New");
  assert.equal(alerts.length, 1);
});

test("retry after a partial failure re-sends only what did not land", async () => {
  let linkFails = true;
  const { panel, posted } = makePanel({
    edit: { title: "New", labels: ["l1", "l2"] },
    fail: (a) => a.service === "task.link_label" && linkFails,
  });
  await panel._commitDetail();
  assert.equal(panel.closed, false);
  posted.length = 0;
  linkFails = false;
  await panel._commitDetail();
  assert.deepEqual(posted.map((p) => p.service), ["task.link_label"]);
  assert.equal(panel.closed, true);
});

test("retry links an already-uploaded file instead of uploading it again", async () => {
  let linkFails = true;
  const { panel, posted } = makePanel({
    edit: { pending_files: [{ localKey: "a", file: { name: "a.png" } }] },
    fail: (a) => a.service === "task.link_file" && linkFails,
  });
  await panel._commitDetail();
  assert.equal(panel.closed, false);
  assert.equal(panel.uploads, 1);
  posted.length = 0;
  linkFails = false;
  await panel._commitDetail();
  assert.equal(panel.uploads, 1);
  assert.deepEqual(sent(posted, "task.link_file").map((p) => p.file_nid), ["up-a"]);
  assert.equal(panel.closed, true);
});

test("a file that linked leaves the pending list when a sibling call fails", async () => {
  const { panel } = makePanel({
    edit: { title: "New", pending_files: [{ nid: "n1" }] },
    fail: (a) => a.service === "task.update",
  });
  await panel._commitDetail();
  assert.equal(panel.closed, false);
  assert.deepEqual(panel._detailDraft.pending_files, []);
});

// The user moves to another card (a child row) while the calls are in flight.
function switchCardMidFlight(panel, service) {
  const other = { ...TASK, id: "t2", title: "Child" };
  const otherBase = helpers.snapshotTask(other, { assignees: other.assignee_uids, noStatus: "todo" });
  const otherDraft = { ...otherBase, pending_files: [] };
  const post = panel.postService;
  panel.postService = async (args) => {
    if (args.service === service) {
      panel._detailId = other.id;
      panel._detailDraft = otherDraft;
      panel._detailBase = otherBase;
    }
    return post(args);
  };
  return { otherBase, otherDraft };
}

test("a failed commit does not touch the card the user switched to", async () => {
  const { panel } = makePanel({
    edit: { title: "New", labels: ["l1", "l2"] },
    fail: (a) => a.service === "task.link_label",
  });
  const { otherBase, otherDraft } = switchCardMidFlight(panel, "task.link_label");
  await panel._commitDetail();
  assert.equal(panel._detailBase, otherBase);
  assert.equal(panel._detailDraft, otherDraft);
});

test("a successful commit does not close the card the user switched to", async () => {
  const { panel } = makePanel({ edit: { title: "New" } });
  const { otherDraft } = switchCardMidFlight(panel, "task.update");
  await panel._commitDetail();
  assert.equal(panel.closed, false);
  assert.equal(panel._detailDraft, otherDraft);
});

test("a retry does not notify a tag the landed update already notified", async () => {
  let linkFails = true;
  const { panel, posted } = makePanel({
    edit: {
      description: "hi [@Cy](user:cy)",
      mention_uids: ["cy"],
      labels: ["l1", "l2"],
    },
    fail: (a) => a.service === "task.link_label" && linkFails,
  });
  await panel._commitDetail();
  assert.deepEqual(sent(posted, "task.update")[0].mention_uids, ["cy"]);
  // The update landed; the user edits the description again and retries.
  panel._detailDraft.description = "hi [@Cy](user:cy) again";
  posted.length = 0;
  linkFails = false;
  await panel._commitDetail();
  assert.deepEqual(sent(posted, "task.update")[0].mention_uids, []);
});

test("a successful save reloads nothing and patches the cache in place", async () => {
  const { panel, posted } = makePanel({ edit: { title: "New", priority: "high" } });
  await panel._commitDetail();
  assert.equal(panel.loads, 0);
  assert.equal(sent(posted, "task.list").length, 0);
  assert.equal(panel._tasks[0].title, "New");
  assert.equal(panel._tasks[0].priority, "high");
});
