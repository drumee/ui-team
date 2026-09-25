// screen-restore.test.js — putting the last screen back after a reload.
//
//   node --test tests/screen-restore.test.js
//
// Order: split body shown -> open -> find the widget -> items ready -> (one
// refresh if they never came) -> light the sidebar row. A user who navigates
// during any of it wins, and nothing here may throw into boot.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  restoreScreen,
  pollFor,
  withTimeout,
  TIMED_OUT,
  FAILED,
  TIMEOUTS,
} = require("../src/drumee/libs/screen-restore");

const FAST = { splitBody: 20, widget: 20, items: 20 };
const never = () => new Promise(() => {});

function fakeHost(over = {}) {
  const calls = [];
  const state = { seq: 0, screen: null };
  const host = {
    calls,
    state,
    whenSplitBodyShown: async () => {
      calls.push("split");
      return true;
    },
    navSeq: () => state.seq,
    currentScreen: () => state.screen,
    open: async (service) => {
      calls.push(`open:${service}`);
    },
    awaitWidget: async () => {
      calls.push("widget");
      return { name: "widget" };
    },
    lightRow: (service) => calls.push(`light:${service}`),
    warn: () => calls.push("warn"),
  };
  return Object.assign(host, over(host, state, calls) || {});
}

const entry = (over = {}) => ({
  slot: "trash-panel",
  kind: "panel_trash",
  ready: async () => true,
  refresh: null,
  ...over,
});

const run = (host, e = entry(), service = "toggle-trash") =>
  restoreScreen({ service, entry: e, host, timeouts: FAST });

test("the spec's timeouts", () => {
  assert.deepEqual(TIMEOUTS, { splitBody: 8000, widget: 5000, items: 6000 });
});

test("happy path runs in order and lights the row", async () => {
  const host = fakeHost(() => ({}));
  assert.equal(await run(host), "ready");
  assert.deepEqual(host.calls, ["split", "open:toggle-trash", "widget", "light:toggle-trash"]);
});

test("no registry entry: nothing happens", async () => {
  const host = fakeHost(() => ({}));
  assert.equal(await restoreScreen({ service: "x", entry: null, host, timeouts: FAST }), "no-entry");
  assert.deepEqual(host.calls, []);
});

test("split-body timeout still opens the screen", async () => {
  const host = fakeHost(() => ({ whenSplitBodyShown: async () => false }));
  assert.equal(await run(host), "ready");
  assert.ok(host.calls.includes("warn"));
  assert.ok(host.calls.includes("open:toggle-trash"));
});

test("user navigated during the split-body wait: no open, no row", async () => {
  const host = fakeHost((h, state) => ({
    whenSplitBodyShown: async () => {
      state.seq += 1;
      return true;
    },
  }));
  assert.equal(await run(host), "user-navigated");
  assert.ok(!host.calls.some((c) => c.startsWith("open")));
  assert.ok(!host.calls.some((c) => c.startsWith("light")));
});

test("another screen already up before open: no open (never toggles it closed)", async () => {
  const host = fakeHost((h, state) => {
    state.screen = "toggle-contacts";
  });
  assert.equal(await run(host), "user-navigated");
  assert.ok(!host.calls.some((c) => c.startsWith("open")));
});

test("the restore's own open bumping the counter does not cancel it", async () => {
  const host = fakeHost((h, state, calls) => ({
    open: async (service) => {
      calls.push(`open:${service}`);
      state.seq += 1; // togglePanel -> _navigated
    },
  }));
  assert.equal(await run(host), "ready");
  assert.ok(host.calls.includes("light:toggle-trash"));
});

test("our own screen reporting itself as up is not a navigation", async () => {
  const host = fakeHost((h, state, calls) => ({
    open: async (service) => {
      calls.push(`open:${service}`);
      state.screen = "toggle-trash";
    },
  }));
  assert.equal(await run(host), "ready");
});

test("a different screen came up after open: no refresh, no row", async () => {
  let refreshed = 0;
  const host = fakeHost((h, state, calls) => ({
    open: async (service) => {
      calls.push(`open:${service}`);
      state.screen = "toggle-inbox";
    },
  }));
  const e = entry({ ready: never, refresh: () => (refreshed += 1) });
  assert.equal(await run(host, e), "user-navigated");
  assert.equal(refreshed, 0);
  assert.ok(!host.calls.some((c) => c.startsWith("light")));
});

test("user navigated while items loaded: no row", async () => {
  const host = fakeHost(() => ({}));
  const e = entry({
    ready: async () => {
      host.state.seq += 1;
      return true;
    },
  });
  assert.equal(await run(host, e), "user-navigated");
  assert.ok(!host.calls.some((c) => c.startsWith("light")));
});

test("items-ready timeout -> refresh exactly once, then the row", async () => {
  let refreshed = 0;
  const host = fakeHost(() => ({}));
  const e = entry({ ready: never, refresh: () => (refreshed += 1) });
  assert.equal(await run(host, e), "refreshed");
  assert.equal(refreshed, 1);
  assert.ok(host.calls.includes("light:toggle-trash"));
});

