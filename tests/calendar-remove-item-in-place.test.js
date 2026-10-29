// tests/calendar-remove-item-in-place.test.js — a chip's × takes the item off
// the screen without rebuilding the calendar page: only the chip lists of the
// days that showed it are re-fed (several for a series), an open "+N more"
// popover is re-fed in place, and nothing is refetched.
//
//   node --test tests/calendar-remove-item-in-place.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const CAL_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/builtins/panel/calendar/index.js"),
  "utf8"
);

global._ = global._ || {};
global._.isFunction = (f) => typeof f === "function";

// Names _dropItem closes over. A row's "start" is its `day` field.
/* eslint-disable no-unused-vars */
const ymd = (v) => v;
const rowStart = (r) => r.day;
const itemsByDay = (rows) =>
  rows.reduce((acc, r) => ((acc[r.day] = acc[r.day] || []).push(r), acc), {});
/* eslint-enable no-unused-vars */

// The skeleton builders, stubbed: each returns what it was asked to draw.
const SKELETONS = {
  "./skeleton/month": {
    dayBodyKids: (ui, list, key) => ({ month: key, ids: list.map((r) => r.id) }),
  },
  "./skeleton/board": {
    bodyKids: (ui, list, mode) => ({ board: mode, ids: list.map((r) => r.id) }),
  },
  "./skeleton/day-popover": (ui, key) => ({ popover: key }),
};
const [dropItem, refeedDays] = (() => {
  // eslint-disable-next-line no-unused-vars
  const require = (p) => SKELETONS[p];
  return [
    eval(`(${sliceFunction(CAL_SRC, "_dropItem(kind, id)")})`),
    eval(`(${sliceFunction(CAL_SRC, "_refeedDays(keys)")})`),
  ];
})();

function calendar(items, view = "month", missing = []) {
  const fed = {};
  const self = {
    _view: view,
    _items: items,
    renders: 0,
    drops: 0,
    getVisibleItems() {
      return this._items;
    },
    getPart(name) {
      if (missing.includes(name)) return null;
      return { el: {}, feed: (kids) => (fed[name] = kids) };
    },
    _render() {
      this.renders++;
    },
    _dropWindowCache() {
      this.drops++;
    },
    _placeDayMenu() {},
    _refeedDays: refeedDays,
  };
  return { self, fed };
}

const rows = () => [
  { id: 1, kind: "task", day: "2026-10-28" },
  { id: 2, kind: "task", day: "2026-10-28" },
  { id: 3, kind: "meeting", day: "2026-10-28" },
  // A series: the same meeting on two days.
  { id: 9, kind: "meeting", day: "2026-10-29" },
  { id: 9, kind: "meeting", day: "2026-10-30" },
];

test("removing a task re-feeds only its own day, with the rest of that day", () => {
  const { self, fed } = calendar(rows());
  dropItem.call(self, "task", 1);
  assert.deepEqual(fed, { "cal-body-2026-10-28": { month: "2026-10-28", ids: [2, 3] } });
  assert.equal(self.renders, 0);
  assert.equal(self.drops, 1);
  assert.deepEqual(self._items.map((r) => r.id), [2, 3, 9, 9]);
});

test("same id, other kind, is left alone", () => {
  const { self } = calendar(rows());
  dropItem.call(self, "meeting", 1);
  assert.equal(self._items.length, 5);
});

test("a series is taken off every day it showed on", () => {
  const { self, fed } = calendar(rows(), "week");
  dropItem.call(self, "meeting", 9);
  assert.deepEqual(fed, {
    "cal-body-2026-10-29": { board: "week", ids: [] },
    "cal-body-2026-10-30": { board: "week", ids: [] },
  });
  assert.equal(self.renders, 0);
});

test("an open +N more popover on that day is re-fed in place", () => {
  const { self } = calendar(rows());
  let popover = null;
  self._dayMenu = { key: "2026-10-28", over: {}, slot: { feed: (k) => (popover = k) } };
  dropItem.call(self, "task", 2);
  assert.deepEqual(popover, { popover: "2026-10-28" });
});

test("a popover on another day is not touched", () => {
  const { self } = calendar(rows());
  let popover = null;
  self._dayMenu = { key: "2026-10-01", over: {}, slot: { feed: (k) => (popover = k) } };
  dropItem.call(self, "task", 2);
  assert.equal(popover, null);
});

test("a day part that cannot be found falls back to a full render", () => {
  const { self } = calendar(rows(), "month", ["cal-body-2026-10-28"]);
  dropItem.call(self, "task", 1);
  assert.equal(self.renders, 1);
});
