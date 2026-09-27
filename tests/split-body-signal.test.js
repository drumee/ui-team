// split-body-signal.test.js — waiting for the workspace split body.
//
//   node --test tests/split-body-signal.test.js
//
// The screen restore must not open a screen until the pane's split body is
// on screen. Flag first, event second: a broadcast that already fired cannot
// be missed, and a pane that never paints resolves false instead of hanging.
const test = require("node:test");
const assert = require("node:assert/strict");
const { EVENT, whenSplitBodyShown } = require("../src/drumee/libs/split-body-signal");

function bus() {
  const handlers = new Map();
  return {
    on(e, f) {
      if (!handlers.has(e)) handlers.set(e, new Set());
      handlers.get(e).add(f);
    },
    off(e, f) {
      if (handlers.has(e)) handlers.get(e).delete(f);
    },
    trigger(e, ...args) {
      for (const f of [...(handlers.get(e) || [])]) f(...args);
    },
    count(e) {
      return handlers.has(e) ? handlers.get(e).size : 0;
    },
  };
}

test("the event name is the one window_folder broadcasts", () => {
  assert.equal(EVENT, "workspace:split-body-shown");
});

test("already shown: resolves true at once, without listening", async () => {
  const b = bus();
  const pane = { _splitBodyShown: 1 };
  assert.equal(await whenSplitBodyShown({ getPane: () => pane, bus: b, timeout: 50 }), true);
  assert.equal(b.count(EVENT), 0);
});

test("not yet shown: resolves true on the event and stops listening", async () => {
  const b = bus();
  const waiting = whenSplitBodyShown({ getPane: () => null, bus: b, timeout: 1000 });
  assert.equal(b.count(EVENT), 1);
  b.trigger(EVENT, { _splitBodyShown: 1 });
  assert.equal(await waiting, true);
  assert.equal(b.count(EVENT), 0);
});

test("never shown: resolves false on timeout and stops listening", async () => {
  const b = bus();
  assert.equal(await whenSplitBodyShown({ getPane: () => null, bus: b, timeout: 20 }), false);
  assert.equal(b.count(EVENT), 0);
});

test("a destroyed pane's flag does not count", async () => {
  const b = bus();
  const dead = { _splitBodyShown: 1, isDestroyed: () => true };
  assert.equal(await whenSplitBodyShown({ getPane: () => dead, bus: b, timeout: 20 }), false);
});

test("a throwing getPane is treated as no pane", async () => {
  const b = bus();
  const getPane = () => {
    throw new Error("Wm not ready");
  };
  const waiting = whenSplitBodyShown({ getPane, bus: b, timeout: 1000 });
  b.trigger(EVENT, {});
  assert.equal(await waiting, true);
});

test("an event after the timeout changes nothing", async () => {
  const b = bus();
  const result = await whenSplitBodyShown({ getPane: () => null, bus: b, timeout: 10 });
  b.trigger(EVENT, {});
  assert.equal(result, false);
});