test("items-ready rejecting counts as not ready -> one refresh", async () => {
  let refreshed = 0;
  const host = fakeHost(() => ({}));
  const e = entry({ ready: () => Promise.reject(new Error("boom")), refresh: () => (refreshed += 1) });
  assert.equal(await run(host, e), "refreshed");
  assert.equal(refreshed, 1);
});

test("items-ready timeout with no refresh: warn, still light", async () => {
  const host = fakeHost(() => ({}));
  assert.equal(await run(host, entry({ ready: never, refresh: null })), "not-ready");
  assert.ok(host.calls.includes("warn"));
  assert.ok(host.calls.includes("light:toggle-trash"));
});

test("a throwing refresh is contained", async () => {
  const host = fakeHost(() => ({}));
  const e = entry({
    ready: never,
    refresh: () => {
      throw new Error("refresh blew up");
    },
  });
  assert.equal(await run(host, e), "refreshed");
  assert.ok(host.calls.includes("warn"));
});

test("no ready probe means ready on mount", async () => {
  const host = fakeHost(() => ({}));
  assert.equal(await run(host, entry({ ready: null })), "ready");
});

test("widget never mounts: warn and stop", async () => {
  const host = fakeHost(() => ({ awaitWidget: async () => null }));
  assert.equal(await run(host), "no-widget");
  assert.ok(host.calls.includes("warn"));
  assert.ok(!host.calls.some((c) => c.startsWith("light")));
});

test("open throwing is contained", async () => {
  const host = fakeHost(() => ({
    open: async () => {
      throw new Error("open failed");
    },
  }));
  assert.equal(await run(host), "open-failed");
  assert.ok(host.calls.includes("warn"));
});

test("pollFor resolves once find turns truthy", async () => {
  let n = 0;
  assert.equal(await pollFor(() => (++n >= 3 ? "found" : null), { timeout: 500, interval: 1 }), "found");
});

test("pollFor resolves null on timeout, and survives a throwing find", async () => {
  const find = () => {
    throw new Error("not mounted");
  };
  assert.equal(await pollFor(find, { timeout: 15, interval: 1 }), null);
});

test("withTimeout passes values through, and marks timeouts and failures", async () => {
  assert.equal(await withTimeout(Promise.resolve(7), 50), 7);
  assert.equal(await withTimeout(true, 50), true);
  assert.equal(await withTimeout(never(), 10), TIMED_OUT);
  assert.equal(await withTimeout(Promise.reject(new Error("x")), 50), FAILED);
});

test("a synchronously throwing ready counts as not ready -> one refresh", async () => {
  let refreshed = 0;
  const host = fakeHost(() => ({}));
  const e = entry({ ready: () => { throw new Error("sync"); }, refresh: () => (refreshed += 1) });
  assert.equal(await run(host, e), "refreshed");
  assert.equal(refreshed, 1);
});

test("a throwing host is contained", async () => {
  const host = fakeHost(() => ({ currentScreen: () => { throw new Error("boom"); } }));
  assert.equal(await run(host), "error");
  assert.ok(host.calls.includes("warn"));
});

test("onOpened fires once, after open and before the widget wait", async () => {
  const host = fakeHost((h, state, calls) => ({
    onOpened: () => calls.push("opened"),
  }));
  assert.equal(await run(host), "ready");
  const open = host.calls.indexOf("open:toggle-trash");
  const opened = host.calls.indexOf("opened");
  const widget = host.calls.indexOf("widget");
  assert.ok(open >= 0 && opened > open && widget > opened);
});

test("onOpened is not called when the restore stops before opening", async () => {
  let count = 0;
  const host = fakeHost((h, state) => ({
    whenSplitBodyShown: async () => {
      state.seq += 1;
      return true;
    },
    onOpened: () => (count += 1),
  }));
  assert.equal(await run(host), "user-navigated");
  assert.equal(count, 0);
});

test("a throwing onOpened is contained", async () => {
  const host = fakeHost(() => ({
    onOpened: () => {
      throw new Error("onOpened blew up");
    },
  }));
  assert.equal(await run(host), "ready");
});

test("no pane coming: opens at once, without the split-body warning", async () => {
  const host = fakeHost(() => ({
    whenSplitBodyShown: async () => "no-pane",
  }));
  assert.equal(await run(host), "ready");
  assert.ok(host.calls.includes("open:toggle-trash"));
  assert.ok(!host.calls.includes("warn"));
});

test("our screen re-opened by another caller during the item wait still lights its row", async () => {
  const host = fakeHost(() => ({}));
  const e = entry({
    ready: async () => {
      host.state.seq += 1;
      host.state.screen = "toggle-trash";
      return true;
    },
  });
  assert.equal(await run(host, e), "ready");
  assert.ok(host.calls.includes("light:toggle-trash"));
});
