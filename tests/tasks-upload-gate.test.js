// tests/tasks-upload-gate.test.js
//   node --test tests/tasks-upload-gate.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const pu = require("../src/drumee/builtins/window/tasks/pending-uploads");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/tasks/index.js"), "utf8");

function build(answer, { onAsk } = {}) {
  const asked = [];
  const UploadProgress = {
    // Mirrors the real window: on "skip" it cancels the items BEFORE resolving
    // (_resolveWarning → dropEntries), so the gate sees them already canceled.
    confirmUnfinished: async (opt) => {
      asked.push(opt);
      if (onAsk) onAsk(opt);
      if (answer === "skip") UploadProgress.dropEntries(opt.items);
      return answer;
    },
    dropEntries: (items) => items.filter((it) => it.job.cancelEntry(it.entry)).map((it) => it.entry),
  };
  const req = (m) => (m === "window/upload-progress" ? UploadProgress : null);
  const make = (sig) => new Function("require", "unfinishedPending", "abandonedPending", "itemsOf",
    `return ${sliceFunction(SRC, sig)}`)(req, pu.unfinishedPending, pu.abandonedPending, pu.itemsOf);
  return {
    asked,
    gate: make("async _gateUnfinishedUploads(scopeKey, draft)"),
    cancel: make("_cancelUnfinishedUploads(scopeKey, draft)"),
  };
}

const job = { cancelEntry: (e) => e.status !== "done" && ((e.status = "canceled"), true) };
const pf = (status, over = {}) => ({ bundleEntry: { id: status, status }, bundleJob: job, ...over });

function panel(draft, fns) {
  return {
    _createDefaults: draft,
    _detailDraft: null,
    refreshed: [],
    _draftForKey(k) { return k === "create" ? this._createDefaults : this._detailDraft; },
    _refreshPendingList(k) { this.refreshed.push(k); },
    _cancelUnfinishedUploads: fns.cancel,
  };
}

test("nothing in flight → commit without asking", async () => {
  const fns = build("keep");
  const draft = { pending_files: [{ nid: "n1" }] };
  assert.equal(await fns.gate.call(panel(draft, fns), "create", draft), true);
  assert.equal(fns.asked.length, 0);
});

test("keep → no commit, nothing dropped", async () => {
  const fns = build("keep");
  const live = pf("uploading");
  const draft = { pending_files: [live] };
  assert.equal(await fns.gate.call(panel(draft, fns), "create", draft), false);
  assert.equal(fns.asked[0].action, "create");
  assert.equal(draft.pending_files.length, 1);
});

test("skip → unfinished leave the draft; one that finished during the ask stays", async () => {
  const live = pf("uploading");
  const landing = pf("queued");
  const fns = build("skip", {
    onAsk: () => { landing.bundleEntry.status = "done"; landing.nid = "n7"; },
  });
  const draft = { pending_files: [live, landing, { nid: "n1" }] };
  const p = panel(draft, fns);
  assert.equal(await fns.gate.call(p, "create", draft), true);
  assert.deepEqual(draft.pending_files.map((f) => f.nid || f.bundleEntry.id), ["n7", "n1"]);
  assert.equal(live.bundleEntry.status, "canceled");
  assert.deepEqual(p.refreshed, ["create"]);
});

test("detail action is 'update'", async () => {
  const fns = build("keep");
  const draft = { pending_files: [pf("uploading")] };
  const p = panel(null, fns);
  p._detailDraft = draft;
  await fns.gate.call(p, "detail", draft);
  assert.equal(fns.asked[0].action, "update");
});

test("draft replaced while asking → no commit", async () => {
  const draft = { pending_files: [pf("uploading")] };
  let p;
  const fns = build("skip", { onAsk: () => { p._createDefaults = { pending_files: [] }; } });
  p = panel(draft, fns);
  assert.equal(await fns.gate.call(p, "create", draft), false);
});

test("a second press while asking is refused", async () => {
  const fns = build("keep");
  const draft = { pending_files: [pf("uploading")] };
  const p = panel(draft, fns);
  p._confirmingUploads = true;
  assert.equal(await fns.gate.call(p, "create", draft), false);
  assert.equal(fns.asked.length, 0);
});

