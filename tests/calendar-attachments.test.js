// tests/calendar-attachments.test.js
//   node --test tests/calendar-attachments.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const a = require("../src/drumee/builtins/panel/calendar/attachments");

test("splitFilename keeps dotfiles and trailing dots whole", () => {
  assert.deepEqual(a.splitFilename("a.b.pdf"), { filename: "a.b", extension: "pdf" });
  assert.deepEqual(a.splitFilename(".env"), { filename: ".env", extension: "" });
  assert.deepEqual(a.splitFilename("x."), { filename: "x.", extension: "" });
});

test("stageFiles appends queued entries with unique keys and caps at MAX_FILES", () => {
  const list = [];
  const files = Array.from({ length: a.MAX_FILES + 2 }, (_, i) => ({ name: `f${i}.txt` }));
  const { added, overflow } = a.stageFiles(list, files, 1000);
  assert.equal(added.length, a.MAX_FILES);
  assert.equal(overflow.length, 2);
  assert.equal(list.length, a.MAX_FILES);
  assert.equal(new Set(list.map(a.fileKey)).size, a.MAX_FILES);
  assert.deepEqual(
    { filename: list[0].filename, extension: list[0].extension, status: list[0].status, file: list[0].file },
    { filename: "f0", extension: "txt", status: "queued", file: files[0] },
  );
});

test("fileKey, nidsToLink, failedFiles", () => {
  const linked = { nid: "n1", linked: 1, status: "linked" };
  const uploaded = { localKey: "l2", nid: "n2", status: "queued" };
  const moving = { localKey: "l3", status: "uploading" };
  const broken = { localKey: "l4", status: "error" };
  assert.equal(a.fileKey(linked), "nid:n1");
  assert.equal(a.fileKey(uploaded), "l2");
  assert.deepEqual(a.nidsToLink([linked, uploaded, moving, broken]), ["n2"]);
  assert.deepEqual(a.failedFiles([linked, uploaded, moving, broken]), [broken]);
});

test("isFileDrag reads dataTransfer.types", () => {
  assert.equal(a.isFileDrag({ dataTransfer: { types: ["Files"] } }), true);
  assert.equal(a.isFileDrag({ dataTransfer: { types: ["text/plain"] } }), false);
  assert.equal(a.isFileDrag({}), false);
});

test("re-exports the Task tab's eager-upload helpers", () => {
  for (const k of ["pairEntries", "settleEagerFile", "settleEagerBatch", "unfinishedPending", "abandonedPending", "itemsOf"]) {
    assert.equal(typeof a[k], "function", k);
  }
});
