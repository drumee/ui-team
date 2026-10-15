// meeting-waiting-room-host-start.test.js — the waiting room goes in when the
// host starts the meeting, with no Join card and no "already on other call".
//
//   node --test tests/meeting-waiting-room-host-start.test.js
//
// An invitee early for a scheduled meeting waits (server lib/meeting-early,
// window/meeting _showWaitingRoom). When the host started it, the desk put the
// "X started a meeting" card over the waiting room, and its Join ran the
// folder's launch, which found the waiting window and answered "You are
// already on other call". The start now tells the waiting room to go in
// (joinNow), and the workspace's own meeting window is never "another call".
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const MEETING_SRC = read("src/drumee/builtins/window/meeting/index.js");
const PUSH_SRC = read("src/drumee/modules/desk/wm/push.js");
const FOLDER_SRC = read("src/drumee/builtins/window/folder/index.js");
const TEAM_SRC = read("src/drumee/builtins/window/team/index.js");
const ROOM_SRC = read("src/drumee/builtins/webrtc/room/index.js");

global._a = {
  ...(global._a || {}),
  hub_id: "hub_id", room_id: "room_id", nid: "nid", socket_id: "socket_id", meeting: "meeting",
};
global.LOCALE = { ALREADY_ANOTHER_CALL: "You are already on other call", MEETING_STARTED: "Meeting Started" };
global.Visitor = { id: "invitee", get: () => "socket-b" };
global.SERVICE = { conference: { join: "conference.join" } };

const HUB = "hub-1";
const OTHER = "hub-2";

// The class methods that call `super` cannot be sliced into plain functions:
// run them inside a class over a stub base instead.
function sliceRaw(src, signature) {
  const start = src.indexOf(`\n  ${signature} {`);
  if (start < 0) throw new Error(`${signature} not found`);
  const end = src.indexOf("\n  }\n", start);
  return src.slice(start, end + 4);
}

const POLL_MS = 30 * 1000;
assert.match(MEETING_SRC, /const EARLY_WAIT_POLL_MS = 30 \* 1000;/);
const meetingFn = (sig) =>
  new Function("EARLY_WAIT_POLL_MS", `return ${sliceFunction(MEETING_SRC, sig)}`)(POLL_MS);
const joinNow = meetingFn("joinNow()");
const recheckEarlyWait = meetingFn("async _recheckEarlyWait()");
const armEarlyWait = meetingFn("_armEarlyWait()");

// Timers the test fires by hand.
function withTimers(fn) {
  const real = { set: global.setTimeout, clear: global.clearTimeout };
  const timers = [];
  global.setTimeout = (f, ms) => { const t = { f, ms }; timers.push(t); return t; };
  global.clearTimeout = (t) => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); };
  return Promise.resolve()
    .then(() => fn(timers))
    .finally(() => { global.setTimeout = real.set; global.clearTimeout = real.clear; });
}

// A waiting window whose re-checks the test answers ("waiting" or "joined").
function waitingWindow(opensInSec = 600) {
  const answers = [];
  const w = {
    state: "scheduledWait",
    raised: 0,
    checks: 0,
    _earlyWait: { opens_at: Math.floor(Date.now() / 1000) + opensInSec },
    isDestroyed: () => false,
    raise() { this.raised++; },
    joinNow, _recheckEarlyWait: recheckEarlyWait, _armEarlyWait: armEarlyWait,
    onDomRefresh() {
      this.checks++;
      return new Promise((resolve) => answers.push(resolve)).then((a) => {
        if (a === "waiting") return this._armEarlyWait();
        this.state = "joining";
      });
    },
  };
  w.answer = async (a) => { answers.shift()(a); await new Promise((r) => setImmediate(r)); };
  return w;
}

test("joinNow outside the waiting room does nothing", async () => {
  const w = waitingWindow();
  w.state = "online";
  await w.joinNow();
  assert.equal(w.checks, 0);
  assert.equal(w.raised, 0);
});

test("joinNow in the waiting room asks the server at once and brings the window up", () =>
  withTimers(async (timers) => {
    const w = waitingWindow();
    w._armEarlyWait();
    assert.equal(timers.length, 1, "the 30 s poll is pending");
    const done = w.joinNow();
    assert.equal(w.checks, 1);
    assert.equal(w.raised, 1);
    assert.equal(timers.length, 0, "the poll is replaced by the check");
    await w.answer("joined");
    await done;
    assert.equal(w.state, "joining");
    assert.equal(timers.length, 0);
  }));

