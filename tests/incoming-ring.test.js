// incoming-ring.test.js — the ring on an incoming-meeting prompt: plays while
// the prompt is up, stops when it closes or after a cap, and never cuts off a
// sound something else started in the meantime.
//
//   node --test tests/incoming-ring.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { ringWhileOpen, RING_MAX_MS } = require(path.join(
  __dirname, "..", "src/drumee/modules/desk/wm/incoming-ring.js"
));

function harness() {
  const s = { playing: null, plays: [], mutes: 0, gone: null, timers: [] };
  s.audio = {
    play: (url, loop) => { s.playing = url; s.plays.push([url, loop]); },
    mute: () => { s.mutes++; s.playing = null; },
    current: () => s.playing,
  };
  s.view = { once: (ev, fn) => { assert.equal(ev, "destroy"); s.gone = fn; } };
  s.timer = {
    setTimer: (f, ms) => { const h = { f, ms }; s.timers.push(h); return h; },
    clearTimer: (h) => { s.timers = s.timers.filter((x) => x !== h); },
  };
  return s;
}

test("rings in a loop while the prompt is open", () => {
  const s = harness();
  ringWhileOpen(s.view, "musics/ringtones/ringtone.mp3", { ...s.audio, ...s.timer });
  assert.deepEqual(s.plays, [["musics/ringtones/ringtone.mp3", 1]]);
});

test("closing the prompt (accept / decline / close) stops it", () => {
  const s = harness();
  ringWhileOpen(s.view, "r.mp3", { ...s.audio, ...s.timer });
  s.gone();
  assert.equal(s.mutes, 1);
  assert.equal(s.timers.length, 0);
});

test("an ignored prompt stops ringing after the cap", () => {
  const s = harness();
  ringWhileOpen(s.view, "r.mp3", { ...s.audio, ...s.timer });
  assert.equal(s.timers[0].ms, RING_MAX_MS);
  s.timers[0].f();
  assert.equal(s.mutes, 1);
  s.gone(); // closing later does not mute again
  assert.equal(s.mutes, 1);
});

test("never mutes a sound something else started meanwhile", () => {
  const s = harness();
  ringWhileOpen(s.view, "r.mp3", { ...s.audio, ...s.timer });
  s.playing = "musics/dialtones/ring-back.mp3"; // e.g. the user placed a call
  s.gone();
  assert.equal(s.mutes, 0);
});

test("the call ringtone points at the new asset", () => {
  global.navigator = global.navigator || { userAgent: "node" };
  const K = require(path.join(__dirname, "..", "src/drumee/lex/constants.js"));
  const k = K.default || K;
  assert.equal(k.ringtones.call, "musics/ringtones/ringtone.mp3");
});