test("both commits run the gate before any network call", () => {
  for (const sig of ["async _commitTask()", "async _commitDetail()"]) {
    const body = sliceFunction(SRC, sig);
    const gateAt = body.indexOf("_gateUnfinishedUploads(");
    assert.ok(gateAt > -1, `${sig} has no gate`);
    assert.ok(gateAt < body.indexOf("_setSubmitting("), `${sig} gates after locking`);
  }
});

function startHarness(runBundleResult) {
  const runs = [];
  const UploadProgress = {
    runBundle: async (roots, destNid, hubId, target, opt) => {
      runs.push({ roots, destNid, hubId, opt });
      return typeof runBundleResult === "function" ? runBundleResult(opt) : runBundleResult;
    },
  };
  const Entry = {
    entriesFromFileList: (files) =>
      files.filter((f) => f.name !== ".DS_Store").map((f, i) => ({ id: `be_${i}`, source: f, status: "queued", name: f.name })),
  };
  const req = (m) => (m === "window/upload-progress" ? UploadProgress : m === "media/bundle/entry" ? Entry : null);
  const deps = ["require", "pairEntries", "settleEagerFile", "settleEagerBatch"];
  const make = (sig) => new Function(...deps, `return ${sliceFunction(SRC, sig)}`)(
    req, pu.pairEntries, pu.settleEagerFile, pu.settleEagerBatch);
  const fileA = { name: "a.zip" }, ds = { name: ".DS_Store" };
  const draft = {
    pending_files: [{ file: fileA, filename: "a", extension: "zip", status: "queued" }, { file: ds }, { nid: "n1" }],
  };
  const statuses = [];
  const p = {
    _hubId: "h1",
    _createDefaults: draft,
    _draftForKey(k) { return k === "create" ? this._createDefaults : null; },
    _attachmentNid: async () => "task-folder",
    _setPendingStatus: (k, f, s) => { f.status = s; statuses.push(s); },
    _refreshPendingList() {},
    _patchPendingName() {},
    _refreshFileSearchDropdown() {},
    _onEagerFileDone: make("_onEagerFileDone(scopeKey, draft, entry, node)"),
    _onEagerBatchDone: make("_onEagerBatchDone(scopeKey, draft, pfs)"),
  };
  return { runs, draft, statuses, p, start: make("async _startEagerUploads(scopeKey)") };
}

test("_startEagerUploads sends paired files into the task folder and wires the callbacks", async () => {
  const job = { id: "j" };
  const h = startHarness((opt) => { opt.onJob(job); return {}; });
  await h.start.call(h.p, "create");
  assert.equal(h.runs.length, 1);
  assert.equal(h.runs[0].destNid, "task-folder");
  assert.equal(h.runs[0].roots.length, 1);
  const pfA = h.draft.pending_files[0];
  assert.equal(pfA.bundleJob, job);
  assert.equal(pfA.status, "uploading");
  // the server answers for that file
  h.runs[0].opt.onFileDone({ nid: "n5", filename: "a (1)", ext: "zip" }, "task-folder", pfA.bundleEntry);
  assert.equal(pfA.nid, "n5");
  assert.equal(pfA.status, "queued");
  // ignored file and already-linked file never went out
  assert.equal(h.draft.pending_files[1].bundleEntry, undefined);
});

test("_startEagerUploads ignores comment scopes", async () => {
  const h = startHarness({});
  await h.start.call(h.p, "comment");
  assert.equal(h.runs.length, 0);
});

test("no upload window → files fall back to commit-time upload", async () => {
  const h = startHarness(null);
  await h.start.call(h.p, "create");
  const pfA = h.draft.pending_files[0];
  assert.equal(pfA.bundleEntry, null);
  assert.equal(pfA.status, "queued");
  assert.equal(pfA.nid, undefined);
});