test("a joinNow while a check is out never joins twice: it asks again 1 s later", () =>
  withTimers(async (timers) => {
    const w = waitingWindow();
    const first = w._recheckEarlyWait();
    await w.joinNow();
    assert.equal(w.checks, 1, "one join in flight");
    await w.answer("waiting");
    await first;
    assert.equal(timers.length, 1);
    assert.equal(timers[0].ms, 1000, "the earlier answer may predate the start");
    timers.shift().f();
    assert.equal(w.checks, 2);
    await w.answer("joined");
    assert.equal(w.state, "joining");
  }));

test("otherwise the poll keeps its pace, sooner only for the start time", () =>
  withTimers(async (timers) => {
    const far = waitingWindow(3600);
    far._armEarlyWait();
    assert.equal(timers.pop().ms, POLL_MS);
    const near = waitingWindow(5);
    near._armEarlyWait();
    const ms = timers.pop().ms;
    assert.ok(ms >= 1000 && ms <= 5000, `${ms}`);
  }));

test("a check that does not get through keeps the waiting room up", async () => {
  const join = new Function(`return ${sliceFunction(ROOM_SRC, "async join(args)")}`)();
  const room = (state) => ({
    state,
    states: [],
    statusMessages: {},
    service_class: "meeting",
    mget: () => null,
    metadata: () => ({}),
    postService: async () => undefined, // network failure: doRequest resolves undefined
    stateMachine(s) { this.state = s; this.states.push(s); },
  });
  const waiting = room("scheduledWait");
  assert.equal(await join.call(waiting), null);
  assert.deepEqual(waiting.states, [], "still waiting; the next tick asks again");
  const first = room("initializing");
  assert.equal(await join.call(first), null);
  assert.deepEqual(first.states, ["joining", "unreachable"], "a first join still says so");
});

const Base = class {
  constructor() { this.base = []; }
  stateMessage(s) { this.base.push(["message", s]); }
  async onRemoteDrumateJoined(d) { this.base.push(["joined", d]); }
};
const Meeting = new Function(
  "Base",
  `return class extends Base {${sliceRaw(MEETING_SRC, "stateMessage(s, timeout)")}${sliceRaw(MEETING_SRC, "async onRemoteDrumateJoined(data)")}}`,
)(Base);

function meetingWindow(state) {
  const m = new Meeting();
  Object.assign(m, {
    state,
    el: { dataset: { waiting: state === "scheduledWait" ? "1" : "0" } },
    shown: 0,
    joinNowCalls: 0,
    marked: [],
    _showWaitingRoom() { this.shown++; },
    joinNow() { this.joinNowCalls++; },
    _markMemberJoined(id) { this.marked.push(id); },
    _announceHostIfNeeded() {},
  });
  return m;
}

test("a passing notice no longer takes the waiting room down", () => {
  const m = meetingWindow("scheduledWait");
  m.stateMessage("Alice is connecting...", 4000);
  assert.equal(m.el.dataset.waiting, "1");
  assert.deepEqual(m.base, []);
  m.stateMessage("scheduledWait");
  assert.equal(m.shown, 1);
  const live = meetingWindow("online");
  live.stateMessage("Alice joined", 4000);
  assert.equal(live.el.dataset.waiting, "0");
  assert.deepEqual(live.base, [["message", "Alice joined"]]);
});

test("rung from the room while waiting: go in, skip the call bookkeeping", async () => {
  const m = meetingWindow("scheduledWait");
  await m.onRemoteDrumateJoined({ uid: "host" });
  assert.equal(m.joinNowCalls, 1);
  assert.deepEqual(m.base, []);
  assert.deepEqual(m.marked, []);
  const live = meetingWindow("online");
  await live.onRemoteDrumateJoined({ uid: "host" });
  assert.equal(live.joinNowCalls, 0);
  assert.deepEqual(live.marked, ["host"]);
});

// ── desk push ──────────────────────────────────────────────────────────────
const pushFn = (sig) =>
  new Function("withOwnWorkspaceName", `return ${sliceFunction(PUSH_SRC, sig)}`)((d) => d);
const inMeetingOf = pushFn("_inMeetingOf(hub_id)");
const showMeetingStartToast = pushFn("_showMeetingStartToast(data = {})");

function openMeeting(hub_id) {
  return {
    hub_id,
    joinNowCalls: 0,
    isDestroyed: () => false,
    mget(k) { return k === "hub_id" ? this.hub_id : null; },
    joinNow() { this.joinNowCalls++; },
  };
}

