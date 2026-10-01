// tests/upload-progress-warning-model.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../src/drumee/builtins/window/upload-progress/warning-model");

const e = (status, over = {}) => ({ id: `be_${status}`, name: "Brand Assets.zip", size: 200, status, ...over });

test("percent: live for the current file, capped at 99", () => {
  const cur = e("uploading");
  const job = { _current: { entry: cur, loaded: 84 } };
  assert.equal(m.entryPercent(cur, job), 42);
  job._current.loaded = 200;
  assert.equal(m.entryPercent(cur, job), 99);
  assert.equal(m.entryPercent(e("queued"), job), 0);
  assert.equal(m.entryPercent(e("done"), job), 100);
  assert.equal(m.entryPercent(e("uploading", { size: 0 }), { _current: { entry: null } }), 0);
});

test("rows carry badge, state and status text", () => {
  const cur = e("uploading");
  const rows = m.warningRows([{ entry: cur, job: { _current: { entry: cur, loaded: 84 } } }], undefined);
  assert.deepEqual(rows[0], {
    id: "be_uploading", name: "Brand Assets.zip", ext: "ZIP",
    pct: 42, state: "uploading", statusText: "Uploading... 42%",
  });
  const st = (s) => m.warningRows([{ entry: e(s), job: null }])[0];
  assert.equal(st("queued").statusText, "Waiting...");
  assert.equal(st("paused").statusText, "Paused");
  assert.equal(st("done").statusText, "Uploaded");
  assert.equal(st("error").state, "failed");
  assert.equal(m.warningRows([{ entry: e("queued", { name: "README" }) }])[0].ext, "FILE");
});

test("copy: singular / plural / update / all-finished", () => {
  const one = m.warningCopy("create", 1);
  assert.equal(one.title, "Some files are still uploading");
  assert.equal(one.body, "1 file hasn't finished uploading yet. If you create this task now, the uploading file(s) won't be attached to the task.");
  assert.equal(one.keep, "Keep uploading");
  assert.equal(one.skip, "Create without this file");
  assert.equal(m.warningCopy("create", 3).skip, "Create without these files");
  assert.match(m.warningCopy("create", 3).body, /^3 files haven't finished/);
  assert.equal(m.warningCopy("update", 1).skip, "Update without this file");
  assert.match(m.warningCopy("update", 2).body, /If you update this task now/);
  const done = m.warningCopy("update", 0, { UPDATE: "Mettre à jour" });
  assert.equal(done.body, "All files have finished uploading.");
  assert.equal(done.skip, "Mettre à jour");
});

test("unfinished count and root pruning", () => {
  const a = e("uploading"), b = e("done"), c = e("paused");
  assert.equal(m.countUnfinished([{ entry: a }, { entry: b }, { entry: c }, null]), 2);
  assert.deepEqual(m.withoutEntries([a, b, c], [a, c]), [b]);
  assert.deepEqual(m.withoutEntries(undefined, [a]), []);
});
