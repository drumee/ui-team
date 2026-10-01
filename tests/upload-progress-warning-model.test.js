// tests/upload-progress-warning-model.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../src/drumee/builtins/window/upload-progress/warning-model");

const e = (status, over = {}) => ({ id: `be_${status}`, name: "Brand Assets.zip", size: 200, status, ...over });

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
