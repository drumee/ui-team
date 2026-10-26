// tests/downloader-zip-exit-code.test.js
//   node --test tests/downloader-zip-exit-code.test.js
//
// The worker (server-team offline/media/download.js) ends every archive with
// one push carrying 7z's exit code. Only 0 means a whole archive: on 1 the zip
// misses the files 7z could not read, on 2 there is none. The ".zip" step must
// say the download failed instead of fetching it and calling it complete.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/downloader/index.js"), "utf8");
global.LOCALE = { DOWNLOAD_FAILED: "Download failed", DOWNLOADING: "Downloading" };
const handleDownload = new Function(`return ${sliceFunction(SRC, "async handleDownload(data)")}`)();

function card() {
  const calls = [];
  return {
    calls,
    _treeZip: null,
    _setZipTitle(t) { calls.push(["title", t]); },
    _zipItem(s) { calls.push(["item", s]); },
    _zipPaint() {},
    _archivePercent() { return 0; },
    _zipSettle(o) { calls.push(["settle", o.state, o.title]); },
    downloadZip(d) { calls.push(["fetch", d.zipid]); },
  };
}

test("exit 0 fetches the archive", async () => {
  const c = card();
  await handleDownload.call(c, { zipid: "z", phase: "exit", exit: 0, message: "DOWNLOADING" });
  assert.deepEqual(c.calls.filter((x) => x[0] !== "title"), [["fetch", "z"]]);
});

for (const code of [1, 2]) {
  test(`exit ${code} reports a failure and fetches nothing`, async () => {
    const c = card();
    await handleDownload.call(c, { zipid: "z", phase: "exit", exit: code, message: "DOWNLOADING" });
    assert.ok(!c.calls.some((x) => x[0] === "fetch"));
    assert.deepEqual(c.calls.filter((x) => x[0] !== "title"),
      [["item", "error"], ["settle", "failed", "Download failed"]]);
  });
}

test("a folder of the files queue still settles on its own (exit code read there)", async () => {
  const c = card();
  let settled;
  c._treeZip = { zipid: "t" };
  c._settleTreeZip = (r) => { settled = r; };
  await handleDownload.call(c, { zipid: "t", phase: "exit", exit: 1, message: "DOWNLOADING" });
  assert.ok(settled && settled.error);
  assert.deepEqual(c.calls, []);
});
