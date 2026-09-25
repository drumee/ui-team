// items-ready.test.js — the one-shot "first load has painted" promise.
//
//   node --test tests/items-ready.test.js
//
// A screen restored after a reload is only useful once its items are on
// screen. Each screen arms this in initialize() and marks it at the point its
// first load has painted (rows, empty state or error state alike); the desk's
// screen restore waits on whenItemsReady().
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  armItemsReady,
  markItemsReady,
  isItemsReady,
} = require("../src/drumee/libs/items-ready");

const widget = () => ({ el: { dataset: {} } });

test("whenItemsReady stays pending until marked, then resolves true", async () => {
  const w = armItemsReady(widget());
  let settled = false;
  w.whenItemsReady().then(() => (settled = true));
  await Promise.resolve();
  assert.equal(settled, false);
  markItemsReady(w);
  assert.equal(await w.whenItemsReady(), true);
});

test("marking before anyone waits still resolves a later wait", async () => {
  const w = armItemsReady(widget());
  markItemsReady(w);
  assert.equal(await w.whenItemsReady(), true);
});

test("only the first mark counts", () => {
  const w = armItemsReady(widget());
  assert.equal(markItemsReady(w), true);
  assert.equal(markItemsReady(w), false);
  assert.equal(isItemsReady(w), true);
});

test("stamps data-items-ready on the element", () => {
  const w = armItemsReady(widget());
  markItemsReady(w);
  assert.equal(w.el.dataset.itemsReady, "1");
});

test("arming twice keeps the same promise", () => {
  const w = armItemsReady(widget());
  const first = w.whenItemsReady();
  armItemsReady(w);
  assert.equal(w.whenItemsReady(), first);
});

test("marking an unarmed widget, or nothing, is a harmless false", () => {
  assert.equal(markItemsReady(widget()), false);
  assert.equal(markItemsReady(null), false);
  assert.equal(isItemsReady(null), false);
});

test("a widget with no element yet can still be marked", async () => {
  const w = armItemsReady({});
  assert.equal(markItemsReady(w), true);
  assert.equal(await w.whenItemsReady(), true);
});
