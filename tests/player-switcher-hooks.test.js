// tests/player-switcher-hooks.test.js — players that change file in place
// tell the Open-File Switcher, and the vector player keeps a fixed height
// when the panel is beside it.
//
//   node --test tests/player-switcher-hooks.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const read = (p) =>
  fs.readFileSync(path.join(__dirname, `../src/drumee/builtins/player/${p}`), "utf8");

global._K = { size: { full: "100%" } };
global._a = { auto: "auto" };

test("audio changeSource (desk click reuses the window) syncs the panel", () => {
  const changeSource = new Function(`return ${sliceFunction(read("audio/index.js"), "changeSource(src)")}`)();
  const synced = [];
  const self = {
    __audio: { el: { pause() {} } },
    spinner() {},
    mset() {},
    fetchMediaInfo() {},
    _fileSwitcher: { syncCurrent: (n) => synced.push(n) },
  };
  const node = { nid: 3, hub_id: "h", filename: "c" };
  changeSource.call(self, { actualNode: () => node, model: { toJSON: () => node } });
  assert.deepEqual(synced, [node]);
});

function vectorSelf() {
  const css = [];
  return {
    css,
    self: {
      __content: {
        el: { innerHTML: "", childNodes: [] },
        $el: { height: () => 300, width: () => 400 },
      },
      $el: { width: () => 900, css: (o) => css.push(o) },
      display: (size, cb) => cb(),
    },
  };
}

test("vector keeps its window height when the panel is shown", () => {
  const start = new Function("withFileSwitcher",
    `return ${sliceFunction(read("vector/index.js"), "start()")}`
  )({ enabled: () => true });
  const { self, css } = vectorSelf();
  start.call(self);
  assert.equal(css.length, 0);
});

test("vector without the panel still hugs its drawing", () => {
  const start = new Function("withFileSwitcher",
    `return ${sliceFunction(read("vector/index.js"), "start()")}`
  )({ enabled: () => false });
  const { self, css } = vectorSelf();
  start.call(self);
  assert.equal(css.length, 1);
  assert.equal(css[0].height, "auto");
});
