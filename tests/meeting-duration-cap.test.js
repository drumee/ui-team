// Group-meeting duration cap, client side (builtins/window/meeting).
//
// Two things here are load-bearing and easy to regress:
//
//   1. NO server deadline means NO timers. The `meeting_minutes` entitlement
//      does not exist until the schemas patch runs, and conference.join omits
//      the three deadline keys whenever a room is uncapped — so an absent
//      value has to mean "this meeting has no limit", never "zero minutes".
//   2. The wait is driven by `remaining_sec`, a DURATION measured on the
//      server. The moment anything here starts doing `expires_at - Date.now()`
//      the cutoff is back on the local wall clock, and a browser whose clock
//      is fast ends the call early.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const MEETING = join(
  __dirname,
  "../src/drumee/builtins/window/meeting/index.js",
);
const src = readFileSync(MEETING, "utf8");

function extractClassMethod(source, name) {
  const m = new RegExp(`\\n  (async )?${name}\\(`).exec(source);
  assert.ok(m, `${name} not found in production source`);
  const start = m.index + 1;
  const end = source.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  const body = source.slice(start, end + 4).trim().replace(/^async\s+/, "");
  return `${m[1] ? "async " : ""}function ${body}`;
}

const WARN_MS = (() => {
  const m = /const MEETING_LIMIT_WARN_MS = ([^;]+);/.exec(src);
  assert.ok(m, "MEETING_LIMIT_WARN_MS not found");
  // eslint-disable-next-line no-eval
  return eval(m[1]);
})();

/**
 * Build `_armMeetingDeadline` as a standalone function over a fake timer, so
 * the real production body decides what gets scheduled.
 */
function armFor(room) {
  const scheduled = [];
  const ctx = {
    _warnMeetingLimit() { this._warned = true; },
    _endOnMeetingLimit() { this._ended = true; },
  };
  const fn = new Function(
    "MEETING_LIMIT_WARN_MS",
    "setTimeout",
    `${extractClassMethod(src, "_armMeetingDeadline")}; return _armMeetingDeadline;`,
  )(WARN_MS, (cb, ms) => {
    scheduled.push(ms);
    return { id: scheduled.length };
  });
  fn.call(ctx, room);
  return { ctx, scheduled };
}

test("warn window is five minutes", () => {
  assert.equal(WARN_MS, 5 * 60 * 1000);
});

test("no server deadline -> no timers armed", () => {
  // The normal case: 1:1 calls, unlimited plans, pods, and every deployment
  // whose entitlement patch has not run.
  for (const room of [
    undefined,
    null,
    {},
    { user: {} },
    { remaining_sec: 600 },              // duration_limit missing
    { duration_limit: 45 },              // remaining_sec missing
    { remaining_sec: 600, duration_limit: 0 },
    { remaining_sec: 600, duration_limit: -5 },
    { remaining_sec: "nope", duration_limit: 45 },
  ]) {
    const { ctx, scheduled } = armFor(room);
    assert.deepEqual(scheduled, [], JSON.stringify(room));
    assert.equal(ctx._meetingLimitMinutes, undefined, JSON.stringify(room));
  }
});

test("a capped room arms warn + cutoff off remaining_sec", () => {
  const { ctx, scheduled } = armFor({ remaining_sec: 45 * 60, duration_limit: 45 });
  assert.equal(ctx._meetingLimitMinutes, 45);
  assert.deepEqual(scheduled, [45 * 60 * 1000 - WARN_MS, 45 * 60 * 1000]);
});

test("joining inside the last five minutes skips the warning", () => {
  // A negative delay would fire the toast instantly — "ends in 5 minutes" at
  // the same moment the meeting ends.
  const { scheduled } = armFor({ remaining_sec: 120, duration_limit: 45 });
  assert.deepEqual(scheduled, [120 * 1000], "cutoff only");
});

test("an already-expired room cuts at once and never waits negative", () => {
  const { scheduled } = armFor({ remaining_sec: 0, duration_limit: 45 });
  assert.deepEqual(scheduled, [0]);
  const late = armFor({ remaining_sec: -90, duration_limit: 45 });
  assert.deepEqual(late.scheduled, [0], "clamped, not a negative delay");
});

test("the deadline never consults the local wall clock", () => {
  // The whole point of the server sending a duration. `expires_at` may be read
  // for display, but arming must not do arithmetic against Date.now().
  const body = extractClassMethod(src, "_armMeetingDeadline");
  assert.doesNotMatch(body, /Date\.now\(\)/);
  assert.doesNotMatch(body, /expires_at/);
  assert.match(body, /remaining_sec/);
});

test("timers are cleared on teardown", () => {
  const destroy = extractClassMethod(src, "onBeforeDestroy");
  assert.match(destroy, /_clearMeetingDeadline\(\)/);
  const clear = extractClassMethod(src, "_clearMeetingDeadline");
  assert.match(clear, /clearTimeout\(this\._meetingWarnTimer\)/);
  assert.match(clear, /clearTimeout\(this\._meetingLimitTimer\)/);
});

test("MEETING_END routes time-limit and host-ended to different copy", () => {
  const body = extractClassMethod(src, "_handleRemoteMeetingEnd");
  assert.match(body, /_handleRemoteMeetingEnd\(data\)/, "must receive the payload");
  assert.match(body, /reason === "time_limit"/);
  assert.match(body, /_showMeetingLimitCard\(\)/);
  assert.match(body, /MEETING_ENDED_BY_HOST/);
  // The old signature took no argument; if the WS handler stops forwarding the
  // payload every time-limit end silently reads as "the host ended it".
  assert.match(src, /_handleRemoteMeetingEnd\(data\)/);
});

test("the host broadcasts the reason so receivers can pick the right words", () => {
  const body = extractClassMethod(src, "_endOnMeetingLimit");
  assert.match(body, /reason: "time_limit"/);
  assert.match(body, /duration_limit: this\._meetingLimitMinutes/);
  // Must not double-broadcast against onBeforeDestroy's own MEETING_END.
  assert.match(body, /_meetingEndedBroadcast/);
});

test("every client arms its own cutoff, not just the host", () => {
  // A host whose tab was throttled or which crashed would otherwise leave the
  // room running past its limit.
  const body = extractClassMethod(src, "_armMeetingDeadline");
  assert.doesNotMatch(body, /_isHost/);
});

test("the limit warning bypasses the party-toast crowd filter", () => {
  // _partyToast drops anything raised while more than PARTY_TOAST_MAX people
  // are present — right for "someone walked in", wrong for this.
  const body = extractClassMethod(src, "_warnMeetingLimit");
  assert.doesNotMatch(body, /_partyToast/);
  assert.match(body, /MEETING_TIME_LIMIT_SOON/);
});

test("the upsell card is raised at most once", () => {
  const body = extractClassMethod(src, "_showMeetingLimitCard");
  assert.match(body, /_meetingLimitCardShown/);
  assert.match(body, /feature: "meeting_duration"/);
  // A guest has no plan to buy and no desk listening for the broadcast.
  assert.match(body, /canUpgradePlan\(\)/);
  assert.match(body, /\.catch\(/, "a dismissed confirm rejects");
});
