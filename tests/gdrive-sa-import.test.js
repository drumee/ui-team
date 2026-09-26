// The share-to-SA run: states, server calls and polling, against a fake
// service and hand-driven timers.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.LOCALE = {};
global.Visitor = { id: "me" };
const { createSaImport } = require(path.join(__dirname, "../src/drumee/libs/gdrive-sa-import.js"));

test.after(() => { delete global.LOCALE; delete global.Visitor; });

const flush = () => new Promise((r) => setImmediate(r));

function fakeService(routes) {
  const calls = [];
  const handle = (name, args) => {
    calls.push({ name, args });
    const r = routes[name];
    if (r instanceof Error) return Promise.reject(r);
    return Promise.resolve(typeof r === "function" ? r(args) : r);
  };
  return { calls, fetchService: handle, postService: handle, count: (n) => calls.filter((c) => c.name === n).length };
}

function fakeTimers() {
  const t = {
    fns: [],
    setInterval(fn) { t.fns.push(fn); return t.fns.length; },
    clearInterval(id) { t.fns[id - 1] = null; },
    active() { return t.fns.filter(Boolean).length; },
    async fire() { for (const f of t.fns) if (f) await f(); await flush(); },
  };
  return t;
}

function make(routes, extra = {}) {
  const service = fakeService(routes);
  const timers = fakeTimers();
  const changes = [];
  const finished = [];
  const run = createSaImport({
    service, hub_id: "h1", nid: "n1", direct: 1, timers,
    onChange: (s) => changes.push(s),
    onFinished: (j) => finished.push(j),
    ...extra,
  });
  return { run, service, timers, changes, finished };
}

test("load: SA available, nothing running → idle with the address", async () => {
  const { run } = make({ "google_drive.get_state": { sa: 1, sa_email: "sa@x" } });
  const s = await run.load();
  assert.equal(s.state, "idle");
  assert.equal(s.saEmail, "sa@x");
});

test("load: no SA key → unavailable; a failed read → unavailable", async () => {
  assert.equal((await make({ "google_drive.get_state": { sa: 0 } }).run.load()).state, "unavailable");
  assert.equal((await make({ "google_drive.get_state": new Error("x") }).run.load()).state, "unavailable");
});

test("load: a running job is reconnected and polled", async () => {
  const { run, service, timers } = make({
    "google_drive.get_state": { sa: 1, sa_email: "sa@x", job: { job_id: 9, status: "running" } },
    "google_drive.get_status": { status: "running", processed_files: 1, total_files: 3 },
  });
  const s = await run.load();
  await flush();
  assert.equal(s.state, "in-progress");
  assert.equal(service.count("google_drive.get_status"), 1);
  assert.equal(timers.active(), 1);
  run.dispose();
});

test("verify(''): bad-link error, nothing sent", async () => {
  const { run, service } = make({});
  assert.equal(await run.verify("  "), null);
  assert.equal(run.snapshot().error, "SA_BAD_LINK");
  assert.equal(service.calls.length, 0);
});

test("verify ok → verified folder carrying the pasted link", async () => {
  const { run, service } = make({ "google_drive.sa_check": { ok: 1, folder_id: "F", name: "Docs", is_folder: 1 } });
  const f = await run.verify(" LINK ");
  assert.deepEqual(f, { folder_id: "F", name: "Docs", is_folder: true, raw: "LINK" });
  assert.deepEqual(service.calls[0], { name: "google_drive.sa_check", args: { hub_id: "me", folder: "LINK" } });
  assert.equal(run.snapshot().state, "verified");
});

test("verify refused → idle with the server's code", async () => {
  const { run } = make({ "google_drive.sa_check": { ok: 0, error: "SA_NOT_OWNER" } });
  await run.verify("LINK");
  assert.equal(run.snapshot().state, "idle");
  assert.equal(run.snapshot().error, "SA_NOT_OWNER");
});

test("start verifies first, then sends the exact payload", async () => {
  const { run, service, timers } = make({
    "google_drive.sa_check": { ok: 1, folder_id: "F", name: "Docs" },
    "google_drive.start_migration": { job_id: 42 },
    "google_drive.get_status": { status: "queued" },
  });
  assert.equal(await run.start("LINK"), 42);
  assert.deepEqual(service.calls.map((c) => c.name).slice(0, 2), ["google_drive.sa_check", "google_drive.start_migration"]);
  assert.deepEqual(service.calls[1].args, {
    hub_id: "h1", nid: "n1", direct_into: 1, auth_kind: "sa", sa_folder: "LINK", conflict_policy: "skip",
  });
  assert.equal(run.snapshot().state, "in-progress");
  assert.equal(timers.active(), 1);
  run.dispose();
});

