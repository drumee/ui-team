#!/usr/bin/env node

/**
 * Contextual sub-tours — seen-set, single-flight guard and reconciliation.
 *
 * libs/tutorial-tours.js requires nothing from the app: it reads injected
 * globals only, so it loads directly under node with those globals stubbed.
 *
 * Run from ui-team with:
 *   node --test tests/tutorial-tours-seen-set.test.js
 *
 * Covers plan §8 tests 43a, 43b, 44, 46, 47 and the D9 mobile gate.
 */

const test = require("node:test");
const { after } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");

const MODULE_PATH = join(
  __dirname,
  "..",
  "src/drumee/libs/tutorial-tours.js",
);

// ── stubs ────────────────────────────────────────────────────────────────────

let posts = [];
let broadcasts = [];
let store = {};

function stubGlobals({ settings = {}, noSettings = false, enabled = 1, mobile = false, postFails = false,
  visitorId = "u_test", keepStore = false } = {}) {
  posts = [];
  broadcasts = [];
  // keepStore models ONE browser across a logout/login: localStorage survives,
  // Visitor.id does not. Without it there is no way to test what the mirror
  // does to the next account signed in on the same machine.
  if (!keepStore) store = {};

  global.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };

  global.Platform = { get: (k) => (k === "contextual_tours" ? enabled : undefined) };

  global.Visitor = {
    id: visitorId,
    isMobile: () => mobile,
    settings: () => (noSettings ? undefined : settings),
  };

  global.RADIO_BROADCAST = {
    trigger: (channel, payload) => broadcasts.push({ channel, payload }),
  };

  global.SERVICE = { drumate: { tutorial_seen: "drumate.tutorial_seen" } };

  const host = {
    postService: (svc, payload) => {
      posts.push({ svc, payload });
      return postFails
        ? Promise.reject(new Error("offline"))
        : Promise.resolve({ tutorials_seen: {} });
    },
  };
  global.window = { Wm: host };
  return host;
}

// Loaded ONCE. Re-requiring per test used to leak a real 30s guard timer: the
// fresh instance's __resetModuleState() cannot clear a timer armed by the
// previous instance, so node held the event loop open until it expired. The
// module reads every global at call time and holds no import-time state, so one
// instance plus a state reset is equivalent and 30s faster.
const Tours = require(MODULE_PATH);

function load() {
  Tours.__resetModuleState();
  return Tours;
}

// A test that fires without releasing leaves a real 30s guard timer pending,
// which holds the event loop open long after the last assertion. Reset once at
// the end so the suite exits when it is done, whatever order the cases run in.
after(() => Tours.__resetModuleState());

function fresh(opts) {
  const host = stubGlobals(opts);
  return { Tours: load(), host };
}

/** The mirror is per-account, so every assertion on it needs the account. */
const mirrorKeyFor = (id) => `drumee.tutorials_seen:${id}`;
const MIRROR = mirrorKeyFor("u_test");

// ── test 47 — the defect that would have shipped a feature that never fires ──

test("47 a brand-new account has an ABSENT map and every tour is armed", () => {
  // No settings write has ever happened for this user, so `tutorials_seen`
  // does not exist. Treating that as "all seen" suppressed every tour for
  // every new user — the exact population the feature targets.
  const { Tours, host } = fresh({ settings: {} });

  const state = Tours.serverState();
  assert.equal(state.degraded, false);
  assert.equal(state.all, false);
  assert.deepEqual(state.map, {});

  for (const id of Tours.TOUR_IDS) {
    assert.equal(Tours.isSeen(id, host), false, `${id} must be armed`);
  }
  assert.equal(Tours.fire("migrate", host), true);
  assert.equal(broadcasts.length, 1);
  assert.deepEqual(broadcasts[0], {
    channel: "tutorial:trigger",
    payload: { tour: "migrate" },
  });
  Tours.release("migrate");
});

test("47 an empty settings object is still a new user, not a failure", () => {
  const { Tours, host } = fresh({ settings: { email_notifications: 1 } });
  assert.equal(Tours.isSeen("folder_task", host), false);
});

test("47 a missing settings payload fails closed and writes nothing", () => {
  const { Tours, host } = fresh({ noSettings: true });
  assert.equal(Tours.serverState().degraded, true);
  assert.equal(Tours.isSeen("migrate", host), true);
  assert.equal(Tours.fire("migrate", host), false);
  assert.equal(broadcasts.length, 0);

  // A degraded payload must suppress the WRITE too — never record a tour
  // against a user whose settings could not be read.
  Tours.markSeen("migrate", host);
  assert.equal(posts.length, 0);
  assert.equal(store[MIRROR], undefined);
});

