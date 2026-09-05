// claim() is fire() minus the broadcast: every gate, single-flight taken, and
// the CALLER mounts the tour. It exists so a host that is not the desk can run
// a tour without the desk also mounting one from the same broadcast.
//
// The gates are the point of the module, so each one is pinned separately.
const test = require("node:test");
const assert = require("node:assert/strict");

// The module reads Platform, Visitor, localStorage and RADIO_BROADCAST off the
// global. Install them BEFORE requiring it.
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
let platform = { contextual_tours: 1 };
global.Platform = { get: (k) => platform[k] };
let settings = {};
let mobile = false;
global.Visitor = { id: 42, settings: () => settings, isMobile: () => mobile };
let broadcasts = [];
global.RADIO_BROADCAST = { trigger: (ch, payload) => broadcasts.push([ch, payload]) };

const Tours = require("../src/drumee/libs/tutorial-tours.js");

function reset() {
  Tours.__resetModuleState();
  store.clear();
  platform = { contextual_tours: 1 };
  settings = {};
  mobile = false;
  broadcasts = [];
}

const host = { postService: () => Promise.resolve() };

test("claim: an armed tour is claimed", () => {
  reset();
  assert.equal(Tours.claim("share", host), true);
  assert.equal(Tours.inFlight(), "share");
});

test("claim: does NOT broadcast", () => {
  reset();
  Tours.claim("share", host);
  assert.deepEqual(broadcasts, []);
});

test("claim: the kill switch closes it", () => {
  reset();
  platform = { contextual_tours: 0 };
  assert.equal(Tours.claim("share", host), false);
  assert.equal(Tours.inFlight(), null);
});

test("claim: mobile is excluded", () => {
  reset();
  mobile = true;
  assert.equal(Tours.claim("share", host), false);
});

test("claim: an unknown id is refused", () => {
  reset();
  assert.equal(Tours.claim("not-a-tour", host), false);
  assert.equal(Tours.inFlight(), null);
});

test("claim: a tour already seen server-side is refused", () => {
  reset();
  settings = { tutorials_seen: { share: 1757000000 } };
  assert.equal(Tours.claim("share", host), false);
});

test("claim: single-flight holds against a second claim", () => {
  reset();
  assert.equal(Tours.claim("share", host), true);
  assert.equal(Tours.claim("migrate", host), false);
});

test("claim: release lets the next one through", () => {
  reset();
  Tours.claim("share", host);
  Tours.release("share");
  assert.equal(Tours.inFlight(), null);
  assert.equal(Tours.claim("migrate", host), true);
});

test("fire still broadcasts, and still returns true", () => {
  reset();
  assert.equal(Tours.fire("share", host, { subject: "workspace" }), true);
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0][0], Tours.CHANNEL);
  assert.deepEqual(broadcasts[0][1], {
    tour: "share",
    opt: { subject: "workspace" },
  });
});

test("fire: a gate that closes broadcasts nothing", () => {
  reset();
  platform = { contextual_tours: 0 };
  assert.equal(Tours.fire("share", host), false);
  assert.deepEqual(broadcasts, []);
});

test("fire: a throwing listener releases single-flight", () => {
  reset();
  global.RADIO_BROADCAST = {
    trigger: () => {
      throw new Error("listener blew up");
    },
  };
  assert.equal(Tours.fire("share", host), false);
  assert.equal(Tours.inFlight(), null, "a bad listener must not latch the guard");
  global.RADIO_BROADCAST = { trigger: (ch, p) => broadcasts.push([ch, p]) };
});
