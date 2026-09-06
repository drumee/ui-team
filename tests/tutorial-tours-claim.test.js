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

// ── the migrate tour's "is the user done with it" contract ───────────────────
//
// The rail's Files button offers this tour on every press, and asks nothing
// itself about whether the user has finished with it — claim() is the whole
// answer (see _maybeShowFilesTour in modules/desk/index.js). What makes that
// safe is that the tour is `mark_on: "success"`: its flag is written only when
// the user creates a folder, uploads files, or walks every step to the last
// Done. These pin both halves of that.

test("migrate: offered again while the user has not finished with it", () => {
  reset();
  // Nothing recorded — the state after opening the tour and doing nothing,
  // which is exactly what mark_on:"success" leaves behind.
  assert.equal(Tours.claim("migrate", host), true);
  Tours.release("migrate");
  assert.equal(Tours.claim("migrate", host), true, "and again, and again");
  // Released, not left standing: a claim arms a 30s guard timer, and an
  // un-released one at the end of the file keeps the runner waiting it out.
  Tours.release("migrate");
});

test("migrate: not offered once it has been completed", () => {
  reset();
  // Whichever of the three completions ran, they all end in the same write.
  Tours.markSeen("migrate", host);
  assert.equal(Tours.claim("migrate", host), false);
});

test("migrate: markSeen writes only the tour it is given", () => {
  reset();
  Tours.markSeen("migrate", host);
  // A completed migrate must not burn the tours the user has not met.
  assert.equal(Tours.claim("share", host), true);
  Tours.release("share");
});

// ── the chat tour follows the same rule ──────────────────────────────────────
//
// Recorded on completion rather than on sight, so the rail's Chat button keeps
// offering it until the user reaches the last Done. Five screens about threads
// is more than a glance, and marking it on mount spends the one chance it gets.

test("chat: offered again while the user has not finished it", () => {
  reset();
  assert.equal(Tours.claim("chat", host), true);
  Tours.release("chat");
  assert.equal(Tours.claim("chat", host), true);
  Tours.release("chat");
});

test("chat: not offered once it has been completed", () => {
  reset();
  Tours.markSeen("chat", host);
  assert.equal(Tours.claim("chat", host), false);
});

// The rail can end one tour and raise another in a single gesture — Chat
// pressed during the migrate tour. The claim is not free until the outgoing
// tour is RELEASED, which is what _whenToursIdle waits for; without it the
// incoming tour meets `if (_inFlight) return false` and is refused in silence.
test("a second tour is refused until the first releases", () => {
  reset();
  assert.equal(Tours.claim("migrate", host), true);
  assert.equal(Tours.claim("chat", host), false, "refused while migrate is in flight");
  let settled = false;
  Tours.whenDone("migrate", () => { settled = true; });
  assert.equal(settled, false, "and the continuation waits");
  Tours.release("migrate");
  assert.equal(settled, true, "released, so the waiter runs");
  assert.equal(Tours.claim("chat", host), true);
  Tours.release("chat");
});
