// Lifecycle of the daily-reminder widget's animation handle, against stub
// LetcBox / rAF / motion. The widget is real; everything around it is not.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const WIDGET = path.join(__dirname, "..", "src/drumee/builtins/widget/daily-reminder-popup");

// Webpack-only requests the widget makes: its scss skin and the libs alias.
const STUBS = {
  "./skin": {},
  "./skeleton": () => ({}),
  "libs/wm-popup": { closeWmPopup: (view) => { view.closed = true; } },
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
  return load.call(this, request, parent, isMain);
};

// motion.play stub: every handle it hands out is recorded.
const handles = [];
const motionPath = require.resolve(path.join(WIDGET, "motion.js"));
require.cache[motionPath] = {
  id: motionPath, filename: motionPath, loaded: true,
  exports: {
    play() {
      const h = { started: true, killed: false, kill() { h.killed = true; } };
      handles.push(h);
      return h;
    },
  },
};

let frames = [];
global.requestAnimationFrame = (fn) => frames.push(fn);
const flush = () => { const f = frames; frames = []; f.forEach((fn) => fn()); };

global.document = { body: { appendChild() {} } };
global.LetcBox = class {
  constructor(opt = {}) { this._opt = opt; this.el = { parentElement: global.document.body }; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._opt[k]; }
  feed() {}
  isDestroyed() { return false; }
};

const Popup = require(WIDGET);

function widget() {
  handles.length = 0;
  frames = [];
  const w = new Popup({});
  w.initialize({});
  return w;
}
const alive = () => handles.filter((h) => !h.killed);

test("a second onDomRefresh leaves exactly one live animation", () => {
  const w = widget();
  w.onDomRefresh();
  flush();
  w.onDomRefresh();
  flush();
  assert.equal(alive().length, 1, `live handles: ${alive().length}`);
});

test("two refreshes inside one frame still leave exactly one", () => {
  const w = widget();
  w.onDomRefresh();
  w.onDomRefresh();
  flush();
  assert.equal(alive().length, 1, `live handles: ${alive().length}`);
});

test("destroy kills the live animation", () => {
  const w = widget();
  w.onDomRefresh();
  flush();
  w.onBeforeDestroy();
  assert.equal(alive().length, 0);
});