test("concurrent start → one start_migration", async () => {
  const { run, service } = make({
    "google_drive.sa_check": { ok: 1, folder_id: "F", name: "Docs" },
    "google_drive.start_migration": { job_id: 1 },
    "google_drive.get_status": { status: "queued" },
  });
  await Promise.all([run.start("LINK"), run.start("LINK")]);
  assert.equal(service.count("google_drive.start_migration"), 1);
  run.dispose();
});

test("start rejected → back to verified with the reason; no job id → START_FAILED", async () => {
  const a = make({ "google_drive.sa_check": { ok: 1, folder_id: "F" }, "google_drive.start_migration": Object.assign(new Error("m"), { reason: "SOURCE_ACCESS_REVOKED" }) });
  assert.equal(await a.run.start("L"), null);
  assert.equal(a.run.snapshot().state, "verified");
  assert.equal(a.run.snapshot().error, "SOURCE_ACCESS_REVOKED");
  const b = make({ "google_drive.sa_check": { ok: 1, folder_id: "F" }, "google_drive.start_migration": {} });
  await b.run.start("L");
  assert.equal(b.run.snapshot().error, "START_FAILED");
});

test("polling: unchanged status is not re-announced; done finishes once", async () => {
  let status = { status: "running", processed_files: 1, total_files: 2 };
  const { run, timers, changes, finished } = make({ "google_drive.get_status": () => status });
  run.attach(5);
  await flush();
  const afterFirst = changes.length;
  await timers.fire();
  assert.equal(changes.length, afterFirst, "same signature, no onChange");
  status = { status: "done", processed_files: 2, total_files: 2 };
  await timers.fire();
  assert.equal(run.snapshot().state, "done");
  assert.equal(finished.length, 1);
  assert.equal(finished[0].job_id, 5);
  assert.equal(timers.active(), 0);
});

test("cancel is sent once; a failed cancel can be retried", async () => {
  const { run, service } = make({ "google_drive.get_status": { status: "running" }, "google_drive.cancel": {} });
  run.attach(5);
  await flush();
  await Promise.all([run.cancel(), run.cancel()]);
  assert.equal(service.count("google_drive.cancel"), 1);
  assert.equal(run.snapshot().cancelRequested, 1);
  run.dispose();
  const f = make({ "google_drive.get_status": { status: "running" }, "google_drive.cancel": new Error("x") });
  f.run.attach(5);
  await flush();
  await f.run.cancel();
  assert.equal(f.run.snapshot().cancelRequested, 0);
  f.run.dispose();
});

test("ack only for a finished job; reset keeps the address and never acks", async () => {
  const { run, service, timers } = make({
    "google_drive.get_state": { sa: 1, sa_email: "sa@x" },
    "google_drive.get_status": { status: "done" },
    "google_drive.ack_result": {},
  });
  await run.load();
  await run.ack();
  assert.equal(service.count("google_drive.ack_result"), 0);
  run.attach(7);
  await flush();
  await run.ack();
  assert.deepEqual(service.calls.find((c) => c.name === "google_drive.ack_result").args, { hub_id: "me", job_id: 7 });
  run.reset();
  const s = run.snapshot();
  assert.equal(s.state, "idle");
  assert.equal(s.saEmail, "sa@x");
  assert.equal(s.job, null);
  assert.equal(service.count("google_drive.ack_result"), 1);
  assert.equal(timers.active(), 0);
});

test("dispose: timer stopped, silent afterwards", async () => {
  const { run, timers, changes } = make({ "google_drive.get_status": { status: "running" } });
  run.attach(5);
  await flush();
  run.dispose();
  const n = changes.length;
  await timers.fire();
  await run.verify("x");
  assert.equal(timers.active(), 0);
  assert.equal(changes.length, n);
});

test("seed fills the address without announcing; snapshot is a copy", async () => {
  const { run, changes } = make({});
  run.seed({ saEmail: "sa@y" });
  assert.equal(changes.length, 0);
  assert.equal(run.snapshot().state, "idle");
  assert.equal(run.snapshot().saEmail, "sa@y");
  const s = run.snapshot();
  s.fileLog.push({ name: "z" });
  assert.equal(run.snapshot().fileLog.length, 0);
});

test("a late answer from an older poll cannot undo a finished job", async () => {
  const pending = [];
  const { run, timers } = make({
    "google_drive.get_status": () => new Promise((res) => pending.push(res)),
  });
  run.attach(5);                      // tick #1 in flight
  const t2 = timers.fns[0]();         // tick #2 in flight (slow server)
  pending[1]({ status: "done", processed_files: 2, total_files: 2 });
  await t2; await flush();
  assert.equal(run.snapshot().state, "done");
  pending[0]({ status: "running", processed_files: 1, total_files: 2 });
  await flush();
  assert.equal(run.snapshot().state, "done");
  assert.equal(timers.active(), 0);
});
