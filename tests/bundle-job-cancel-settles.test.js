// tests/bundle-job-cancel-settles.test.js
//   node --test tests/bundle-job-cancel-settles.test.js
//
// "Cancel all" must always END a bundle. The chat composer locks itself while
// an attachment batch uploads and unlocks only on the batch's "done" — so a
// cancelled batch that never reports "done" leaves the composer dead (can't
// type, can't send) until the page is reloaded, and holds the manager's only
// job slot so every later upload queues behind it forever.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const read = (f) => fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/media/bundle", f), "utf8");
const JOB = read("job.js");
const MANAGER = read("manager.js");
const fn = (src, sig) => new Function(`return ${sliceFunction(src, sig)}`)();

const start = fn(JOB, "async start()");
const cancel = fn(JOB, "cancel(reason)");
const onAbort = fn(JOB, "onAbort()");
const markCanceled = fn(JOB, "_markCanceled(list)");
const cancelAll = fn(MANAGER, "cancelAll()");

const tick = () => new Promise((r) => setImmediate(r));

// A job whose single file is in flight on an XHR. `abortFires` decides whether
// xhr.abort() reaches onAbort — it does NOT once the request body is fully sent
// (xhr.upload has nothing left to abort), which is the case that hung.
function jobWithFileInFlight({ abortFires }) {
  const entry = { id: "be_1", kind: "file", name: "shot.png", status: "queued", children: [] };
  const events = [];
  const job = {
    _entries: [entry],
    _canceled: false,
    _current: null,
    _currentXhr: null,
    resolved: 0,
    trigger(name, ev) { events.push([name, ev]); },
    warn() {},
    _clearWatchdog() {},
    _markCanceled: markCanceled,
    onAbort,
    _uploadEntry(e) {
      return new Promise((resolve) => {
        e.status = "uploading";
        this._current = { entry: e, resolve: () => { job.resolved += 1; resolve(); }, loaded: 0 };
        this._currentXhr = { abort: () => { if (abortFires) job.onAbort(); } };
      });
    },
    events,
    entry,
  };
  return job;
}

const doneEvents = (job) => job.events.filter(([n]) => n === "done");

test("cancel ends the batch when abort() reaches no onAbort (body already sent)", async () => {
  const job = jobWithFileInFlight({ abortFires: false });
  start.call(job);
  await tick();
  assert.equal(job.entry.status, "uploading");

  cancel.call(job);
  await tick();

  assert.equal(job.resolved, 1, "the in-flight file's promise settles");
  assert.equal(job._current, null);
  assert.equal(job.entry.status, "canceled", "keeps the canceled verdict, not 'skipped'");
  const done = doneEvents(job);
  assert.equal(done.length, 1, "start() reaches done");
  assert.equal(done[0][1].canceled, true);
});

test("cancel when the abort event DOES fire settles the file exactly once", async () => {
  const job = jobWithFileInFlight({ abortFires: true });
  start.call(job);
  await tick();

  cancel.call(job);
  await tick();

  assert.equal(job.resolved, 1);
  assert.equal(job.entry.status, "canceled");
  assert.equal(doneEvents(job).length, 1);
});

test("cancel with nothing in flight is still safe", () => {
  const job = jobWithFileInFlight({ abortFires: false });
  cancel.call(job, "permission");
  assert.equal(job._canceled, true);
  assert.equal(job._cancelReason, "permission");
  assert.equal(job.entry.status, "canceled");
  assert.equal(job.resolved, 0);
});

function fakeJob(name) {
  const events = [];
  return {
    name,
    canceled: 0,
    cancel() { this.canceled += 1; },
    trigger(n, ev) { events.push([n, ev]); },
    events,
  };
}

test("cancelAll reports 'done' for a queued job that never started", () => {
  const active = fakeJob("active");
  const queued1 = fakeJob("q1");
  const queued2 = fakeJob("q2");
  const mgr = { _active: new Set([active]), _queue: [queued1, queued2] };

  cancelAll.call(mgr);

  assert.deepEqual(mgr._queue, []);
  for (const q of [queued1, queued2]) {
    assert.equal(q.canceled, 1, q.name);
    assert.equal(q.events.length, 1, q.name);
    assert.equal(q.events[0][0], "done");
    assert.equal(q.events[0][1].canceled, true);
    assert.equal(q.events[0][1].job, q);
  }
  // A running job reports "done" itself, from start(): no second one here.
  assert.equal(active.canceled, 1);
  assert.equal(active.events.length, 0);
});

test("a 'done' listener that pumps the queue sees it already emptied", () => {
  const queued = fakeJob("q");
  const mgr = { _active: new Set(), _queue: [queued] };
  let queueSeen;
  queued.trigger = () => { queueSeen = mgr._queue.length; };
  cancelAll.call(mgr);
  assert.equal(queueSeen, 0);
});
