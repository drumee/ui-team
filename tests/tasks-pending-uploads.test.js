// tests/tasks-pending-uploads.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const p = require("../src/drumee/builtins/window/tasks/pending-uploads");

const fileA = { name: "a.zip" }, fileB = { name: "b.png" }, ds = { name: ".DS_Store" };

test("pairEntries matches by File identity and skips ignored files", () => {
  const pa = { file: fileA }, pb = { file: fileB }, pd = { file: ds }, linked = { nid: "n9" };
  const roots = [{ id: "be_2", source: fileB }, { id: "be_1", source: fileA }];
  const paired = p.pairEntries([pa, pb, pd, linked], roots);
  assert.deepEqual(paired, [pa, pb]);
  assert.equal(pa.bundleEntry.id, "be_1");
  assert.equal(pd.bundleEntry, undefined);
});

test("unfinished = paired, no nid, entry still moving", () => {
  const mk = (status, over = {}) => ({ bundleEntry: { status }, ...over });
  const list = [mk("uploading"), mk("queued"), mk("paused"), mk("done"), mk("uploading", { nid: "n1" }), { file: fileA }];
  assert.equal(p.unfinishedPending(list).length, 3);
  assert.equal(p.withoutUnfinished(list).length, 3);
  assert.deepEqual(p.unfinishedPending(undefined), []);
});

test("settleEagerFile takes the server's nid and name", () => {
  const pf = { file: fileA, filename: "a", extension: "zip", provisional: 1, status: "uploading" };
  assert.equal(p.settleEagerFile(pf, { nid: "n5", filename: "a (1)", ext: "zip" }, "h1"), true);
  assert.deepEqual(
    { nid: pf.nid, hub_id: pf.hub_id, filename: pf.filename, extension: pf.extension, status: pf.status, provisional: pf.provisional },
    { nid: "n5", hub_id: "h1", filename: "a (1)", extension: "zip", status: "queued", provisional: 0 },
  );
  assert.equal(p.settleEagerFile(pf, null, "h1"), false);
});

test("settleEagerBatch: errors fall back to commit-time upload, cancels drop", () => {
  const ok = { nid: "n1", bundleEntry: { status: "done" } };
  const failed = { file: fileA, bundleEntry: { status: "error" }, bundleJob: {}, status: "uploading" };
  const cut = { file: fileB, bundleEntry: { status: "canceled" }, status: "uploading" };
  const { fallback, dropped } = p.settleEagerBatch([ok, failed, cut]);
  assert.deepEqual(fallback, [failed]);
  assert.deepEqual(dropped, [cut]);
  assert.equal(failed.bundleEntry, null);
  assert.equal(failed.bundleJob, null);
  assert.equal(failed.status, "queued");
});

test("itemsOf maps to {entry, job}", () => {
  const job = {};
  assert.deepEqual(p.itemsOf([{ bundleEntry: { id: "x" }, bundleJob: job }]), [{ entry: { id: "x" }, job }]);
});
