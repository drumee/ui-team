// remote-screen-watch.test.js — the viewer's own view of a remote screen share.
//
//   node --test tests/remote-screen-watch.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { watchRemoteScreen, shouldStopForPresenter } = require(path.join(
  __dirname, "..", "src/drumee/builtins/webrtc/remote-screen-watch.js"
));

function fakeTrack() {
  const l = {};
  return {
    addEventListener: (e, f) => ((l[e] = l[e] || []).push(f)),
    removeEventListener: (e, f) => (l[e] = (l[e] || []).filter((x) => x !== f)),
    fire: (e) => (l[e] || []).slice().forEach((f) => f()),
    count: () => Object.values(l).reduce((n, a) => n + a.length, 0),
  };
}
function clock() {
  let t = [];
  return {
    setTimer: (f, ms) => { const h = { f, ms }; t.push(h); return h; },
    clearTimer: (h) => { t = t.filter((x) => x !== h); },
    flush: () => { const run = t; t = []; run.forEach((h) => h.f()); },
  };
}

test("ended clears the view once and drops every listener", () => {
  const tr = fakeTrack(); let ended = 0;
  watchRemoteScreen(tr, { onEnded: () => ended++ });
  tr.fire("ended"); tr.fire("ended");
  assert.equal(ended, 1);
  assert.equal(tr.count(), 0);
});

test("stall never calls onEnded — a static screen must survive", () => {
  const tr = fakeTrack(); const c = clock(); let ended = 0, stalled = 0;
  watchRemoteScreen(tr, { onEnded: () => ended++, onStall: () => stalled++ }, c);
  tr.fire("mute"); c.flush();
  assert.equal(stalled, 1);
  assert.equal(ended, 0);
});

test("unmute inside the grace cancels the stall; after it, reports resume", () => {
  const tr = fakeTrack(); const c = clock(); let stalled = 0, resumed = 0;
  watchRemoteScreen(tr, { onStall: () => stalled++, onResume: () => resumed++ }, c);
  tr.fire("mute"); tr.fire("unmute"); c.flush();
  assert.equal(stalled, 0);
  tr.fire("mute"); c.flush(); tr.fire("unmute");
  assert.equal(stalled, 1);
  assert.equal(resumed, 1);
});

test("dispose removes listeners and pending timers", () => {
  const tr = fakeTrack(); const c = clock(); let stalled = 0;
  const dispose = watchRemoteScreen(tr, { onStall: () => stalled++ }, c);
  tr.fire("mute"); dispose(); c.flush();
  assert.equal(stalled, 0);
  assert.equal(tr.count(), 0);
});

test("a missing track is a no-op", () => {
  assert.equal(typeof watchRemoteScreen(null, {}), "function");
});

test("stop for an old presenter is ignored", () => {
  assert.equal(shouldStopForPresenter("p2", "p1"), false);
  assert.equal(shouldStopForPresenter("p1", "p1"), true);
  assert.equal(shouldStopForPresenter(null, "p1"), true); // stale view, clear it
});
