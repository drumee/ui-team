// Personal Calendar answers libs/tasks-changed (a task written from the Tasks
// panel in THIS tab) with its debounced re-read. Runs the REAL methods against
// a stub `this`.
//
//   node --test tests/calendar-tasks-changed.test.js
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = readFileSync(
  resolve(__dirname, "../src/drumee/builtins/panel/calendar/index.js"),
  "utf8",
);
const load = (sig) => new Function(`return ${sliceFunction(SRC, sig)}`)();

function makeHost(over = {}) {
  const reloads = [];
  const host = {
    _parked: false,
    _form: null,
    _dirty: false,
    _reloadTimer: null,
    isDestroyed: () => false,
    _reload: () => reloads.push(1),
    _scheduleReload: load("_scheduleReload()"),
    _onTasksChanged: load("_onTasksChanged()"),
    ...over,
  };
  return { host, reloads };
}

test("a burst of announcements (detail panel's parallel writes) reloads once", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { host, reloads } = makeHost();
  host._onTasksChanged();
  host._onTasksChanged();
  t.mock.timers.tick(250);
  assert.strictEqual(reloads.length, 1);
});

test("parked calendar defers to onPanelShown", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { host, reloads } = makeHost({ _parked: true });
  host._onTasksChanged();
  t.mock.timers.tick(250);
  assert.strictEqual(reloads.length, 0);
  assert.strictEqual(host._dirty, true);
});

test("the calendar's own open modal keeps its draft", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { host, reloads } = makeHost({ _form: {} });
  host._onTasksChanged();
  t.mock.timers.tick(250);
  assert.strictEqual(reloads.length, 0);
  assert.strictEqual(host._dirty, true);
});

test("a destroyed calendar ignores it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { host, reloads } = makeHost({ isDestroyed: () => true });
  host._onTasksChanged();
  t.mock.timers.tick(250);
  assert.strictEqual(reloads.length, 0);
  assert.strictEqual(host._dirty, false);
});

test("initialize subscribes and onBeforeDestroy unsubscribes", () => {
  assert.match(SRC, /require\("libs\/tasks-changed"\)/);
  assert.match(sliceFunction(SRC, "initialize(opt = {})"), /this\._offTasksChanged = onTasksChanged\(/);
  assert.match(sliceFunction(SRC, "onBeforeDestroy()"), /this\._offTasksChanged\(\)/);
});

// A live reload must see the write: fetchService GETs are HTTP-cached, so the
// calendar.list re-read carries a fresh cache-buster every time.
test("calendar.list reads carry a fresh _ts", async () => {
  const readWindow = new Function(
    "Visitor", "SERVICE", "ymd",
    `return ${sliceFunction(SRC, "async _readWindow(from, to)")}`,
  )({ id: "me" }, {}, (d) => d.v);
  const sent = [];
  const host = {
    fetchService: async (arg) => { sent.push(arg); return []; },
    warn: () => {},
  };
  const day = (v) => ({ v, subtract: () => day(v), add: () => day(v) });
  await readWindow.call(host, day("2026-10-01"), day("2026-10-31")).catch(() => {});
  await new Promise((r) => setTimeout(r, 2));
  await readWindow.call(host, day("2026-10-01"), day("2026-10-31")).catch(() => {});
  assert.strictEqual(sent.length, 2);
  assert.strictEqual(sent[0].service, "calendar.list");
  assert.strictEqual(typeof sent[0]._ts, "number");
  assert.notStrictEqual(sent[0]._ts, sent[1]._ts);
});
