// tests/upload-progress-warning-phase.test.js
//   node --test tests/upload-progress-warning-phase.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");
const model = require("../src/drumee/builtins/window/upload-progress/warning-model");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/upload-progress/index.js"), "utf8");

test("_removeRoots prunes, re-renders and re-arms auto-dismiss", () => {
  const removeRoots = new Function("withoutEntries", `return ${sliceFunction(SRC, "_removeRoots(entries)")}`)(model.withoutEntries);
  const a = { id: "a" }, b = { id: "b" };
  const calls = [];
  const win = {
    _bundle: [a, b],
    _renderAggregate: () => calls.push("agg"),
    _renderProgressList: () => calls.push("list"),
    _maybeArmAutoMinimize: () => calls.push("arm"),
  };
  removeRoots.call(win, [a]);
  assert.deepEqual(win._bundle, [b]);
  assert.deepEqual(calls, ["agg", "list", "arm"]);
});

test("dropEntries cancels through the job and only prunes what it cancelled", () => {
  const start = SRC.indexOf("__window_upload_progress.dropEntries = function");
  assert.ok(start > -1, "dropEntries not found");
  const end = SRC.indexOf("\n};\n", start);
  const body = SRC.slice(start, end + 3).replace("__window_upload_progress.dropEntries =", "return");
  const pruned = [];
  const win = { isDestroyed: () => false, _removeRoots: (list) => pruned.push(...list) };
  const fakeWindow = { Wm: { getItemsByKind: () => [win] } };
  const dropEntries = new Function("window", body)(fakeWindow);
  const live = { status: "uploading" }, done = { status: "done" };
  const job = { cancelEntry: (e) => e.status !== "done" && ((e.status = "canceled"), true) };
  const out = dropEntries([{ entry: live, job }, { entry: done, job }, { entry: live }]);
  assert.deepEqual(out, [live]);
  assert.deepEqual(pruned, [live]);
});

test("_enqueueBundle hands the job to onJob before pump()", () => {
  const order = [];
  const enqueue = new Function("Butler", "LOCALE", "Visitor", "Wm",
    `return ${sliceFunction(SRC, "_enqueueBundle(entries, destNid, hub_id)")}`,
  )({ say() {} }, {}, { diskFree: () => Infinity }, {});
  const job = { id: "j" };
  const win = {
    _isExpanded: true, _jobs: [], _bundleDest: null,
    _bundleEntry: { countSize: () => 1 },
    _bundleManager: { create: () => job, pump: () => order.push("pump") },
    _pendingOnJob: (j) => order.push(`onJob:${j.id}`),
    _cancelAutoMinimize() {}, _rememberPrivilege() {}, _attachJob() {},
    _resetBundleFooter() {}, _switchToProgress() {}, _renderAggregate() {}, _renderProgressList() {},
    warn() {},
  };
  enqueue.call(win, [{ id: "e" }], "n1", "h1");
  assert.deepEqual(order, ["onJob:j", "pump"]);
});

test("file-done hands the entry to the caller's onFileDone", () => {
  const body = sliceFunction(SRC, "_attachJob(job)");
  assert.match(body, /job\._onFileDone\(ev && ev\.data, ev && ev\.parent, ev && ev\.entry\)/);
});
