// media-contextmenu-download-selection.test.js — "Download" on a selection.
//
//   node --test tests/media-contextmenu-download-selection.test.js
//
// The contextmenu Download row called this.download() (ui-core mfs.js), which
// fetches the clicked node only, so a selection never downloaded as one. It
// now hands a multi-selection that includes the item to Wm.download() — the
// selection-aware path (window/manager: zip via window_downloader). Runs the
// real media/interact _downloadFromMenu against stubs.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(path.join(__dirname, "../src/drumee/builtins/media/interact.js"), "utf8")
  .replace(/\r\n/g, "\n");

function setup({ selection = [], casual = false } = {}) {
  const calls = [];
  global.window = {
    Wm: {
      getGlobalSelection: () => selection.slice(),
      download: () => calls.push("wm.download"),
    },
  };
  const exportMod = {
    isCasualFile: () => casual,
    downloadAsOffice: () => {
      calls.push("office");
      return Promise.resolve();
    },
  };
  const fakeRequire = (m) => {
    if (m === "builtins/editor/export") return exportMod;
    throw new Error(`unexpected require ${m}`);
  };
  const fn = new Function(
    "_",
    "window",
    "require",
    `return ${sliceFunction(SRC, "_downloadFromMenu()")}`,
  )(_, global.window, fakeRequire);
  const item = (name) => ({
    name,
    _downloadFromMenu: fn,
    download: () => calls.push(`${name}.download`),
    warn: () => {},
  });
  return { calls, item };
}

test("an item inside a multi-selection downloads the selection", () => {
  const sel = [];
  const { calls, item } = setup({ selection: sel });
  const a = item("a");
  const b = item("b");
  sel.push(a, b);
  a._downloadFromMenu();
  assert.deepEqual(calls, ["wm.download"]);
});

test("a lone item keeps its own download", () => {
  const sel = [];
  const { calls, item } = setup({ selection: sel });
  const a = item("a");
  sel.push(a);
  a._downloadFromMenu();
  assert.deepEqual(calls, ["a.download"]);
});

test("an item outside the selection downloads itself only", () => {
  const sel = [];
  const { calls, item } = setup({ selection: sel });
  sel.push(item("x"), item("y"));
  const c = item("c");
  c._downloadFromMenu();
  assert.deepEqual(calls, ["c.download"]);
});

test("a lone Casual Docs file still exports to Office", async () => {
  const { calls, item } = setup({ casual: true });
  await item("doc")._downloadFromMenu();
  assert.deepEqual(calls, ["office"]);
});
