// tests/zip-pushes-early-end.test.js
//   node --test tests/zip-pushes-early-end.test.js
//
// A folder download must start even when the worker's "exit" push arrives
// before the media.download reply. The reply hands out the zipid; the push is
// routed to whatever carries that zipid. On prod (HTTP/2) the reply queued
// behind a zip still streaming down while the push came on its own socket, so
// nothing carried the zipid yet, the end was dropped, and the zip — built on
// the server — was never fetched (2026-10-23, workspace ABEI.CH).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const zp = require("../src/drumee/libs/zip-pushes");
const src = (f) => fs.readFileSync(path.join(__dirname, "../src/drumee", f), "utf8");
// TREE_TIMEOUT_MS: the downloader's module constant, read by _awaitTreeZip.
const fn = (s, sig) => new Function("require", "TREE_TIMEOUT_MS", `return ${sliceFunction(s, sig)}`)(
  (m) => (m === "libs/zip-pushes" ? zp : require(m)),
  60 * 1000,
);

const downloadContent = fn(src("builtins/window/utils.js"), "downloadContent(args)");
const awaitTreeZip = fn(src("builtins/window/downloader/index.js"), "_awaitTreeZip(zipid, index)");

let n = 0;
const zipid = () => `z${++n}`;

test("take returns a kept push once, nothing for an unknown zipid", () => {
  const id = zipid();
  zp.remember({ zipid: id, phase: "exit", exit: 0 });
  assert.deepEqual(zp.take(id), { zipid: id, phase: "exit", exit: 0 });
  assert.equal(zp.take(id), null);
  assert.equal(zp.take(zipid()), null);
  assert.equal(zp.take(undefined), null);
});

test("the last push wins, but a trailing progress push never hides the end", () => {
  const id = zipid();
  zp.remember({ zipid: id, phase: "prepare" });
  zp.remember({ zipid: id, phase: "archive", progress: 40 });
  zp.remember({ zipid: id, phase: "exit", exit: 0 });
  zp.remember({ zipid: id, phase: "archive", progress: 100 });
  assert.equal(zp.take(id).phase, "exit");

  const failed = zipid();
  zp.remember({ zipid: failed, phase: "archive", progress: 10 });
  zp.remember({ zipid: failed, phase: "error", message: "boom" });
  assert.equal(zp.take(failed).phase, "error");
});

test("pushes without a zipid are ignored, old ones expire", () => {
  zp.remember(null);
  zp.remember({ phase: "exit" });
  const id = zipid();
  const now = Date.now;
  try {
    zp.remember({ zipid: id, phase: "exit", exit: 0 });
    Date.now = () => now() + zp.KEEP_MS + 1;
    assert.equal(zp.take(id), null);
  } finally {
    Date.now = now;
  }
});

test("downloadContent still routes to the carrier, and keeps the push", () => {
  const id = zipid();
  const got = [];
  const tile = { handleDownload: (d) => got.push(d) };
  const win = { getItemsByAttr: (k, v) => (k === "zipid" && v === id ? [tile] : []) };
  downloadContent.call(win, { zipid: id, phase: "exit", exit: 0 });
  assert.equal(got.length, 1);
  assert.equal(zp.take(id).phase, "exit");
});

test("RACE: end pushed before the downloader holds the zipid still settles the folder", async () => {
  const id = zipid();
  // The push lands first: no window carries the zipid yet.
  downloadContent.call({ getItemsByAttr: () => [] }, { zipid: id, phase: "exit", exit: 0 });
  const settled = [];
  const win = {
    mset() {},
    _settleTreeZip(r) {
      const t = this._treeZip;
      this._treeZip = null;
      clearTimeout(t.timer);
      t.resolve(r);
    },
    handleDownload(d) {
      settled.push(d.phase);
      if (this._treeZip && d.zipid === this._treeZip.zipid && d.phase === "exit") {
        this._settleTreeZip(d.exit ? { error: 1 } : {});
      }
    },
  };
  const result = await awaitTreeZip.call(win, id, 0);
  assert.deepEqual(result, {});
  assert.deepEqual(settled, ["exit"]);
});

test("normal order: nothing replayed when the reply arrives first", async () => {
  const id = zipid();
  const win = {
    mset() {},
    _settleTreeZip(r) {
      const t = this._treeZip;
      this._treeZip = null;
      clearTimeout(t.timer);
      t.resolve(r);
    },
    handleDownload() { throw new Error("must not replay"); },
  };
  const p = awaitTreeZip.call(win, id, 0);
  assert.ok(win._treeZip, "waiting on the push");
  win._settleTreeZip({});
  assert.deepEqual(await p, {});
});

test("the tile's media.download reply replays a missed end", () => {
  const core = src("builtins/media/core.js");
  const at = core.indexOf("case SERVICE.media.download:");
  const block = core.slice(at, core.indexOf("break;", at));
  // Order matters: the tile must carry the zipid (and size) before replaying,
  // or handleDownload ignores the push.
  const mset = block.indexOf("this.mset({ zipid: data.zipid");
  const size = block.indexOf("this._zipsize = data.size");
  const take = block.indexOf('require("libs/zip-pushes").take(data.zipid)');
  assert.ok(mset > 0 && size > mset && take > size, "replay comes after zipid + size are set");
  assert.match(block, /if \(missed\) this\.handleDownload\(missed\)/);
});
