// video-type-settle.test.js — show a remote camera immediately; if the track
// turns out to be a screen share, take it back off the tile.
//
//   node --test tests/video-type-settle.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { settleVideoType } = require(path.join(
  __dirname, "..", "src/drumee/builtins/webrtc/video-type-settle.js"
));

function track(type) {
  const l = {};
  return {
    type,
    getVideoType() { return this.type; },
    addEventListener: (e, f) => ((l[e] = l[e] || []).push(f)),
    removeEventListener: (e, f) => (l[e] = (l[e] || []).filter((x) => x !== f)),
    fire: (e) => (l[e] || []).slice().forEach((f) => f()),
    count: () => Object.values(l).reduce((n, a) => n + a.length, 0),
  };
}
const OPT = { changedEvent: "vt", desktop: "desktop" };

test("a camera is attached at once — no fixed delay", () => {
  const t = track("camera"); let cam = 0;
  settleVideoType(t, { ...OPT, onCamera: () => cam++, onDesktop: () => {} });
  assert.equal(cam, 1);
});

test("a camera that later turns out to be a screen is taken back", () => {
  const t = track("camera"); let desk = 0;
  settleVideoType(t, { ...OPT, onCamera: () => {}, onDesktop: () => desk++ });
  t.type = "desktop"; t.fire("vt");
  assert.equal(desk, 1);
  assert.equal(t.count(), 0);
});

test("an already-desktop track never reaches the camera path", () => {
  const t = track("desktop"); let cam = 0, desk = 0;
  settleVideoType(t, { ...OPT, onCamera: () => cam++, onDesktop: () => desk++ });
  assert.equal(cam, 0);
  assert.equal(desk, 1);
});

test("dispose stops listening", () => {
  const t = track("camera");
  const dispose = settleVideoType(t, { ...OPT, onCamera: () => {}, onDesktop: () => {} });
  dispose();
  assert.equal(t.count(), 0);
});
