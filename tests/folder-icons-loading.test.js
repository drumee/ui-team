// folder-icons-loading.test.js — the files panel's data-loading stamp that
// swaps the Files list for its skeleton while the first page is in flight.
//
//   node --test tests/folder-icons-loading.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
global._e = { data: "data", eod: "eod", error: "error" };

const L = require("../src/drumee/builtins/window/folder/icons-loading");

function fakeList() {
  const em = new EventEmitter();
  const panel = { dataset: {} };
  return {
    panel,
    el: { closest: (sel) => (sel === ".window__files-panel" ? panel : null) },
    once: (ev, fn) => em.once(ev, fn),
    off: (ev, fn) => em.off(ev, fn),
    trigger: (ev) => em.emit(ev),
    count: (ev) => em.listenerCount(ev),
  };
}
const fakeWin = () => ({ fig: { group: "window" } });

test("begin stamps the panel; the first data event clears it", () => {
  const win = fakeWin(), list = fakeList();
  L.begin(win, list);
  assert.equal(list.panel.dataset.loading, "1");
  assert.equal(L.isLoading(win), true);
  list.trigger("data");
  assert.equal(list.panel.dataset.loading, undefined);
  assert.equal(L.isLoading(win), false);
  assert.equal(list.count("eod") + list.count("error") + list.count("data"), 0);
});

test("eod and error also clear it", () => {
  for (const ev of ["eod", "error"]) {
    const win = fakeWin(), list = fakeList();
    L.begin(win, list);
    list.trigger(ev);
    assert.equal(list.panel.dataset.loading, undefined, ev);
  }
});

test("a new begin supersedes the old list's listeners", () => {
  const win = fakeWin(), a = fakeList(), b = fakeList();
  L.begin(win, a);
  L.begin(win, b);
  assert.equal(a.panel.dataset.loading, undefined);
  assert.equal(a.count("data"), 0);
  a.trigger("data"); // stale list answering must not clear b
  assert.equal(b.panel.dataset.loading, "1");
});

test("safety timeout clears a load that never answers", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const win = fakeWin(), list = fakeList();
  L.begin(win, list);
  t.mock.timers.tick(15000);
  assert.equal(list.panel.dataset.loading, undefined);
});

// A fresh pane (workspace switch) registers the list as a part in ui-core's
// onBeforeRender — before it is attached under its files panel — so the first
// closest() finds nothing. The stamp must land once it is attached, before the
// next paint, or the pane shows nothing at all while the first page loads.
function detachedList() {
  const list = fakeList();
  let attached = false;
  list.el = { closest: (sel) => (attached && sel === ".window__files-panel" ? list.panel : null) };
  list.attach = () => { attached = true; };
  return list;
}
function fakeRaf() {
  const q = [];
  global.requestAnimationFrame = (f) => q.push(f);
  global.cancelAnimationFrame = (id) => { q[id - 1] = null; };
  return () => { const fs = q.splice(0); fs.forEach((f) => f && f()); };
}

test("a list not yet attached is stamped on the frame it is attached", () => {
  const frame = fakeRaf();
  const win = fakeWin(), list = detachedList();
  L.begin(win, list);
  assert.equal(L.isLoading(win), true);
  assert.equal(list.panel.dataset.loading, undefined);
  frame(); // still detached: keeps looking
  assert.equal(list.panel.dataset.loading, undefined);
  list.attach();
  frame();
  assert.equal(list.panel.dataset.loading, "1");
  list.trigger("data");
  assert.equal(list.panel.dataset.loading, undefined);
  assert.equal(L.isLoading(win), false);
});

test("a list that answers before it is attached never stamps", () => {
  const frame = fakeRaf();
  const win = fakeWin(), list = detachedList();
  L.begin(win, list);
  list.trigger("eod");
  list.attach();
  frame();
  assert.equal(list.panel.dataset.loading, undefined);
});

test("end() with no panel found yet is safe and idempotent", () => {
  fakeRaf();
  const win = fakeWin();
  const list = { el: { closest: () => null }, once() {}, off() {} };
  L.begin(win, list);
  L.end(win);
  L.end(win);
  assert.equal(L.isLoading(win), false);
});
