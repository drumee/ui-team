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

const resolveWarning = () => {
  const dropped = [];
  const fn = new Function("__window_upload_progress",
    `return ${sliceFunction(SRC, "_resolveWarning(choice)")}`,
  )({ dropEntries: (items) => dropped.push(...items) });
  return { fn, dropped };
};

function warnWin(over = {}) {
  const calls = [];
  return {
    calls,
    size: { height: 280 },
    el: { style: { height: "auto" } },
    _jobs: [{}], _uploadItems: [],
    isDestroyed: () => false,
    stopListening: () => calls.push("stop"),
    _setPhase: (p) => calls.push(`phase:${p}`),
    _renderAggregate() {}, _renderProgressList() {},
    _maybeArmAutoMinimize: () => calls.push("arm"),
    goodbye: () => calls.push("goodbye"),
    _renderWarningThrottled() {},
    ...over,
  };
}

test("_resolveWarning: skip drops the items, restores the phase, resolves once", () => {
  const { fn, dropped } = resolveWarning();
  const got = [];
  const item = { entry: { id: "a" }, job: {} };
  const win = warnWin({ _warning: { items: [item], prevPhase: "progress", resolve: (c) => got.push(c) } });
  fn.call(win, "skip");
  fn.call(win, "keep"); // second call is a no-op
  assert.deepEqual(got, ["skip"]);
  assert.deepEqual(dropped, [item]);
  assert.ok(win.calls.includes("phase:progress"));
});

test("_setPhase stamps the window element too (the skin sizes __ui off it)", () => {
  const setPhase = new Function(`return ${sliceFunction(SRC, "_setPhase(phase)")}`)();
  const container = { dataset: {} };
  const win = { fig: { family: "f" }, el: { dataset: {}, querySelector: () => container } };
  setPhase.call(win, "warning");
  assert.equal(win.el.dataset.phase, "warning");
  assert.equal(container.dataset.phase, "warning");
  assert.equal(win._phase, "warning");
});

test("no inline height juggling: an inline style cannot beat the skin's !important", () => {
  assert.doesNotMatch(sliceFunction(SRC, "_showWarning(items, action)"), /style\.height/);
  assert.doesNotMatch(sliceFunction(SRC, "_resolveWarning(choice)"), /style\.height/);
});

test("_resolveWarning: keep drops nothing", () => {
  const { fn, dropped } = resolveWarning();
  const got = [];
  const win = warnWin({ _warning: { items: [{ entry: {}, job: {} }], prevPhase: "progress", resolve: (c) => got.push(c) } });
  fn.call(win, "keep");
  assert.deepEqual(got, ["keep"]);
  assert.deepEqual(dropped, []);
});

test("_resolveWarning: a window opened only for the warning closes itself", () => {
  const { fn } = resolveWarning();
  const win = warnWin({ _jobs: [], _uploadItems: [], _warning: { items: [], prevPhase: "progress", resolve() {} } });
  fn.call(win, "keep");
  assert.ok(win.calls.includes("goodbye"));
});

test("onBeforeDestroy and auto-dismiss respect an open warning", () => {
  assert.match(sliceFunction(SRC, "onBeforeDestroy()"), /_resolveWarning\("keep"\)/);
  assert.match(sliceFunction(SRC, "_maybeArmAutoMinimize()"), /if \(this\._warning\)/);
});

test("a new batch while the card is up does not flip the phase away", () => {
  const sw = new Function(`return ${sliceFunction(SRC, "_switchToProgress()")}`)();
  const calls = [];
  const win = {
    _warning: { prevPhase: "staging" },
    _setPhase: (p) => calls.push(p),
    _renderAggregate() {}, _renderProgressList() {},
  };
  sw.call(win);
  assert.deepEqual(calls, []);
  assert.equal(win._warning.prevPhase, "progress");
  win._warning = null;
  sw.call(win);
  assert.deepEqual(calls, ["progress"]);
  const start = SRC.indexOf("__window_upload_progress.runBundle = function");
  const runBundle = SRC.slice(start, SRC.indexOf("\n};\n", start));
  assert.doesNotMatch(runBundle, /root\.dataset\.phase = "progress"/);
});

test("confirmUnfinished: empty → skip, no window → keep", async () => {
  const start = SRC.indexOf("__window_upload_progress.confirmUnfinished = function");
  assert.ok(start > -1, "confirmUnfinished not found");
  const end = SRC.indexOf("\n};\n", start);
  const make = (win) => new Function("__window_upload_progress",
    SRC.slice(start, end + 3).replace("__window_upload_progress.confirmUnfinished =", "return"),
  )({ getOrCreate: () => Promise.resolve(win) });
  assert.equal(await make(null)({ items: [] }), "skip");
  assert.equal(await make(null)({ items: [{ entry: {}, job: {} }] }), "keep");
  const seen = [];
  const win = { _showWarning: (items, action) => (seen.push(action), Promise.resolve("skip")) };
  assert.equal(await make(win)({ items: [{ entry: {}, job: {} }], action: "update" }), "skip");
  assert.deepEqual(seen, ["update"]);
});

const sliceStatic = (name) => {
  const start = SRC.indexOf(`__window_upload_progress.${name} = function`);
  assert.ok(start > -1, `${name} not found`);
  const end = SRC.indexOf("\n};\n", start);
  return SRC.slice(start, end + 3).replace(`__window_upload_progress.${name} =`, "return");
};

test("dropEntries cancels an entry whose job has not been created yet", () => {
  const dropEntries = new Function("window", sliceStatic("dropEntries"))({});
  const queued = { status: "queued" }, done = { status: "done" };
  const out = dropEntries([{ entry: queued }, { entry: done }]);
  assert.deepEqual(out, [queued]);
  assert.equal(queued.status, "canceled");
  assert.equal(done.status, "done");
});

test("runBundle leaves out roots canceled before it ran, and resolves null if none remain", async () => {
  const enqueued = [];
  const win = {
    _bundle: [], fig: { family: "x" },
    _mergeEntry(list, r) { list.push(r); },
    _enqueueBundle: (batch) => enqueued.push(...batch),
  };
  const runBundle = new Function("__window_upload_progress", sliceStatic("runBundle"))(
    { getOrCreate: () => Promise.resolve(win) });
  const a = { id: "a", status: "queued" }, b = { id: "b", status: "canceled" };
  assert.equal(await runBundle([a, b], "n1", "h1", null, {}), win);
  assert.deepEqual(enqueued, [a]);
  assert.deepEqual(win._bundle, [a]);
  assert.equal(await runBundle([{ status: "canceled" }], "n1", "h1", null, {}), null);
});
