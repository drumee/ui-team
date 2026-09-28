// tasks-scroll-restore.test.js — putting a column's scroll back after a feed.
//
//   node --test tests/tasks-scroll-restore.test.js
//
// Stage evidence (2026-09-23): after a save, the rebuilt column body reported
// scrollHeight == clientHeight == 468 at BOTH restore points (right after
// feed() and on the next frame) — its cards reach full height a few frames
// later — so the browser clamped scrollTop 449.6 to 0 and the column jumped to
// the top. The restore must keep trying until the offset fits.
const test = require("node:test");
const assert = require("node:assert/strict");
const { restoreScroll } = require("../src/drumee/builtins/window/tasks/scroll-restore");

// A scroller that clamps like the browser does.
function scroller({ clientHeight = 468, scrollHeight = 468 } = {}) {
  let top = 0;
  return {
    clientHeight,
    scrollHeight,
    scrollLeft: 0,
    get scrollTop() {
      return top;
    },
    set scrollTop(v) {
      top = Math.max(0, Math.min(v, this.scrollHeight - this.clientHeight));
    },
  };
}

// Manual frame clock.
function frames() {
  let queue = [];
  let t = 0;
  return {
    raf: (fn) => queue.push(fn),
    now: () => t,
    tick(ms = 16) {
      t += ms;
      const run = queue;
      queue = [];
      run.forEach((fn) => fn());
    },
    pending: () => queue.length,
  };
}

test("restores at once when the content is already tall enough", () => {
  const node = scroller({ scrollHeight: 1000 });
  const clock = frames();
  restoreScroll([{ selector: "a", top: 449.6, left: 0 }], {
    find: () => node, raf: clock.raf, now: clock.now,
  });
  assert.equal(node.scrollTop, 449.6);
  assert.equal(clock.pending(), 0);
});

test("keeps trying until the cards reach full height (the stage bug)", () => {
  const node = scroller(); // 468 / 468: not scrollable yet
  const clock = frames();
  restoreScroll([{ selector: "a", top: 449.6, left: 0 }], {
    find: () => node, raf: clock.raf, now: clock.now,
  });
  assert.equal(node.scrollTop, 0);
  clock.tick();
  assert.equal(node.scrollTop, 0); // next frame: still short
  node.scrollHeight = 1000; // cards finished sizing
  clock.tick();
  assert.equal(node.scrollTop, 449.6);
  clock.tick();
  assert.equal(clock.pending(), 0); // done, stops polling
});

test("waits for a column that is not mounted yet", () => {
  let node = null;
  const clock = frames();
  restoreScroll([{ selector: "a", top: 200, left: 0 }], {
    find: () => node, raf: clock.raf, now: clock.now,
  });
  node = scroller({ scrollHeight: 900 });
  clock.tick();
  assert.equal(node.scrollTop, 200);
});

test("gives up after the deadline, left as far down as it goes", () => {
  const node = scroller({ scrollHeight: 600 }); // max 132: 449.6 never fits
  const clock = frames();
  restoreScroll([{ selector: "a", top: 449.6, left: 0 }], {
    find: () => node, raf: clock.raf, now: clock.now, maxMs: 100,
  });
  for (let i = 0; i < 20; i++) clock.tick(16);
  assert.equal(clock.pending(), 0);
  assert.equal(node.scrollTop, 132);
});

test("stops the moment it is cancelled (the user scrolled)", () => {
  const node = scroller();
  const clock = frames();
  let cancelled = false;
  restoreScroll([{ selector: "a", top: 449.6, left: 0 }], {
    find: () => node, raf: clock.raf, now: clock.now, isCancelled: () => cancelled,
  });
  cancelled = true;
  node.scrollHeight = 1000;
  clock.tick();
  assert.equal(node.scrollTop, 0);
  assert.equal(clock.pending(), 0);
});

test("restores every column independently", () => {
  const a = scroller({ scrollHeight: 1000 });
  const b = scroller();
  const clock = frames();
  restoreScroll(
    [
      { selector: "a", top: 300, left: 0 },
      { selector: "b", top: 250, left: 0 },
    ],
    { find: (s) => (s === "a" ? a : b), raf: clock.raf, now: clock.now },
  );
  assert.equal(a.scrollTop, 300);
  b.scrollHeight = 900;
  clock.tick();
  assert.equal(b.scrollTop, 250);
});
