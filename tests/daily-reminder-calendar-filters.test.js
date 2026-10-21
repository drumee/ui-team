// tests/daily-reminder-calendar-filters.test.js — the Daily Reminder's
// calendar tiles open the Personal Calendar narrowed to their own kind
// (Lexis, 2026-10-20): due tasks → month view on Task, meetings → today in day
// view on Meeting. [My calendar] and the calendar row keep month view on All.
//
//   node --test tests/daily-reminder-calendar-filters.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const WIDGET_SRC = read("src/drumee/builtins/widget/daily-reminder-popup/index.js");
const SKELETON_SRC = read("src/drumee/builtins/widget/daily-reminder-popup/skeleton/index.js");
const DESK_SRC = read("src/drumee/modules/desk/index.js");
const CAL_SRC = read("src/drumee/builtins/panel/calendar/index.js");

const method = (src, sig) => eval(`(${sliceFunction(src, sig)})`);

global._ = global._ || {};
global._.isFunction = (f) => typeof f === "function";
global._.isEmpty = global._.isEmpty || ((o) => !o || Object.keys(o).length === 0);
global._a = Object.assign(global._a || {}, { service: "service" });

// ── widget: which desk args each control sends ───────────────────────────────

const onUiEvent = method(WIDGET_SRC, "onUiEvent(cmd, args = {})");

function clickWidget(service) {
  const sent = [];
  const self = { _openDeskScreen: (cmd, args) => sent.push(args) };
  onUiEvent.call(self, { mget: () => service }, {});
  return sent;
}

test("the due-tasks tile opens month view on the Task filter", () => {
  assert.deepEqual(clickWidget("daily-reminder-tasks"), [
    { service: "toggle-calendar", calendarView: "month", calendarFilter: "task" },
  ]);
});

test("the meetings tile opens day view on the Meeting filter", () => {
  assert.deepEqual(clickWidget("daily-reminder-meetings"), [
    { service: "toggle-calendar", calendarView: "day", calendarFilter: "meeting" },
  ]);
});

test("[My calendar] and the calendar row still open month view, no filter", () => {
  assert.deepEqual(clickWidget("daily-reminder-calendar"), [
    { service: "toggle-calendar", calendarView: "month" },
  ]);
});

test("the inbox tile is unchanged", () => {
  assert.deepEqual(clickWidget("daily-reminder-inbox"), [{ service: "toggle-inbox" }]);
});

test("each calendar tile is wired to its own service in the skeleton", () => {
  assert.match(SKELETON_SRC, /counts\.due_tasks, "daily-reminder-tasks"\)/);
  assert.match(SKELETON_SRC, /counts\.meetings, "daily-reminder-meetings"\)/);
  // The row and the primary button keep the plain calendar service.
  assert.equal(SKELETON_SRC.match(/service: "daily-reminder-calendar"/g).length, 2);
});

// ── desk: the filter reaches both the fresh mount and a revealed screen ─────

const openCalendar = method(DESK_SRC, "_openCalendar(view, filter)");

function desk(child) {
  const calls = [];
  const self = {
    togglePanel: (...a) => {
      calls.push(a);
      return Promise.resolve();
    },
    getPart: () => ({ isEmpty: () => !child, children: { last: () => child } }),
  };
  return { self, calls };
}

test("a named view and filter become launch options AND a focusView call", async () => {
  const focused = [];
  const child = { focusView: (...a) => focused.push(a) };
  const { self, calls } = desk(child);
  await openCalendar.call(self, "day", "meeting");
  assert.deepEqual(calls, [
    ["calendar_main", "settings-main-slot", true, { startView: "day", startFilter: "meeting" }],
  ]);
  assert.deepEqual(focused, [["day", "meeting"]]);
});

test("no view (rail, topbar, restore) still passes no options at all", async () => {
  const focused = [];
  const { self, calls } = desk({ focusView: (...a) => focused.push(a) });
  await openCalendar.call(self, undefined, undefined);
  assert.deepEqual(calls, [["calendar_main", "settings-main-slot", true, undefined]]);
  assert.deepEqual(focused, []);
});

// ── calendar: focusView applies the filter ──────────────────────────────────

global.VIEW_KEYS = ["month", "week", "day"];
global.FILTER_KEYS = ["all", "task", "meeting"];
global.Dayjs = () => ({ format: () => "2026-10-20" });
global.ymd = () => "2026-10-20";
const focusView = method(CAL_SRC, "focusView(view, filter)");

function calendar(state) {
  let reloads = 0;
  const self = {
    _view: "month",
    _cursor: "2026-10-20",
    _audience: "team",
    _filter: "all",
    ...state,
    _closeMenus: () => {},
    _reload: () => {
      reloads++;
    },
  };
  return { self, reloads: () => reloads };
}

test("focusView switches the kind filter and refetches", () => {
  const { self, reloads } = calendar({ _view: "week" });
  focusView.call(self, "day", "meeting");
  assert.equal(self._view, "day");
  assert.equal(self._filter, "meeting");
  assert.equal(reloads(), 1);
});

test("focusView without a filter resets to All, as before", () => {
  const { self } = calendar({ _filter: "task", _view: "day" });
  focusView.call(self, "month");
  assert.equal(self._filter, "all");
});

test("an unknown filter falls back to All", () => {
  const { self } = calendar({ _filter: "task", _view: "day" });
  focusView.call(self, "month", "bogus");
  assert.equal(self._filter, "all");
});

test("already on that view, day and filter → no second fetch", () => {
  const { self, reloads } = calendar({ _filter: "task" });
  focusView.call(self, "month", "task");
  assert.equal(reloads(), 0);
});

test("a fresh mount reads startFilter, validated against FILTER_KEYS", () => {
  assert.match(CAL_SRC, /const startFilter = this\.mget\("startFilter"\);/);
  assert.match(CAL_SRC, /this\._filter = FILTER_KEYS\.includes\(startFilter\) \? startFilter : "all";/);
});
