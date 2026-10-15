// meeting-member-call.test.js — the roster's "Call" button never stays on
// "Call in progress": every ring ends in joined / declined / no answer /
// offline, and every outcome but joined can be called again.
//
//   node --test tests/meeting-member-call.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const {
  MemberCalls, inviteRang, OUTCOME_HOLD_MS, RING_MAX_MS,
} = require(path.join(root, "src/drumee/builtins/window/meeting/member-call.js"));
const ring = require(path.join(root, "src/drumee/modules/desk/wm/incoming-ring.js"));

function harness() {
  const h = { states: new Map(), refreshed: [], timers: [] };
  h.calls = new MemberCalls(h.states, {
    refresh: (k) => h.refreshed.push(k),
    setTimer: (f, ms) => { const t = { f, ms }; h.timers.push(t); return t; },
    clearTimer: (t) => { h.timers = h.timers.filter((x) => x !== t); },
  });
  // Fire the one pending timer, as its delay elapsing would.
  h.tick = () => {
    assert.equal(h.timers.length, 1, "exactly one timer pending");
    const t = h.timers.shift();
    t.f();
    return t.ms;
  };
  return h;
}

test("the caller gives up when the callee's prompt stops ringing", () => {
  assert.equal(RING_MAX_MS, ring.RING_MAX_MS);
});

test("an unanswered ring ends in 'no answer', then a callable row", () => {
  const h = harness();
  assert.equal(h.calls.start(42), true);
  assert.equal(h.states.get("42"), "calling");
  assert.equal(h.calls.canCall(42), false);
  assert.equal(h.tick(), RING_MAX_MS);
  assert.equal(h.states.get("42"), "no_answer");
  assert.equal(h.calls.canCall(42), true);
  assert.equal(h.tick(), OUTCOME_HOLD_MS);
  assert.equal(h.states.has("42"), false);
  assert.equal(h.timers.length, 0);
});

test("a decline ends the ring at once and stops the no-answer timer", () => {
  const h = harness();
  h.calls.start("7");
  assert.equal(h.calls.end("7", "declined"), true);
  assert.equal(h.states.get("7"), "declined");
  assert.equal(h.tick(), OUTCOME_HOLD_MS);
  assert.equal(h.states.has("7"), false);
});

test("a late decline cannot undo 'joined' or a finished ring", () => {
  const h = harness();
  h.calls.start("7");
  h.calls.clear("7");
  h.states.set("7", "joined"); // _markMemberJoined
  assert.equal(h.calls.end("7", "declined"), false);
  assert.equal(h.states.get("7"), "joined");
  assert.equal(h.timers.length, 0);

  const g = harness();
  g.calls.start("8");
  g.tick(); // no answer
  assert.equal(g.calls.end("8", "declined"), false);
  assert.equal(g.states.get("8"), "no_answer");
});

test("calling again during an outcome restarts the ring cleanly", () => {
  const h = harness();
  h.calls.start("9");
  h.calls.end("9", "offline");
  assert.equal(h.calls.start("9"), true);
  assert.equal(h.states.get("9"), "calling");
  // The old hold timer is gone; only the new ring timer is pending.
  assert.equal(h.tick(), RING_MAX_MS);
  assert.equal(h.states.get("9"), "no_answer");
});

test("an outcome hold never clears a state that moved on", () => {
  const h = harness();
  h.calls.start("5");
  h.calls.end("5", "declined");
  const hold = h.timers[0];
  h.states.set("5", "joined"); // joined from the popup they reopened
  hold.f();
  assert.equal(h.states.get("5"), "joined");
});

test("a failed invite returns the row to a plain Call", () => {
  const h = harness();
  h.calls.start("3");
  h.calls.fail("3");
  assert.equal(h.states.has("3"), false);
  assert.equal(h.timers.length, 0);
});

test("dispose drops every pending timer", () => {
  const h = harness();
  h.calls.start("1");
  h.calls.start("2");
  h.calls.dispose();
  assert.equal(h.calls.timers.size, 0);
});

test("only a reply carrying a room counts as a ring", () => {
  assert.equal(inviteRang({ room_id: "r", nid: "r" }), true);
  assert.equal(inviteRang({ offline: 1, uid: "u" }), false);
  assert.equal(inviteRang({ cross_call: 1, room_id: "r" }), false);
  assert.equal(inviteRang(null), false);
  assert.equal(inviteRang(undefined), false);
  assert.equal(inviteRang({}), false);
});

test("wiring: decline reaches the meeting window and the roster", () => {
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
  const sw = read("src/drumee/builtins/window/switchcall/index.js");
  assert.match(sw, /_declineMeetingInvite\(\)/);
  assert.match(sw, /SERVICE\.conference\.decline/);
  const push = read("src/drumee/modules/desk/wm/push.js");
  assert.match(push, /onInviteDeclined\(data\.uid\)/);
  const meet = read("src/drumee/builtins/window/meeting/index.js");
  assert.match(meet, /onInviteDeclined\(uid\)/);
  assert.match(meet, /inviteRang\(result\)/);
  assert.match(meet, /_memberCalls\.dispose\(\)/);
  const row = read("src/drumee/builtins/widget/meeting/skeleton/member.js");
  assert.match(row, /"data-call": callState/);
});

test("default timers are called the way a browser allows (no Illegal invocation)", () => {
  // A browser's setTimeout/clearTimeout throw unless `this` is the window (or
  // undefined). Node's do not check, which is how a bare `this.setTimer =
  // setTimeout` shipped and killed every roster Call. Enforce the browser rule.
  const realSet = global.setTimeout;
  const realClear = global.clearTimeout;
  const strict = (real) =>
    function (...a) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return real(...a);
    };
  global.setTimeout = strict(realSet);
  global.clearTimeout = strict(realClear);
  try {
    const states = new Map();
    const calls = new MemberCalls(states, { refresh: () => {} });
    assert.equal(calls.start("42"), true);
    assert.equal(states.get("42"), "calling");
    assert.equal(calls.end("42", "declined"), true);
    calls.dispose();
  } finally {
    global.setTimeout = realSet;
    global.clearTimeout = realClear;
  }
});