function desk() {
  return {
    toasts: [],
    _inMeetingOf: inMeetingOf,
    _hasLiveMeetingToastFor: () => false,
    _showMeetingToast(d, o) { this.toasts.push([d, o]); },
  };
}

test("the host's start sends the waiting room in, with no Join card over it", () => {
  const waiting = openMeeting(HUB);
  global.Wm = { getItemsByKind: (k) => (k === "window_meeting" ? [waiting] : []) };
  const d = desk();
  showMeetingStartToast.call(d, { room_type: "meeting", hub_id: HUB, uid: "host", room_id: HUB });
  assert.equal(waiting.joinNowCalls, 1);
  assert.equal(d.toasts.length, 0);
});

test("another workspace's start still gets its card", () => {
  const waiting = openMeeting(OTHER);
  global.Wm = { getItemsByKind: (k) => (k === "window_meeting" ? [waiting] : []) };
  const d = desk();
  showMeetingStartToast.call(d, { room_type: "meeting", hub_id: HUB, uid: "host", room_id: HUB });
  assert.equal(waiting.joinNowCalls, 0);
  assert.equal(d.toasts.length, 1);
});

test("the start-time reminder is held back while the meeting window is open", () => {
  assert.match(
    PUSH_SRC,
    /case "room\.reminder":\n\s*if \(this\._inMeetingOf\(data && data\.hub_id\)\) return;\n\s*return this\._showMeetingToast\(data, \{ reminder: 1 \}\);/,
  );
});

// ── folder / team launch ───────────────────────────────────────────────────
function launchWith(existing) {
  const alerts = [];
  global.Wm = {
    getItemByKind: (k) => (existing && k === existing.kind ? existing : null),
    alert: (m) => alerts.push(m),
  };
  return alerts;
}

function callWindow(kind, hub_id) {
  const w = { ...openMeeting(hub_id), kind, raised: 0, raise() { this.raised++; } };
  if (kind !== "window_meeting") delete w.joinNow;
  return w;
}

for (const [name, src, sig] of [
  ["folder", FOLDER_SRC, "_launchMeetingStandalone(opts = {})"],
  ["team", TEAM_SRC, "startTeamCall()"],
]) {
  const launch = new Function(`return ${sliceFunction(src, sig)}`)();
  const self = (hub_id) => ({ el: null, fig: { family: "x" }, mget: (k) => (k === "hub_id" ? hub_id : null) });

  test(`${name}: Join on the workspace's own waiting room goes in, no "already on other call"`, () => {
    const w = callWindow("window_meeting", HUB);
    const alerts = launchWith(w);
    const me = self(HUB);
    launch.call(me);
    assert.equal(w.raised, 1);
    assert.equal(w.joinNowCalls, 1);
    assert.deepEqual(alerts, []);
    if (name === "folder") assert.equal(me._launchingMeeting, false);
  });

  test(`${name}: a call elsewhere is still another call`, () => {
    const w = callWindow("window_meeting", OTHER);
    const alerts = launchWith(w);
    launch.call(self(HUB));
    assert.equal(w.joinNowCalls, 0);
    assert.deepEqual(alerts, [LOCALE.ALREADY_ANOTHER_CALL]);
    const p2p = callWindow("window_connect", HUB);
    const alerts2 = launchWith(p2p);
    launch.call(self(HUB));
    assert.deepEqual(alerts2, [LOCALE.ALREADY_ANOTHER_CALL]);
  });
}

