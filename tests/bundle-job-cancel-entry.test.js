// tests/bundle-job-cancel-entry.test.js
//   node --test tests/bundle-job-cancel-entry.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/media/bundle/job.js"), "utf8");
const fn = (sig) => new Function(`return ${sliceFunction(SRC, sig)}`)();
const cancelEntry = fn("cancelEntry(entry)");
const onAbort = fn("onAbort()");
const uploadEntry = fn("async _uploadEntry(entry, destNid)");

const file = (over = {}) => ({ id: "be_1", kind: "file", name: "a.zip", size: 100, status: "queued", children: [], ...over });

function makeJob(over = {}) {
  const events = [];
  return {
    filesTotal: 2, bytesTotal: 300, bytesDone: 0, filesDone: 0,
    _canceled: false, _current: null, _currentXhr: null,
    _resolution: { mode: "rename", skip: new Set() },
    aborted: 0, uploads: [],
    trigger(name, ev) { events.push([name, ev]); },
    _clearWatchdog() {},
    onAbort,
    _uploadOneFile(entry) { this.uploads.push(entry.id); },
    events,
    ...over,
  };
}

test("cancels a queued entry and shrinks the totals", () => {
  const job = makeJob();
  const e = file();
  assert.equal(cancelEntry.call(job, e), true);
  assert.equal(e.status, "canceled");
  assert.equal(e.cancelReason, "dropped");
  assert.equal(job.filesTotal, 1);
  assert.equal(job.bytesTotal, 200);
  assert.equal(job.events.at(-1)[0], "progress");
});

test("refuses a finished entry", () => {
  for (const status of ["done", "skipped", "error", "canceled"]) {
    const job = makeJob();
    const e = file({ status });
    assert.equal(cancelEntry.call(job, e), false, status);
    assert.equal(e.status, status);
    assert.equal(job.filesTotal, 2);
  }
  assert.equal(cancelEntry.call(makeJob(), null), false);
});

test("aborts the in-flight file and gives back its counted bytes", () => {
  const e = file({ status: "uploading" });
  const job = makeJob({ bytesDone: 40 });
  job._current = { entry: e, loaded: 40, resolve() {} };
  job._currentXhr = { abort() { job.aborted += 1; } };
  cancelEntry.call(job, e);
  assert.equal(job.aborted, 1);
  assert.equal(job.bytesDone, 0);
});

test("an abort after cancelEntry keeps the canceled verdict", () => {
  const e = file({ status: "canceled" });
  let resolved = 0;
  const job = makeJob({ _current: { entry: e, resolve: () => (resolved += 1) } });
  onAbort.call(job);
  assert.equal(e.status, "canceled");
  assert.equal(resolved, 1);
});

test("a watchdog abort still marks the file skipped", () => {
  const e = file({ status: "uploading" });
  const job = makeJob({ _current: { entry: e, resolve() {} } });
  onAbort.call(job);
  assert.equal(e.status, "skipped");
});

test("_uploadEntry never starts a canceled file", async () => {
  const job = makeJob();
  await uploadEntry.call(job, file({ status: "canceled" }), "n1");
  assert.deepEqual(job.uploads, []);
  await uploadEntry.call(job, file({ id: "be_2" }), "n1");
  assert.deepEqual(job.uploads, ["be_2"]);
});

// Once the request body is fully sent, xhr.abort() fires no abort event, so
// relying on it left the dropped file's promise unsettled: the job never moved
// to the next file nor reported "done", and held the manager's only slot.
test("dropping the in-flight file settles it even when abort() fires nothing", () => {
  const e = file({ status: "uploading" });
  let resolved = 0;
  const job = makeJob();
  job._current = { entry: e, loaded: 100, resolve: () => (resolved += 1) };
  job._currentXhr = { abort() { job.aborted += 1; } };
  cancelEntry.call(job, e);
  assert.equal(job.aborted, 1);
  assert.equal(resolved, 1, "the file's promise settles");
  assert.equal(job._current, null);
  assert.equal(e.status, "canceled", "keeps the dropped verdict, not 'skipped'");
  assert.equal(job._canceled, false, "the rest of the bundle carries on");
});

test("dropping the in-flight file settles it once when abort() does fire", () => {
  const e = file({ status: "uploading" });
  let resolved = 0;
  const job = makeJob();
  job._current = { entry: e, loaded: 0, resolve: () => (resolved += 1) };
  job._currentXhr = { abort() { job.onAbort(); } };
  cancelEntry.call(job, e);
  assert.equal(resolved, 1);
  assert.equal(e.status, "canceled");
});

test("dropping a queued file leaves the in-flight one alone", () => {
  const busy = file({ id: "be_busy", status: "uploading" });
  let resolved = 0;
  const job = makeJob();
  job._current = { entry: busy, loaded: 10, resolve: () => (resolved += 1) };
  job._currentXhr = { abort() { job.aborted += 1; } };
  cancelEntry.call(job, file({ id: "be_2" }));
  assert.equal(job.aborted, 0);
  assert.equal(resolved, 0);
  assert.equal(job._current.entry, busy);
  assert.equal(busy.status, "uploading");
});

// A chunked handle settles its own pending chunks and reports onAbort LATER.
// The bundle carries on after a dropped file, so settling here as well would
// let that late onAbort land on whichever file started next.
test("a dropped chunked upload is left for its own late onAbort", () => {
  const e = file({ status: "uploading" });
  let resolved = 0;
  const job = makeJob();
  job._current = { entry: e, loaded: 100, resolve: () => (resolved += 1) };
  job._currentXhr = { chunked: true, abort() { job.aborted += 1; } };
  cancelEntry.call(job, e);
  assert.equal(job.aborted, 1);
  assert.equal(resolved, 0, "not settled here");
  assert.equal(job._current.entry, e, "still waiting on the dropped file");
  // The handle's finish() → ctx.onAbort, a tick later: it settles THIS file.
  job.onAbort();
  assert.equal(resolved, 1);
  assert.equal(e.status, "canceled");
  assert.equal(job._current, null);
});