test("47 a non-object tutorials_seen is corrupt and fails closed", () => {
  const { Tours, host } = fresh({ settings: { tutorials_seen: "nope" } });
  assert.equal(Tours.serverState().degraded, true);
  assert.equal(Tours.isSeen("folder_task", host), true);

  const arr = fresh({ settings: { tutorials_seen: ["folder"] } });
  assert.equal(arr.Tours.serverState().degraded, true);
});

test("a recorded tour is seen; its siblings are not", () => {
  const { Tours, host } = fresh({ settings: { tutorials_seen: { migrate: 1787000000 } } });
  assert.equal(Tours.isSeen("migrate", host), true);
  assert.equal(Tours.isSeen("folder_task", host), false);
  assert.equal(Tours.fire("migrate", host), false);
  assert.equal(Tours.fire("folder_task", host), true);
  Tours.release("folder_task");
});

test("a legacy tutorial_done user has seen everything (S7 inference)", () => {
  const { Tours, host } = fresh({ settings: { tutorial_done: true } });
  const state = Tours.serverState();
  assert.equal(state.all, true);
  assert.equal(state.degraded, false);
  for (const id of Tours.TOUR_IDS) assert.equal(Tours.isSeen(id, host), true);
});

// ── kill switch and mobile gate ──────────────────────────────────────────────

test("kill switch off: nothing fires and nothing is posted", () => {
  const { Tours, host } = fresh({ settings: {}, enabled: 0 });
  assert.equal(Tours.enabled(), false);
  assert.equal(Tours.fire("migrate", host), false);
  assert.equal(broadcasts.length, 0);
  assert.equal(posts.length, 0);
});

test("29 kill switch off: markSeen writes nothing either, not even from full", () => {
  // The full tour's exit records every flagged tour. That is the one path that
  // would post while the switch is off, and "off is today's behaviour" has to
  // include the network.
  const { Tours, host } = fresh({ settings: {}, enabled: 0 });
  for (const id of Tours.TOUR_IDS) Tours.markSeen(id, host);
  assert.equal(posts.length, 0);
  assert.equal(store[MIRROR], undefined);
});

test("D9 mobile: no tour fires AND no flag is written", () => {
  const { Tours, host } = fresh({ settings: {}, mobile: true });
  assert.equal(Tours.fire("migrate", host), false);
  assert.equal(broadcasts.length, 0);
  // Not writing is the point: the same account gets the tour on its first
  // desktop session.
  assert.equal(posts.length, 0);
  assert.equal(Tours.isSeen("migrate", host), false);
});

test("an unknown tour id never fires or records", () => {
  const { Tours, host } = fresh({ settings: {} });
  // A plausible-looking id that is NOT in the registry — the shape a typo or a
  // half-finished rename takes.
  assert.equal(Tours.fire("folder", host), false);
  Tours.markSeen("folder", host);
  assert.equal(posts.length, 0);
  assert.equal(Tours.fire("tasks", host), false);
});

// ── single-flight and the guard timer ────────────────────────────────────────

test("single-flight: a second trigger is refused while one is in flight", () => {
  const { Tours, host } = fresh({ settings: {} });
  assert.equal(Tours.fire("migrate", host), true);
  assert.equal(Tours.fire("folder_task", host), false);
  assert.equal(broadcasts.length, 1);
  assert.equal(Tours.inFlight(), "migrate");
  Tours.release("migrate");
});

test("43a a tour whose chunk never arrives releases the guard on timeout", (t) => {
  // fresh() first: __resetModuleState clears any REAL guard timer left armed
  // by the previous test. Enabling the mock first would hand that real id to
  // the mocked clearTimeout, which silently drops it — and the suite then sits
  // for the timer's full 30s after the last assertion.
  const { Tours, host } = fresh({ settings: {} });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  assert.equal(Tours.fire("migrate", host), true);
  // The tour never mounts, so armed() is never called and destroy never fires.
  t.mock.timers.tick(Tours.GUARD_TIMEOUT_MS + 20);
  assert.equal(Tours.inFlight(), null, "guard must not wedge the session");
  assert.equal(Tours.fire("folder_task", host), true, "a different tour can still run");
  // Release before the mock clock is torn down: a timer armed under mock
  // timers and left pending is re-armed for real when they are restored, and
  // holds the runner's event loop open for its full 30s.
  Tours.release("folder_task");
});