test("discarding a form cancels its in-flight uploads first", () => {
  const closeBody = sliceFunction(SRC, "_closeDetailSilently(done)");
  const cancelAt = closeBody.indexOf('_cancelUnfinishedUploads("detail", this._detailDraft)');
  assert.ok(cancelAt > -1, "_closeDetailSilently does not cancel");
  assert.ok(cancelAt < closeBody.indexOf("this._detailDraft = null"), "cancels after the draft is gone");

  const openBody = sliceFunction(SRC, "_openDetail(id)");
  const openCancel = openBody.indexOf('_cancelUnfinishedUploads("detail", this._detailDraft)');
  assert.ok(openCancel > -1 && openCancel < openBody.indexOf("this._detailDraft = task"), "_openDetail does not cancel the previous draft");

  const caseAt = SRC.indexOf('case "cancel-add":');
  const caseBody = SRC.slice(caseAt, SRC.indexOf("this._createDefaults = null", caseAt));
  assert.match(caseBody, /_cancelUnfinishedUploads\("create", this\._createDefaults\)/);
});

test("commits never send a pf whose bundle entry was canceled", () => {
  for (const sig of ["async _commitTask()", "async _commitDetail()"]) {
    assert.match(sliceFunction(SRC, sig), /committablePending\(draft\.pending_files\)/, sig);
  }
  const canceled = { file: {}, bundleEntry: { status: "canceled" } };
  const fallback = { file: {}, status: "queued" };
  const linked = { nid: "n1" };
  assert.deepEqual(pu.committablePending([canceled, fallback, linked]), [fallback, linked]);
  assert.deepEqual(pu.committablePending(undefined), []);
});

test("a batch that never got a job falls back to commit-time upload", async () => {
  const h = startHarness({}); // window returned, onJob never called (e.g. quota pre-check refused)
  await h.start.call(h.p, "create");
  const pfA = h.draft.pending_files[0];
  assert.equal(pfA.bundleEntry, null);
  assert.equal(pfA.status, "queued");
});

test("✕ on a card that is still uploading cancels its upload", () => {
  const dropped = [];
  const req = (m) => (m === "window/upload-progress" ? { dropEntries: (items) => dropped.push(...items) } : null);
  const remove = new Function("require", "unfinishedPending", "itemsOf", "PICK_ATTACHMENT_SCOPES",
    `return ${sliceFunction(SRC, "_removePendingFile(trigger)")}`,
  )(req, pu.unfinishedPending, pu.itemsOf, ["create", "detail", "comment", "comment-reply"]);
  const job = {};
  const live = { localKey: "k1", file: {}, bundleEntry: { status: "uploading" }, bundleJob: job };
  const other = { localKey: "k2", file: {}, bundleEntry: { status: "uploading" }, bundleJob: job };
  const draft = { pending_files: [live, other] };
  const p = {
    _draftForKey: (k) => (k === "create" ? draft : null),
    _refreshPendingList() {},
    _refreshFileSearchDropdown() {},
  };
  remove.call(p, { mget: (k) => (k === "localKey" ? "k1" : null) });
  assert.deepEqual(draft.pending_files, [other]);
  assert.deepEqual(dropped, [{ entry: live.bundleEntry, job }]);
});

test("every other way a draft disappears cancels its uploads", () => {
  const destroy = sliceFunction(SRC, "onBeforeDestroy()");
  assert.match(destroy, /_cancelUnfinishedUploads\("create", this\._createDefaults\)/);
  assert.match(destroy, /_cancelUnfinishedUploads\("detail", this\._detailDraft\)/);

  const removeTask = sliceFunction(SRC, "async _removeTask(trigger)");
  const at = removeTask.indexOf('_cancelUnfinishedUploads("detail", this._detailDraft)');
  assert.ok(at > -1 && at < removeTask.indexOf("this._detailDraft = null"), "_removeTask");

  const reseed = (from) => {
    const i = SRC.indexOf(from);
    assert.ok(i > -1, from);
    const body = SRC.slice(i, SRC.indexOf("this._createDefaults = {", i));
    assert.match(body, /_cancelUnfinishedUploads\("create", this\._createDefaults\)/, from);
  };
  reseed('case "add-task":');
  reseed('case "cal-add": {');
  reseed("  openTaskWithFiles(nodes) {");
});
