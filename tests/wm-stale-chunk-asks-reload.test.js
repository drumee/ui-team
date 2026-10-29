// wm-stale-chunk-asks-reload.test.js — a viewer chunk that 404s asks for a reload.
//
//   node --test tests/wm-stale-chunk-asks-reload.test.js
//
// A tab left open across a deploy still names the old hashed chunks; opening a
// .jpg then 404'd the image viewer's chunk and _launchApp's dead end answered
// "There is currently no preview for this file type (jpg)" (2026-10-28). A
// ChunkLoadError now offers the reload instead, a missing player still offers
// the download, and the reload prompt survives its own chunk being gone.
// Runs the real window/manager _launchApp(), newVersion() and _confirmReload().
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(path.join(__dirname, "../src/drumee/builtins/window/manager.js"), "utf8")
  .replace(/\r\n/g, "\n");

const LOCALE = { INFO_NEW_VERSION: "new version", LATER: "Later" };

function slice(signature, Kind, location) {
  return new Function(
    "_", "_a", "_e", "Kind", "LOCALE", "Wm", "location", "require",
    `return ${sliceFunction(SRC, signature)}`,
  )(
    _, { filetype: "filetype" }, { close: "close" }, Kind, LOCALE, {}, location,
    () => () => ({ kind: "image_viewer" }),
  );
}

const tick = () => new Promise((r) => setImmediate(r));

function setup({ viewer, confirmLoads = true, answer = "yes" }) {
  const calls = [];
  const location = { reload: () => calls.push("reload") };
  const Kind = {
    get: () => null,
    waitFor: (k) => {
      calls.push(`waitFor:${k}`);
      if (k === "window_confirm") {
        return confirmLoads ? Promise.resolve({}) : Promise.reject(chunkError());
      }
      return viewer();
    },
  };
  const wm = {
    _launchApp: slice("_launchApp(media, args)", Kind, location),
    _confirmReload: slice("_confirmReload()", Kind, location),
    newVersion: slice("newVersion()", Kind, location),
    getWindowPreset: () => ({}),
    getWindowPosition: () => ({}),
    getWindowsPool: () => ({ append: () => calls.push("append") }),
    showProperties: () => calls.push("showProperties"),
    confirm: (skl) => {
      calls.push(`confirm:${skl.message}`);
      return answer === "yes" ? Promise.resolve() : Promise.reject();
    },
    warn: () => {},
    _hasDeskWindows: () => true,
  };
  const media = {
    mget: () => "image",
    wait: (v) => calls.push(`wait:${v}`),
  };
  return { wm, media, calls };
}

function chunkError() {
  const e = new Error("Loading chunk 454 failed.");
  e.name = "ChunkLoadError";
  return e;
}

test("a 404'd viewer chunk asks to reload, not 'no preview for jpg'", async () => {
  const { wm, media, calls } = setup({ viewer: () => Promise.reject(chunkError()) });
  wm._launchApp(media);
  await tick();
  assert.ok(!calls.includes("showProperties"));
  assert.ok(calls.includes("wait:0"), "the tile's spinner is cleared");
  assert.ok(calls.includes("confirm:new version"));
  assert.equal(calls.at(-1), "reload");
});

test("answering Later keeps the page", async () => {
  const { wm, media, calls } = setup({
    viewer: () => Promise.reject(chunkError()),
    answer: "later",
  });
  wm._launchApp(media);
  await tick();
  assert.ok(calls.includes("confirm:new version"));
  assert.ok(!calls.includes("reload"));
});

test("a stale CSS chunk is treated the same way", async () => {
  const e = new Error("Loading CSS chunk 454 failed.");
  e.code = "CSS_CHUNK_LOAD_FAILED";
  const { wm, media, calls } = setup({ viewer: () => Promise.reject(e) });
  wm._launchApp(media);
  await tick();
  assert.ok(calls.includes("confirm:new version"));
  assert.ok(!calls.includes("showProperties"));
});

test("when the prompt's own chunk is gone too, reload straight away", async () => {
  const { wm, media, calls } = setup({
    viewer: () => Promise.reject(chunkError()),
    confirmLoads: false,
  });
  wm._launchApp(media);
  await tick();
  assert.ok(!calls.some((c) => c.startsWith("confirm:")));
  assert.equal(calls.at(-1), "reload");
});

test("any other failure still offers the download", async () => {
  const { wm, media, calls } = setup({ viewer: () => Promise.reject(new Error("boom")) });
  wm._launchApp(media);
  await tick();
  assert.ok(calls.includes("showProperties"));
  assert.ok(!calls.some((c) => c.startsWith("confirm:")));
  assert.ok(!calls.includes("reload"));
});

test("a kind no seed registers still offers the download", async () => {
  const { wm, media, calls } = setup({ viewer: () => Promise.resolve(null) });
  wm._launchApp(media);
  await tick();
  assert.ok(calls.includes("showProperties"));
});

test("a viewer that loads is appended", async () => {
  const { wm, media, calls } = setup({ viewer: () => Promise.resolve(function V() {}) });
  wm._launchApp(media);
  await tick();
  assert.ok(calls.includes("append"));
  assert.ok(!calls.includes("showProperties"));
});

test("newVersion with windows open still asks Later / Yes", async () => {
  const { wm, calls } = setup({ viewer: () => Promise.resolve(null) });
  wm.__windowsLayer = { isEmpty: () => false };
  wm.newVersion();
  await tick();
  assert.ok(calls.includes("confirm:new version"));
  assert.equal(calls.at(-1), "reload");
});

test("newVersion on an empty desk reloads without asking", () => {
  const { wm, calls } = setup({ viewer: () => Promise.resolve(null) });
  wm.__windowsLayer = { isEmpty: () => true };
  wm._hasDeskWindows = () => false;
  wm.newVersion();
  assert.deepEqual(calls, ["reload"]);
});
