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

test("no panel (list not mounted in a files panel) is a no-op", () => {
  const win = fakeWin();
  const list = { el: { closest: () => null }, once() {}, off() {} };
  L.begin(win, list);
  assert.equal(L.isLoading(win), false);
  L.end(win); // idempotent
});