test("43b a mounted tour holds the guard past GUARD_TIMEOUT_MS", (t) => {
  // fresh() first: __resetModuleState clears any REAL guard timer left armed
  // by the previous test. Enabling the mock first would hand that real id to
  // the mocked clearTimeout, which silently drops it — and the suite then sits
  // for the timer's full 30s after the last assertion.
  const { Tours, host } = fresh({ settings: {} });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  assert.equal(Tours.fire("migrate", host), true);
  Tours.armed(); // tutorial_main.onDomRefresh — the tour is on screen
  // A user reading three screens comfortably outlasts the fetch bound. If the
  // timer were still running it would null _inFlight here and a second tour
  // could mount on top of the one being read.
  t.mock.timers.tick(Tours.GUARD_TIMEOUT_MS + 20);
  assert.equal(Tours.inFlight(), "migrate");
  assert.equal(Tours.fire("folder_task", host), false);
  Tours.release("migrate");
  assert.equal(Tours.inFlight(), null);
});

test("release is id-checked so a stale destroy cannot clear a newer guard", () => {
  const { Tours, host } = fresh({ settings: {} });
  Tours.fire("migrate", host);
  Tours.armed();
  Tours.release("folder_task"); // late destroy from an earlier, different tour
  assert.equal(Tours.inFlight(), "migrate");
  Tours.release("migrate");
  assert.equal(Tours.inFlight(), null);
});

// ── test 44 — fire() must not touch the seen-set ─────────────────────────────

test("44 a tour that fires but never mounts is NOT marked seen", (t) => {
  // fresh() first: __resetModuleState clears any REAL guard timer left armed
  // by the previous test. Enabling the mock first would hand that real id to
  // the mocked clearTimeout, which silently drops it — and the suite then sits
  // for the timer's full 30s after the last assertion.
  const { Tours, host } = fresh({ settings: {} });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  assert.equal(Tours.fire("migrate", host), true);
  // fire() broadcasts and nothing else: no POST, no mirror entry.
  assert.equal(posts.length, 0);
  assert.equal(store[MIRROR], undefined);

  t.mock.timers.tick(Tours.GUARD_TIMEOUT_MS + 20);
  assert.equal(Tours.isSeen("migrate", host), false, "must fire again next click");
  assert.equal(Tours.fire("migrate", host), true);
  Tours.release("migrate");
});

test("markSeen writes the mirror synchronously, then posts", () => {
  const { Tours, host } = fresh({ settings: {} });
  Tours.markSeen("migrate", host);
  assert.deepEqual(JSON.parse(store[MIRROR]), ["migrate"]);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].svc, "drumate.tutorial_seen");
  assert.equal(posts[0].payload.tour_id, "migrate");
  assert.equal(Tours.isSeen("migrate", host), true);

  // Idempotent in-session: a second call posts nothing further.
  Tours.markSeen("migrate", host);
  assert.equal(posts.length, 1);

  // And the lazy reconcile, running afterwards, must not re-post it: the boot
  // payload predates our own write, so the id is legitimately absent from the
  // server map it read.
  Tours.isSeen("folder_task", host);
  assert.equal(posts.length, 1, "reconcile must skip ids posted this session");
});

// ── test 46 — offline write, then reconciliation ─────────────────────────────

test("46 offline: the mirror suppresses the tour on this device", async () => {
  const { Tours, host } = fresh({ settings: {}, postFails: true });
  Tours.markSeen("migrate", host);
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(JSON.parse(store[MIRROR]), ["migrate"]);
  assert.equal(Tours.isSeen("migrate", host), true);
  assert.equal(Tours.fire("migrate", host), false);
});

test("46 next boot, still missing server-side: reconcile re-posts once", () => {
  // Same device, new session: the mirror survived, the server map did not.
  const host = stubGlobals({ settings: {} });
  store[MIRROR] = JSON.stringify(["migrate"]);
  load();

  Tours.isSeen("folder_task", host); // any entry point triggers the lazy reconcile
  assert.equal(posts.length, 1);
  assert.equal(posts[0].payload.tour_id, "migrate");
  assert.deepEqual(JSON.parse(store[MIRROR]), ["migrate"]);

  // Once per session only.
  Tours.isSeen("share", host);
  assert.equal(posts.length, 1);
});

