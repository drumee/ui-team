// chat-export-date-row-ready.test.js — the date row shows a loading state
// until both flatpickr pickers exist (date_picker is a lazy kind and imports
// flatpickr on top), then is stamped data-ready="1".
//
//   node --test tests/chat-export-date-row-ready.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { watchDateRowReady } = require("../src/drumee/builtins/widget/chat-export/date-row-ready");

// A row with two field wraps; `inputs` flatpickr inputs mounted so far.
function row(inputs = 0, wraps = 2) {
  const el = {
    dataset: {},
    inputs,
    wraps,
    querySelectorAll(sel) {
      if (sel === ".widget-chat-export__date-input-wrap") return Array.from({ length: this.wraps });
      if (sel === ".flatpickr-input") return Array.from({ length: this.inputs });
      return [];
    },
  };
  return el;
}
// MutationObserver stand-in the test can fire.
function observerKit() {
  const kit = { observers: [] };
  kit.MO = class {
    constructor(cb) { this.cb = cb; this.on = false; kit.observers.push(this); }
    observe() { this.on = true; }
    disconnect() { this.on = false; }
  };
  kit.fire = () => kit.observers.filter((o) => o.on).forEach((o) => o.cb());
  return kit;
}

test("already mounted → ready at once, nothing left watching", () => {
  const kit = observerKit();
  const el = row(2);
  watchDateRowReady(el, { MutationObserver: kit.MO });
  assert.equal(el.dataset.ready, "1");
  assert.equal(kit.observers.filter((o) => o.on).length, 0);
});

test("loading until BOTH pickers have mounted, then ready and disconnected", () => {
  const kit = observerKit();
  const el = row(0);
  watchDateRowReady(el, { MutationObserver: kit.MO, timeout: 1000 });
  assert.notEqual(el.dataset.ready, "1"); // no stamp = loading
  el.inputs = 1;
  kit.fire();
  assert.notEqual(el.dataset.ready, "1"); // no stamp = loading
  el.inputs = 2;
  kit.fire();
  assert.equal(el.dataset.ready, "1");
  assert.equal(kit.observers[0].on, false);
});

test("never mounts → released after the timeout (no endless spinner)", async () => {
  const kit = observerKit();
  const el = row(0);
  watchDateRowReady(el, { MutationObserver: kit.MO, timeout: 10 });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(el.dataset.ready, "1");
  assert.equal(kit.observers[0].on, false);
});

test("no element → no-op", () => {
  assert.doesNotThrow(() => watchDateRowReady(null));
});

// onPartReady fires before the row's fields exist: 0 fields / 0 pickers must
// NOT read as ready (it did — and the row was then stuck spinning once render
// wrote the model's data-ready back).
test("fields not rendered yet → not ready, keeps watching until they mount", () => {
  const kit = observerKit();
  const el = row(0, 0);
  watchDateRowReady(el, { MutationObserver: kit.MO, timeout: 1000 });
  assert.notEqual(el.dataset.ready, "1");
  el.wraps = 2;
  kit.fire();
  assert.notEqual(el.dataset.ready, "1");
  el.inputs = 2;
  kit.fire();
  assert.equal(el.dataset.ready, "1");
});
