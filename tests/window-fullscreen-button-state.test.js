// window-fullscreen-button-state.test.js — the call window's expand button
// mirrors whether the window is fullscreen, however fullscreen was left.
//
//   node --test tests/window-fullscreen-button-state.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const mixin = require(path.join(__dirname, "..", "src/drumee/builtins/webrtc/window-fullscreen.js"));

function host() {
  const btn = { state: 0, setState(s) { this.state = s; } };
  const el = {
    dataset: {},
    onfullscreenchange: null,
    requestFullscreen() { global.document.fullscreenElement = el; el.onfullscreenchange(); return Promise.resolve(); },
  };
  global.document = { fullscreenElement: null, exitFullscreen() { this.fullscreenElement = null; el.onfullscreenchange && el.onfullscreenchange(); return Promise.resolve(); } };
  global.window = { innerWidth: 1440, innerHeight: 800 };
  const sizes = [];
  const self = Object.assign({}, mixin, {
    el,
    sizes,
    $el: { width: () => 640, height: () => 520, position: () => ({ left: 10, top: 20 }) },
    getPart: (pn) => (pn === "call-expand" ? btn : null),
    isDestroyed: () => false,
    change_size_to: (g, cb) => { sizes.push({ ...g }); cb && cb(); },
  });
  return { self, btn, el };
}

test("entering fullscreen lights the button and stamps the root", async () => {
  const { self, btn, el } = host();
  self._toggleWindowFullscreen();
  await Promise.resolve();
  assert.equal(btn.state, 1);
  assert.equal(el.dataset.fullscreen, "1");
});

test("exit by Esc resets the button", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { self, btn, el } = host();
  self._toggleWindowFullscreen();
  await Promise.resolve();
  // Esc: the UA drops fullscreen without going through our toggle.
  global.document.fullscreenElement = null;
  el.onfullscreenchange();
  assert.equal(btn.state, 0);
  assert.equal(el.dataset.fullscreen, "0");
});

test("a request the browser refuses leaves the button off", async () => {
  const { self, btn, el } = host();
  el.requestFullscreen = () => Promise.reject(new Error("denied"));
  self._toggleWindowFullscreen();
  await new Promise((r) => setImmediate(r));
  assert.equal(btn.state, 0);
  assert.equal(el.dataset.fullscreen, "0");
});

test("entered then dropped at once (Chrome, transformed ancestor) maximises in-window", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { self, btn, el } = host();
  self._workAreaBox = () => ({ width: 1200, height: 700 });
  el.requestFullscreen = () => {
    global.document.fullscreenElement = el;
    el.onfullscreenchange();
    global.document.fullscreenElement = null;
    el.onfullscreenchange();
    return Promise.resolve();
  };
  self._toggleWindowFullscreen();
  t.mock.timers.tick(400);
  assert.equal(btn.state, 1);
  assert.deepEqual(self.sizes.at(-1), { left: 0, top: 0, width: 1200, height: 700 });
});

test("a host without a work area (the meeting) never falls back", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { self, btn, el } = host();
  el.requestFullscreen = () => Promise.resolve();
  self._toggleWindowFullscreen();
  t.mock.timers.tick(400);
  assert.equal(btn.state, 0);
  assert.equal(self.sizes.length, 0);
});

test("a dropped request maximises in-window and lights the button", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { self, btn, el } = host();
  self._workAreaBox = () => ({ width: 1200, height: 700 });
  // Chrome enters and instantly drops: the request resolves, nothing is
  // fullscreen and no change event arrives.
  el.requestFullscreen = () => Promise.resolve();
  self._toggleWindowFullscreen();
  t.mock.timers.tick(300);
  assert.equal(btn.state, 1);
  assert.deepEqual(self.sizes.at(-1), { left: 0, top: 0, width: 1200, height: 700 });
  // The same button puts the window back.
  self._toggleWindowFullscreen();
  assert.equal(btn.state, 0);
  assert.deepEqual(self.sizes.at(-1), { width: 640, height: 520, left: 10, top: 20 });
});