test("46 once the server map carries it, reconcile prunes and posts nothing", () => {
  const host = stubGlobals({ settings: { tutorials_seen: { migrate: 1787000000 } } });
  store[MIRROR] = JSON.stringify(["migrate"]);
  load();

  Tours.isSeen("folder_task", host);
  assert.equal(posts.length, 0, "no re-POST once the write has landed");
  assert.deepEqual(JSON.parse(store[MIRROR]), []);
});

test("46 a degraded payload never re-posts from the mirror", () => {
  const host = stubGlobals({ noSettings: true });
  store[MIRROR] = JSON.stringify(["migrate"]);
  load();
  Tours.isSeen("folder_task", host);
  assert.equal(posts.length, 0);
});

// ── QA reset ─────────────────────────────────────────────────────────────────

test("reset clears the mirror and posts the reset flag", async () => {
  const { Tours, host } = fresh({ settings: {} });
  Tours.markSeen("migrate", host);
  posts.length = 0;
  await Tours.reset(host);
  assert.deepEqual(JSON.parse(store[MIRROR]), []);
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].payload, { reset: 1 });
});


// ── the mirror belongs to an account, not to a browser ───────────────────────
//
// Stage, 2026-08-19: three accounts signed up in one browser. The first ran its
// tours genuinely (timestamps 12-20s apart). The next two were stamped with all
// four tours in a single instant ~50s after signup, and one of them had no
// `tutorial_done` at all — it had never completed a tour. The mirror was a
// single browser-wide key, so it leaked the first account's seen-set into the
// two that followed.

test("a previous account's mirror does not suppress the next account's tour", () => {
  const a = fresh({ settings: {}, visitorId: "u_first" });
  a.Tours.markSeen("workspace", a.host);
  assert.deepEqual(JSON.parse(store[mirrorKeyFor("u_first")]), ["workspace"]);

  // Same browser — localStorage survives — but a different account signs in.
  const b = fresh({ settings: {}, visitorId: "u_second", keepStore: true });
  assert.equal(
    b.Tours.isSeen("workspace", b.host), false,
    "the tour must still be armed for an account that has never seen it",
  );
  assert.equal(b.Tours.fire("workspace", b.host), true, "and it must actually fire");
  b.Tours.release("workspace");
});

test("reconcile never attributes another account's tours to this one", () => {
  // The second half of the defect: having read the leaked ids as "missing from
  // this user's server map", reconcile posted every one of them — writing four
  // tours the user was never shown into their record.
  const a = fresh({ settings: {}, visitorId: "u_first" });
  for (const id of a.Tours.TOUR_IDS) a.Tours.markSeen(id, a.host);

  const b = fresh({ settings: {}, visitorId: "u_second", keepStore: true });
  b.Tours.reconcile(b.host);
  assert.deepEqual(posts, [], "no write may be attributed to the new account");
});

test("the same account keeps its mirror across a reload", () => {
  // The scoping must not break what the mirror is FOR: one device remembering
  // a tour whose server write failed.
  const a = fresh({ settings: {}, visitorId: "u_same", postFails: true });
  a.Tours.markSeen("share", a.host);

  const b = fresh({ settings: {}, visitorId: "u_same", keepStore: true });
  assert.equal(b.Tours.isSeen("share", b.host), true, "still suppressed on this device");
});

test("two accounts' mirrors coexist rather than overwrite each other", () => {
  const a = fresh({ settings: {}, visitorId: "u_a" });
  a.Tours.markSeen("workspace", a.host);
  const b = fresh({ settings: {}, visitorId: "u_b", keepStore: true });
  b.Tours.markSeen("migrate", b.host);

  assert.deepEqual(JSON.parse(store[mirrorKeyFor("u_a")]), ["workspace"]);
  assert.deepEqual(JSON.parse(store[mirrorKeyFor("u_b")]), ["migrate"]);
});

test("with no account identified the mirror is inert, never a shared bucket", () => {
  // Pre-auth there is nobody to attribute a record to. Falling back to one
  // fixed key would reintroduce exactly the leak this fixes, in miniature.
  const a = fresh({ settings: {}, visitorId: null });
  a.Tours.markSeen("workspace", a.host);
  assert.deepEqual(
    Object.keys(store).filter((k) => k.startsWith("drumee.tutorials_seen")), [],
    "nothing may be written without an account to write it against",
  );
});
