// window-row-select-all.test.js — the row view's header checkbox.
//
//   node --test tests/window-row-select-all.test.js
//
// content/row's header box ticks every BUILT row of the list, or clears them
// all once every one is ticked, and paints itself 0 / 1 / mixed from the rows.
// Runs the real window/core methods against a stub window and stub rows.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/core.js"),
  "utf8",
);
const _a = { state: "state" };
global.LOCALE = { X_SELECTED: "{0} selected" };
if (!String.prototype.format) {
  // ui-core's String#format, as LOCALE strings use it.
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] != null ? args[i] : m));
  };
}
const ROW_SELECT_MIN_SPIN = 300;
const ROW_FETCH_POLL = 20;
const load = (sig) =>
  new Function(
    "_",
    "_a",
    "ROW_SELECT_MIN_SPIN",
    "ROW_FETCH_POLL",
    `return ${sliceFunction(SRC, sig)}`,
  )(_, _a, ROW_SELECT_MIN_SPIN, ROW_FETCH_POLL);

const methods = {
  _selectableRows: load("_selectableRows()"),
  _toggleRowSelectAll: load("_toggleRowSelectAll()"),
  _syncRowSelectAll: load("_syncRowSelectAll()"),
  _rowListFetching: load("_rowListFetching()"),
  _paintSelectedChip: load("_paintSelectedChip(count)"),
  _clearRowSelection: load("_clearRowSelection()"),
};

function row(state = 0, extra = {}) {
  const r = {
    _s: state,
    painted: null,
    mget(k) {
      return k === "state" ? this._s : undefined;
    },
    select() {
      this._s = 1;
    },
    unselect() {
      this._s = 0;
    },
    _changeState(name, attr, v) {
      this.painted = v;
    },
    ...extra,
  };
  return r;
}

function win(rows, list = {}) {
  const box = { dataset: { checked: "0" } };
  const label = { textContent: "" };
  const chip = {
    dataset: { count: "0" },
    querySelector: (sel) => (sel === ".window__selected-chip-label" ? label : null),
  };
  const main = {
    querySelector: (sel) => (sel === ".window__selected-chip" ? chip : null),
  };
  const l = { children: { toArray: () => rows }, isWaiting: () => false, ...list };
  return {
    ...methods,
    fig: { group: "window" },
    box,
    chip,
    label,
    list: l,
    _rowList: () => l,
    _rowMain: () => main,
    _rowSelectAllBox: () => box,
  };
}

test("ticks every built row and paints their checkboxes", async () => {
  const rows = [row(0), row(1), row(0)];
  const w = win(rows);
  await w._toggleRowSelectAll();
  assert.deepEqual(rows.map((r) => r._s), [1, 1, 1]);
  assert.equal(rows[0].painted, 1);
  assert.equal(rows[1].painted, null, "an already-ticked row is left alone");
  assert.equal(w.box.dataset.checked, "1");
  assert.equal(w.box.dataset.loading, "0");
});

test("clears them all when every row is ticked", async () => {
  const rows = [row(1), row(1)];
  const w = win(rows);
  await w._toggleRowSelectAll();
  assert.deepEqual(rows.map((r) => r._s), [0, 0]);
  assert.equal(w.box.dataset.checked, "0");
});

test("skips pseudo rows and rows that cannot be selected", async () => {
  const pseudo = row(0, { isPseudo: 1 });
  const inert = { mget: () => 0 };
  const rows = [row(0), pseudo, inert];
  const w = win(rows);
  await w._toggleRowSelectAll();
  assert.equal(rows[0]._s, 1);
  assert.equal(pseudo._s, 0);
  assert.equal(w.box.dataset.checked, "1", "only selectable rows count");
});

test("paints mixed, and disables itself on an empty list", () => {
  const w = win([row(1), row(0)]);
  w._syncRowSelectAll();
  assert.equal(w.box.dataset.checked, "mixed");
  assert.equal(w.box.dataset.disabled, "0");

  const empty = win([]);
  empty._syncRowSelectAll();
  assert.equal(empty.box.dataset.checked, "0");
  assert.equal(empty.box.dataset.disabled, "1");
});

test("a click while it is ticking is ignored", async () => {
  const rows = [row(0)];
  const w = win(rows);
  const first = w._toggleRowSelectAll();
  assert.equal(w.box.dataset.loading, "1");
  assert.equal(w._toggleRowSelectAll(), undefined);
  await first;
  assert.equal(rows[0]._s, 1, "a second toggle did not undo the first");
});

test("holds the click spinner long enough to be seen", async () => {
  const w = win([row(0)]);
  const t0 = Date.now();
  const p = w._toggleRowSelectAll();
  assert.equal(w.box.dataset.loading, "1");
  await p;
  assert.ok(Date.now() - t0 >= ROW_SELECT_MIN_SPIN - 5);
  assert.equal(w.box.dataset.loading, "0");
});

test("spins while the list fetches, then settles on its own", async () => {
  let waiting = true;
  const rows = [row(0)];
  const w = win(rows, { isWaiting: () => waiting });
  w._syncRowSelectAll();
  assert.equal(w.box.dataset.loading, "1");
  assert.equal(w.box.dataset.disabled, "0", "a first load is not 'empty'");

  // A click while a page is in flight does nothing.
  assert.equal(w._toggleRowSelectAll(), undefined);
  assert.equal(rows[0]._s, 0);

  // No event announces the end of this fetch: the poll picks it up.
  waiting = false;
  await new Promise((r) => setTimeout(r, ROW_FETCH_POLL * 3));
  assert.equal(w.box.dataset.loading, "0");
  assert.equal(w._rowFetchPoll, null);
});

test("the selected chip counts the ticked rows and hides at zero", async () => {
  const rows = [row(1), row(0), row(1)];
  const w = win(rows);
  w._syncRowSelectAll();
  assert.equal(w.chip.dataset.count, "2");
  assert.equal(w.label.textContent, "2 selected");

  await w._toggleRowSelectAll();
  assert.equal(w.chip.dataset.count, "3");
  assert.equal(w.label.textContent, "3 selected");

  w._clearRowSelection();
  assert.deepEqual(rows.map((r) => r._s), [0, 0, 0]);
  assert.equal(w.chip.dataset.count, "0");
  assert.equal(w.box.dataset.checked, "0");
});
