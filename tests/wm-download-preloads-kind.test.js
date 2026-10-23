// wm-download-preloads-kind.test.js — the downloader is loaded before it mounts.
//
//   node --test tests/wm-download-preloads-kind.test.js
//
// Appended cold, window_downloader mounted ui-core's lazy placeholder, whose
// View.renew() swap (remove, then add) re-appended every child of the windows
// layer — the docked workspace pane included — on the first download of a
// session. Wm.download() now waits for the kind first, so the real window is
// the only thing ever appended. Runs the real window/manager download().
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(path.join(__dirname, "../src/drumee/builtins/window/manager.js"), "utf8")
  .replace(/\r\n/g, "\n");

function load(Kind) {
  return new Function(
    "_", "_a", "_e", "Kind", "Butler", "LOCALE",
    `return ${sliceFunction(SRC, "download(opt)")}`,
  )(_, { token: "token" }, { loaded: "loaded" }, Kind, { alert() {} }, {});
}

function wm(Kind, selection) {
  const appended = [];
  const events = [];
  const w = {
    download: load(Kind),
    appended,
    events,
    getGlobalSelection: () => selection.slice(),
    getActivePlayer: () => null,
    mget: () => "tok",
    getWindowsPool: () => ({
      append: (item) => {
        events.push("append");
        appended.push(item);
      },
    }),
  };
  return w;
}

const sel = () => [
  { isHandSelect: () => false },
  { isHandSelect: () => false },
];

test("waits for window_downloader to load, then appends the real window", async () => {
  let resolve;
  const events = [];
  const Kind = {
    waitFor: (k) => {
      events.push(`waitFor:${k}`);
      return new Promise((r) => (resolve = r));
    },
  };
  const w = wm(Kind, sel());
  w.events = events;
  w.getWindowsPool = () => ({ append: (item) => { events.push("append"); w.appended.push(item); } });
  w.download();
  assert.deepEqual(events, ["waitFor:window_downloader"], "nothing appended while loading");
  resolve(function Downloader() {});
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(events, ["waitFor:window_downloader", "append"]);
  assert.equal(w.appended[0].kind, "window_downloader");
  assert.equal(w.appended[0].nodes.length, 2);
  assert.equal(w.appended[0].token, "tok");
});

test("a failed load still opens the window (the lazy path, as before)", async () => {
  const Kind = { waitFor: () => Promise.reject(new Error("chunk")) };
  const w = wm(Kind, sel());
  w.download();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(w.appended.length, 1);
});

test("a single item never opens the downloader", async () => {
  let waited = 0;
  const Kind = { waitFor: () => { waited++; return Promise.resolve(); } };
  const one = { isHandSelect: () => false, once() {}, download() { this.done = 1; } };
  const w = wm(Kind, [one]);
  w.download();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(waited, 0);
  assert.equal(w.appended.length, 0);
  assert.equal(one.done, 1);
});
