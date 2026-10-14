// The spotlight's phone path: render hidden, measure, place with phoneAnchor.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");
const fed = [];
const STUBS = {
  "./skin": {},
  "../skeleton/toolkit": { tooltipBubble: (owner, opt) => ({ owner, ...opt }) },
};
const load = Module._load;
Module._load = function (r, p, m) {
  return Object.prototype.hasOwnProperty.call(STUBS, r) ? STUBS[r] : load.call(this, r, p, m);
};
global.LetcBox = class {
  constructor(m = {}) { this._m = { ...m }; }
  initialize() {}
  declareHandlers() {}
  mget(k) { return this._m[k]; }
};
global.requestAnimationFrame = (cb) => cb();
const Spotlight = require(path.join(SRC, "modules/desk/tutorial/spotlight/index.js"));

test.after(() => {
  Module._load = load;
  for (const k of ["LetcBox", "requestAnimationFrame"]) delete global[k];
});

function cardEl(height) {
  const props = {};
  return {
    isConnected: true,
    dataset: {},
    style: { setProperty: (k, v) => { props[k] = v; } },
    props,
    getBoundingClientRect: () => ({ left: 16, top: 0, width: 358, height, right: 374, bottom: height }),
  };
}

function make({ layout = "phone" } = {}) {
  const s = new Spotlight({});
  s.initialize({});
  const root = { dataset: { layout } };
  s.el = {
    closest: (sel) => (sel === ".tutorial-main" ? root : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }),
  };
  return s;
}

test("_phone reads the host root's data-layout", () => {
  assert.equal(make({ layout: "phone" })._phone(), true);
  assert.equal(make({ layout: "desk" })._phone(), false);
});

test("_placeOnPhone: hidden render, then phoneAnchor placement + --beak-px", async () => {
  const s = make();
  const card = cardEl(180);
  const callout = {
    feed: (x) => fed.push(x),
    el: { querySelector: () => card },
  };
  const target = { left: 16, top: 200, width: 358, height: 48, right: 374, bottom: 248 };
  const ticket = ++s._seq;
  await s._placeOnPhone(callout, null, { title: "T" }, target, ticket);
  assert.equal(fed.at(-1).style.visibility, "hidden");
  assert.equal(card.style.top, "262px");
  assert.equal(card.style.left, "16px");
  assert.equal(card.style.width, "358px");
  assert.equal(card.style.bottom, "auto");
  assert.equal(card.style.transform, "none");
  assert.equal(card.dataset.direction, "north");
  assert.equal(card.props["--beak-px"], "179px");
  assert.equal(card.style.visibility, "");
});

test("_placeOnPhone: a newer focus wins (stale ticket leaves the card hidden)", async () => {
  const s = make();
  const card = cardEl(180);
  const callout = { feed() {}, el: { querySelector: () => card } };
  const ticket = ++s._seq;
  s._seq++; // a newer focus/clear arrived
  await s._placeOnPhone(callout, null, { title: "T" }, { left: 0, top: 0, width: 10, height: 10, right: 10, bottom: 10 }, ticket);
  assert.equal(card.dataset.direction, undefined);
});