// ── joining from one meeting (QA reopened it two hours early) ───────────────
// The server holds a join that names its meeting (schedule_id) however early
// it is, and nothing else. The calendar card's Join and the editor's Join name
// it; "Start a Meeting" does not.
test("the calendar card's and the editor's Join say which meeting, and which occurrence", () => {
  assert.match(
    FOLDER_SRC,
    /case "join-meeting": \{[\s\S]{0,400}?const schedule_id = \(cmd && cmd\.mget && cmd\.mget\(_a\.nid\)\) \|\| this\._mmEditNid \|\| null;[\s\S]{0,300}?const schedule_at = \(cmd && cmd\.mget && cmd\.mget\("stime"\)\) \|\| this\._mmOccurrenceAt \|\| null;\s*this\.closeMeetingModal\(\);\s*return this\._launchMeetingStandalone\(\{ schedule_id, schedule_at \}\);/,
  );
  // The card and its Join icon carry the occurrence's start; opening the
  // editor from the card keeps it until the editor closes.
  const SCHED_SRC = read("src/drumee/builtins/window/folder/skeleton/meeting-schedule.js");
  assert.equal((SCHED_SRC.match(/stime: mtg\.start\.unix\(\),/g) || []).length, 2);
  assert.match(FOLDER_SRC, /this\.openMeetingModal\(\{ meeting, occurrence: cmd\.mget && cmd\.mget\("stime"\) \}\)/);
  assert.match(FOLDER_SRC, /this\._mmOccurrenceAt = \(prefill && opt\.occurrence\) \|\| null;/);
  assert.match(FOLDER_SRC, /this\._mmEditNid = null;\n\s*this\._mmOccurrenceAt = null;/);
});

test("the folder launch hands it to the meeting window; Start a Meeting has none", () => {
  const launch = new Function(`return ${sliceFunction(FOLDER_SRC, "_launchMeetingStandalone(opts = {})")}`)();
  let launched = null;
  global.Wm = { getItemByKind: () => null, launch: (o) => { launched = o; return o; }, alert() {} };
  const me = {
    el: null, fig: { family: "x" },
    mget: (k) => (k === "hub_id" ? HUB : null),
    _setMeetingStartLoading() {}, _awaitMeetingReady() {},
  };
  launch.call(me, { schedule_id: "m-1", schedule_at: 1800000000 });
  assert.equal(launched.schedule_id, "m-1");
  assert.equal(launched.schedule_at, 1800000000);
  launch.call(me);
  assert.equal(launched.schedule_id, undefined);
  assert.equal(launched.schedule_at, undefined);
});

test("the room sends it with conference.join", async () => {
  const join = new Function(`return ${sliceFunction(ROOM_SRC, "async join(args)")}`)();
  let payload = null;
  const room = {
    state: "initializing", statusMessages: {}, service_class: "meeting",
    mget: (k) => ({ schedule_id: "m-1", schedule_at: 1800000000 })[k] || null,
    metadata: () => ({}),
    postService: async (svc, p) => { payload = p; return undefined; },
    stateMachine(s) { this.state = s; },
  };
  await join.call(room);
  assert.equal(payload.schedule_id, "m-1");
  assert.equal(payload.schedule_at, 1800000000);
});

test("the waiting card counts minutes, then hours, and names another day", async () => {
  global.Dayjs = require("dayjs");
  global.Skeletons = { Box: { Y: (o) => o, X: (o) => o }, Image: { Svg: (o) => o }, Note: (o) => o };
  Object.assign(global.LOCALE, {
    MEETING_START_AT: "Start at {0}",
    MEETING_STARTS_IN_MIN: "Starting in {0} min",
    MEETING_STARTS_IN_HOURS: "Starting in {0} h",
    MEETING_STARTS_IN_HOURS_MIN: "Starting in {0} h {1} min",
    MEETING_WAITING_AUTO_JOIN: "auto",
    LEAVE: "Leave",
  });
  if (!String.prototype.format) {
    String.prototype.format = function (...a) { return this.replace(/\{(\d+)\}/g, (m, i) => a[i]); };
  }
  const show = new Function(`return ${sliceFunction(MEETING_SRC, "_showWaitingRoom()")}`)();
  const card = async (inSec) => {
    let fed = null;
    const w = {
      fig: { family: "window-meeting" },
      _earlyWait: { starts_at: Math.floor(Date.now() / 1000) + inSec, title: "Weekly" },
      ensurePart: async () => ({ feed: (k) => { fed = k; } }),
    };
    show.call(w);
    await new Promise((r) => setImmediate(r));
    const kids = fed[0].kids;
    const text = (cls) => (kids.find((k) => k.className === `window-meeting__waiting-${cls}`) || {}).content;
    return { time: text("time"), countdown: text("countdown") };
  };
  assert.equal((await card(25 * 60)).countdown, "Starting in 25 min");
  assert.equal((await card(2 * 3600 + 5 * 60)).countdown, "Starting in 2 h 5 min");
  assert.equal((await card(3 * 3600)).countdown, "Starting in 3 h");
  const far = await card(3 * 86400);
  assert.equal(far.countdown, undefined, "past a day the date says it");
  assert.match(far.time, /^Start at \w{3}, \w{3} \d{1,2}, \d{1,2}:\d{2} [AP]M$/);
});
