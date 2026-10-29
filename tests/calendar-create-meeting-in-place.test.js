// tests/calendar-create-meeting-in-place.test.js — a meeting created from the
// calendar's "New personal meeting" modal lands on its own day without a page
// reload: the row joins the held items and only that day's chip list is
// re-fed. Its "Done" (the invite-link card) closes the modal and reloads
// nothing, because the create no longer marks the page dirty.
//
//   node --test tests/calendar-create-meeting-in-place.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const CAL = path.join(__dirname, "../src/drumee/builtins/panel/calendar");
const SRC = fs.readFileSync(path.join(CAL, "index.js"), "utf8");
const MONTH = fs.readFileSync(path.join(CAL, "skeleton/month.js"), "utf8");

global._ = global._ || {};
global._.isFunction = (f) => typeof f === "function";
/* eslint-disable no-unused-vars */
const ymd = (v) => v;
const rowStart = (r) => r.day;
const itemsByDay = (rows) =>
  rows.reduce((acc, r) => ((acc[r.day] = acc[r.day] || []).push(r), acc), {});
/* eslint-enable no-unused-vars */
const SKELETONS = {
  "./skeleton/month": { dayBodyKids: (ui, list, key) => ({ month: key, ids: list.map((r) => r.id) }) },
  "./skeleton/board": { bodyKids: (ui, list, mode) => ({ board: mode, ids: list.map((r) => r.id) }) },
  "./skeleton/day-popover": (ui, key) => ({ popover: key }),
};
const [addItem, refeedDays] = (() => {
  // eslint-disable-next-line no-unused-vars
  const require = (p) => SKELETONS[p];
  return [
    eval(`(${sliceFunction(SRC, "_addItem(row)")})`),
    eval(`(${sliceFunction(SRC, "_refeedDays(keys)")})`),
  ];
})();

function calendar(items, { view = "month", window = ["2026-10-01", "2026-10-31"], missing = [] } = {}) {
  const fed = {};
  const self = {
    _view: view,
    _items: items,
    renders: 0,
    reloads: 0,
    drops: 0,
    getVisibleItems() {
      return this._items.filter((r) => r.day >= window[0] && r.day <= window[1]);
    },
    getPart(name) {
      if (missing.includes(name)) return null;
      return { el: {}, feed: (kids) => (fed[name] = kids) };
    },
    _render() {
      this.renders++;
    },
    _reload() {
      this.reloads++;
    },
    _dropWindowCache() {
      this.drops++;
    },
    _placeDayMenu() {},
    _refeedDays: refeedDays,
  };
  return { self, fed };
}

const held = () => [{ id: "a", kind: "meeting", day: "2026-10-02" }];

test("a new meeting re-feeds only its own day", () => {
  const { self, fed } = calendar(held());
  addItem.call(self, { id: "n", kind: "meeting", day: "2026-10-02" });
  assert.deepEqual(fed, { "cal-body-2026-10-02": { month: "2026-10-02", ids: ["a", "n"] } });
  assert.equal(self.renders, 0);
  assert.equal(self.reloads, 0);
  assert.equal(self.drops, 1, "the neighbour windows are re-read on demand");
  assert.deepEqual(self._items.map((r) => r.id), ["a", "n"]);
});

test("a meeting outside the window on screen re-feeds nothing", () => {
  const { self, fed } = calendar(held());
  addItem.call(self, { id: "n", kind: "meeting", day: "2026-12-25" });
  assert.deepEqual(fed, {});
  assert.equal(self.renders, 0);
  assert.equal(self._items.length, 2);
});

test("no part for that day: one repaint, still no refetch", () => {
  const { self } = calendar(held(), { missing: ["cal-body-2026-10-05"] });
  addItem.call(self, { id: "n", kind: "meeting", day: "2026-10-05" });
  assert.equal(self.renders, 1);
  assert.equal(self.reloads, 0);
});

test("the create path adds in place and no longer marks the page dirty", () => {
  const body = sliceFunction(SRC, "async _writeMeeting(draft, title)");
  const create = body.slice(body.indexOf("const bookSvc"));
  assert.match(create, /this\._addItem\(/);
  assert.doesNotMatch(create, /this\._dirty = true/);
});

test("a month day always draws its chip-list part, empty or not", () => {
  const at = MONTH.indexOf("const dayBody = (list, key) => {");
  const body = MONTH.slice(at, MONTH.indexOf("const dayCell", at));
  assert.doesNotMatch(body, /if \(!list\.length\) return null;/);
  assert.match(body, /sys_pn: `cal-body-\$\{key\}`/);
});
