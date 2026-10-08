// media-row-contextmenu-selection.test.js — a right-click keeps the selection.
//
//   node --test tests/media-row-contextmenu-selection.test.js
//
// ui-core's contextmenu handler (letc.js) runs triggerMethod("toggle") on the
// row before building the menu. With bhv_radio on media_row, that broadcast
// setState(0) to every other row — and `state` IS the selection, so the menu's
// actions (removeMediaSelection, move, …) saw only the right-clicked row while
// the others still looked ticked. The first test reproduces that against the
// real behaviour; the rest pin the row's own replacement (media/row onToggle).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Module = require("module");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const ROW_SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/media/row/index.js"),
  "utf8",
);

test("root cause: ui-core's radio behaviour drops the other rows' selection", () => {
  // Load the real behaviour with just enough of its globals.
  const listeners = {};
  global.RADIO_BROADCAST = {
    on: (ch, f) => (listeners[ch] = listeners[ch] || []).push(f),
    off: () => {},
    trigger: (ch, ...a) => (listeners[ch] || []).forEach((f) => f(...a)),
  };
  global._a = new Proxy({}, { get: (t, k) => String(k) });
  global._e = global._a;
  global._K = { level: {} };
  global.noOperation = () => {};
  global.Marionette = { Behavior: class {} };
  const file = require.resolve(
    "@drumee/ui-core/letc/addons/backbone/view/behavior/radio.js",
    { paths: [path.join(__dirname, "..")] },
  );
  // ui-essentials does not load under plain node (directory ESM import);
  // radio.js only needs toggleState from it.
  const toggleState = (s) => (s === 1 || s === "1" || s === "on" || s === true ? 1 : 0);
  const origLoad = Module._load;
  Module._load = function (req, ...rest) {
    if (req === "@drumee/ui-essentials") return { toggleState };
    return origLoad.call(this, req, ...rest);
  };
  let Radio;
  try {
    Radio = require(file);
  } finally {
    Module._load = origLoad;
  }

  const mkRow = (cid, state) => {
    const view = {
      cid,
      attrs: { state, radio: "madia-toggle" },
      mget(k) { return this.attrs[k]; },
      setState(s) { this.attrs.state = s; },
      contains: () => false,
    };
    const b = new Radio();
    b.view = view;
    b.onRender();
    return { view, b };
  };
  const a = mkRow("a", 1); // ticked
  const b = mkRow("b", 1); // ticked
  const c = mkRow("c", 0); // right-clicked
  c.b.onToggle(); // letc.js: this.triggerMethod("toggle")
  assert.equal(a.view.attrs.state, 0, "ticked row a lost its selection");
  assert.equal(b.view.attrs.state, 0, "ticked row b lost its selection");
});

test("media_row no longer carries the radio behaviour", () => {
  const initClass = sliceFunction(ROW_SRC, "static initClass()");
  assert.doesNotMatch(initClass, /bhv_radio\s*:/);
  assert.doesNotMatch(ROW_SRC, /radio:\s*MEDIA_TOGGLE/);
});

// The row's own onToggle / _markCurrent, run against stubs.
function load() {
  const src = `
    let currentRow = null;
    return {
      onToggle: ${sliceFunction(ROW_SRC, "onToggle()")},
      _markCurrent: ${sliceFunction(ROW_SRC, "_markCurrent()")},
    };`;
  const { toggleState } = { toggleState: (s) => (s === 1 || s === "1" || s === "on" || s === true ? 1 : 0) };
  return new Function("_", "_a", "toggleState", "window", src)(
    _, { state: "state" }, toggleState, global.window,
  );
}

function setup() {
  const calls = [];
  const win = { unselect: (all) => calls.push(["win", all]) };
  global.window = { Wm: { unselect: (all) => calls.push(["wm", all]) } };
  global.Wm = global.window.Wm;
  const m = load();
  const mk = (state) => ({
    _s: state,
    el: { dataset: {} },
    isDestroyed: () => false,
    mget(k) { return k === "state" ? this._s : undefined; },
    getLogicalParent: () => win,
    ...m,
  });
  return { calls, mk };
}

test("right-click on a ticked row keeps the selection", () => {
  const { calls, mk } = setup();
  const row = mk(1);
  row.onToggle();
  assert.deepEqual(calls, [], "nothing unselected");
  assert.equal(row._s, 1);
  assert.equal(row.el.dataset.current, "1");
});

test("right-click outside the selection makes the menu act on that row alone", () => {
  const { calls, mk } = setup();
  const row = mk(0);
  row.onToggle();
  assert.deepEqual(calls, [["wm", 2], ["win", 0]]);
  assert.equal(row._s, 0, "the row itself is not silently selected");
});

test("the current-row highlight moves with each right-click", () => {
  const { mk } = setup();
  const a = mk(1);
  const b = mk(1);
  a.onToggle();
  b.onToggle();
  assert.equal(a.el.dataset.current, "0");
  assert.equal(b.el.dataset.current, "1");
});
