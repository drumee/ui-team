// Same-column drag reorder is persisted through task.reorder, anchored on the
// next same-column task in the MODEL (not the DOM, which is windowed), and the
// column autoscrolls while a card is held near its edge. Runs the REAL methods
// against a stub `this`.
//
//   node --test tests/tasks-reorder-persist.test.js
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = readFileSync(
  resolve(__dirname, "../src/drumee/builtins/window/tasks/index.js"),
  "utf8",
);
const SERVICE = { task: { reorder: "task.reorder" } };
const method = (sig) =>
  new Function("SERVICE", `return ${sliceFunction(SRC, sig)}`)(SERVICE);

const persist = method("async _persistReorder(taskId, status)");
const applyRanks = method("_applyColumnRanks(rows)");
const autoScroll = method("_dragAutoScroll(col, y)");

function host(tasks, answer) {
  const calls = [];
  const h = {
    _hubId: "h1",
    _tasks: tasks,
    reloaded: 0,
    postService: async (p) => (calls.push(p), answer(p)),
    _loadTasks: async () => void h.reloaded++,
    _render: () => {},
    _applyColumnRanks: applyRanks,
  };
  return { h, calls };
}

const T = (id, status, rank) => ({ id, status, rank });

test("anchors on the next task in the same column, skipping others", async () => {
  const { h, calls } = host(
    [T("a", "todo", 1), T("x", "done", 1), T("b", "todo", 2)],
    () => [{ id: "a", rank: 1 }, { id: "b", rank: 2 }],
  );
  await persist.call(h, "a", "todo");
  assert.deepStrictEqual(calls, [
    { service: "task.reorder", hub_id: "h1", id: "a", before_id: "b" },
  ]);
  assert.strictEqual(h.reloaded, 0);
});

test("last in its column sends an empty anchor (bottom)", async () => {
  const { h, calls } = host(
    [T("b", "todo", 1), T("a", "todo", 9), T("x", "done", 1)],
    () => [{ id: "b", rank: 1 }, { id: "a", rank: 2 }],
  );
  await persist.call(h, "a", "todo");
  assert.strictEqual(calls[0].before_id, "");
  // Server ranks adopted into the model.
  assert.strictEqual(h._tasks[1].rank, 2);
});

test("a failed save (postService resolves undefined) reloads", async () => {
  const { h } = host([T("a", "todo", 1), T("b", "todo", 2)], () => undefined);
  await persist.call(h, "a", "todo");
  assert.strictEqual(h.reloaded, 1);
});

function fakeCol({ top = 100, height = 300, scrollHeight = 1000 } = {}) {
  return {
    isConnected: true,
    dataset: { dropcol: "todo" },
    scrollTop: 200,
    clientHeight: height,
    scrollHeight,
    getBoundingClientRect: () => ({ top, bottom: top + height, height }),
  };
}

function withRaf(fn) {
  const queue = [];
  global.requestAnimationFrame = (cb) => (queue.push(cb), queue.length);
  global.cancelAnimationFrame = () => {};
  try {
    return fn(() => queue.splice(0).forEach((cb) => cb()));
  } finally {
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  }
}

test("holding a card at the bottom edge scrolls down; the middle does not", () =>
  withRaf((tick) => {
    const h = { el: {}, _dragAfterCard: () => null, _dragAutoScroll: autoScroll };
    const col = fakeCol();
    h._dragAutoScroll(col, 250); // middle
    tick();
    assert.strictEqual(col.scrollTop, 200);
    h._dragAutoScroll(col, 398); // bottom edge
    tick();
    tick();
    assert.ok(col.scrollTop > 200, `scrolled to ${col.scrollTop}`);
    h._dragAutoScroll(null);
    const at = col.scrollTop;
    tick();
    assert.strictEqual(col.scrollTop, at);
  }));

test("over the header (above the body) scrolls up at full speed", () =>
  withRaf((tick) => {
    const h = { el: {}, _dragAfterCard: () => null, _dragAutoScroll: autoScroll };
    const col = fakeCol();
    h._dragAutoScroll(col, 80);
    tick();
    assert.strictEqual(col.scrollTop, 200 - 18);
  }));

test("a column that does not overflow never scrolls", () =>
  withRaf((tick) => {
    const h = { el: {}, _dragAfterCard: () => null, _dragAutoScroll: autoScroll };
    const col = fakeCol({ scrollHeight: 300 });
    h._dragAutoScroll(col, 398);
    tick();
    assert.strictEqual(col.scrollTop, 200);
    assert.strictEqual(h._autoScroll, null);
  }));
