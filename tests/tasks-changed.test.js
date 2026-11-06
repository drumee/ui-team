// libs/tasks-changed — the tab-local "a task was written here" signal the
// Personal Calendar listens to (task.* pushes skip the writer's socket).
//
//   node --test tests/tasks-changed.test.js
const test = require("node:test");
const assert = require("node:assert");

// Minimal Backbone-style radio: on / off / trigger.
function fakeRadio() {
  const map = {};
  return {
    on(ev, fn) { (map[ev] = map[ev] || []).push(fn); },
    off(ev, fn) { map[ev] = (map[ev] || []).filter((f) => f !== fn); },
    trigger(ev, ...args) { (map[ev] || []).slice().forEach((f) => f(...args)); },
  };
}

global.RADIO_BROADCAST = fakeRadio();
const {
  EVENT,
  announceTasksChanged,
  announceTaskWrite,
  onTasksChanged,
} = require("../src/drumee/libs/tasks-changed");

test("EVENT is tasks:changed", () => {
  assert.strictEqual(EVENT, "tasks:changed");
});

test("a successful task.update_assignee announces its service", () => {
  const seen = [];
  const off = onTasksChanged((d) => seen.push(d));
  assert.strictEqual(announceTaskWrite("task.update_assignee", [{ id: 1 }]), true);
  off();
  assert.deepStrictEqual(seen, [{ service: "task.update_assignee" }]);
});

test("a failed write (undefined result) announces nothing", () => {
  const seen = [];
  const off = onTasksChanged((d) => seen.push(d));
  assert.strictEqual(announceTaskWrite("task.update", undefined), false);
  assert.strictEqual(announceTaskWrite("task.create", null), false);
  off();
  assert.deepStrictEqual(seen, []);
});

test("a write the calendar does not draw announces nothing", () => {
  const seen = [];
  const off = onTasksChanged((d) => seen.push(d));
  assert.strictEqual(announceTaskWrite("task.comment_create", { id: 1 }), false);
  off();
  assert.deepStrictEqual(seen, []);
});

test("every row-changing service announces", () => {
  for (const s of [
    "task.create", "task.update", "task.update_status",
    "task.update_assignee", "task.delete",
  ]) {
    assert.strictEqual(announceTaskWrite(s, { id: 1 }), true, s);
  }
});

test("off() unbinds the listener", () => {
  const seen = [];
  const off = onTasksChanged((d) => seen.push(d));
  off();
  announceTasksChanged("task.create");
  assert.deepStrictEqual(seen, []);
});

test("no RADIO_BROADCAST: listen returns a no-op off, announce never throws", () => {
  const saved = global.RADIO_BROADCAST;
  delete global.RADIO_BROADCAST;
  try {
    const off = onTasksChanged(() => {});
    assert.strictEqual(typeof off, "function");
    off();
    assert.doesNotThrow(() => announceTasksChanged("task.create"));
  } finally {
    global.RADIO_BROADCAST = saved;
  }
});
