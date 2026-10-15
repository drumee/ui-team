// window-selection-marquee.test.js — the mouse marquee over a file list.
//
//   node --test tests/window-selection-marquee.test.js
//
// The row view orders its rows by type with CSS (folders first) and shows
// "Folders" / "Files" headings that come and go, so rows move without the
// mount or scroll that marks their cached box stale: the marquee tested
// against old positions. It now re-measures every tile when it starts. And a
// row it picks shows it: select() repaints the checkbox, and the window's
// header box and "N selected" chip are synced when the marquee ends. Runs the
// real window/selection _pointerdown / _pointerup and media select().
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const read = (f) => fs.readFileSync(path.join(__dirname, "../src/drumee", f), "utf8").replace(/\r\n/g, "\n");
const SEL = read("builtins/window/selection/index.js");
const MEDIA = read("builtins/media/interact.js");

const RADIO_POINTER = { trigger() {} };
const _a = { down: "down", up: "up", idle: "idle", state: "state" };
const load = (src, sig, extra = {}) => {
  const names = ["_", "_a", "_e", "RADIO_POINTER", "Wm", ...Object.keys(extra)];
  return new Function(...names, `return ${sliceFunction(src, sig)}`)(
    _, _a, { drag: "drag" }, RADIO_POINTER, extra.Wm || global.__Wm, ...Object.values(extra),
  );
};

function tile(name) {
  return {
    name,
    _bboxDirty: 0,
    measured: 0,
    invalidateBounds() { this._bboxDirty = 1; },
    get bbox() {
      if (this._bboxDirty) { this._bboxDirty = 0; this.measured++; }
      return { x: 0, y: 0, w: 10, h: 10 };
    },
  };
}

function setup(media) {
  const synced = [];
  const win = {
    acceptMedia: 1,
    el: { contains: () => true },
    iconsList: { children: { toArray: () => media } },
    contentRectangle: () => ({ top: () => 0 }),
    scrollTop: () => 0,
    getLocalSelection: () => ({}),
    _scheduleRowSelectSync() { synced.push(1); },
  };
  const layer = { children: { toArray: () => [win] } };
  const Wm = { el: { contains: () => false }, windowsLayer: layer, unselect() {} };
  const sel = {
    _accept: () => true,
    $rectangle: { css() {} },
    setState() {},
    _refreshStaleBounds: load(SEL, "_refreshStaleBounds()"),
    _pointerdown: load(SEL, "_pointerdown(e)", { Wm }),
    _pointerup: load(SEL, "_pointerup(e)"),
  };
  return { sel, win, synced };
}

test("a marquee re-measures every tile when it starts, stale or not", () => {
  const media = [tile("folder"), tile("file")];
  // Measured earlier, then moved by the CSS reorder: not marked stale.
  const { sel } = setup(media);
  sel._pointerdown({ pageX: 5, pageY: 5, target: {} });
  assert.deepEqual(media.map((m) => m.measured), [1, 1]);
});

test("when it ends, the window's header box and selected chip are synced", () => {
  global.window = {};
  const { sel, synced } = setup([tile("a")]);
  sel._pointerdown({ pageX: 5, pageY: 5, target: {} });
  sel._idle = 0; // it moved
  sel._pointerup({});
  assert.equal(synced.length, 1);
});

test("a plain click (no marquee) syncs nothing", () => {
  global.window = {};
  const { sel, synced } = setup([tile("a")]);
  sel._pointerdown({ pageX: 5, pageY: 5, target: {} });
  sel._pointerup({});
  assert.equal(synced.length, 0);
});

test("select() repaints the checkbox, as unselect() and tick() do", () => {
  const select = new Function("_a", `return ${sliceFunction(MEDIA, "select(opt, hide)")}`)(_a);
  const painted = [];
  const m = {
    _s: 0,
    el: { dataset: {} },
    setState(v) { this._s = v; },
    mget(k) { return k === "state" ? this._s : undefined; },
    mset() {},
    _changeState(...a) { painted.push(a); },
  };
  select.call(m, { select_mode: "drag" });
  assert.equal(m.el.dataset.selected, 1);
  assert.deepEqual(painted, [["checkbox", "selected", 1]]);
});
