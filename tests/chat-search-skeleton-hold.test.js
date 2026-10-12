// chat-search-skeleton-hold.test.js — the results replace the loading
// skeleton no sooner than SKELETON_MIN_MS after it appeared.
//
//   node --test tests/chat-search-skeleton-hold.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/drumee/builtins/window/folder/search-results-panel");

test("the skeleton is held for 2 seconds", () => {
  assert.equal(P.SKELETON_MIN_MS, 2000);
});

test("a fast reply waits out the rest of the 2 seconds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10_000 });
  const started = Date.now();
  t.mock.timers.tick(300); // reply after 300ms
  let shown = false;
  const p = P.holdSkeleton(started).then(() => (shown = true));
  t.mock.timers.tick(1699);
  await Promise.resolve();
  assert.equal(shown, false, "still on the skeleton at 1999ms");
  t.mock.timers.tick(1);
  await p;
  assert.equal(shown, true);
});

test("a slow reply shows at once", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10_000 });
  const started = Date.now();
  t.mock.timers.tick(2500);
  let shown = false;
  P.holdSkeleton(started).then(() => (shown = true));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(shown, true);
});
