// Refusing to SCHEDULE a meeting longer than the plan allows.
//
// The runtime cap (tests/meeting-duration-cap.test.js) already cuts a live room
// off; this is the half that says so before the meeting exists. Two things here
// are load-bearing:
//
//   1. An absent `meeting_minutes` must mean NO cap. The key does not exist in
//      any deployed plan row until the schemas patch runs, and this code also
//      runs during bootstrap before Visitor.quota() is filled — read it closed
//      and every user on every tier is refused every meeting they book.
//   2. The reading has to match the SERVER's (`service/lib/meeting-limit.js`
//      capMinutes: positive int = cap, 0 = unlimited). If they drift, the UI
//      either refuses meetings the server would happily run, or promises ones
//      it is going to cut off mid-sentence.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

let platform = {};
let quota = {};
let service = {};

global.Platform = { get: (k) => platform[k] };
global.Visitor = { quota: () => quota, domainCan: () => false };
global.SERVICE = new Proxy({}, { get: (_t, k) => service[k] });
global._K = { permission: { owner: 0b0100000 } };
global.LOCALE = new Proxy({}, { get: (_t, k) => String(k) });

const { meetingMinutesCap, overMeetingCap } = require("../src/drumee/libs/billing");

const MIN = 60;

/** A cloud deployment with a live payment backend — gating is in force here. */
function sellingDeployment() {
  service = { payment: { checkout: "payment.checkout" } };
  platform = { arch: "cloud" };
  quota = { plan: "free", domain_id: 1 };
}

test("entitlement not deployed yet — nothing is refused", () => {
  sellingDeployment();
  assert.ok(!("meeting_minutes" in quota));

  assert.equal(meetingMinutesCap(), null);
  assert.equal(overMeetingCap(8 * 3600), 0);
});

test("pod install (no payment backend) never refuses a booking", () => {
  service = {};
  platform = { arch: "pod" };
  quota = { plan: "free", meeting_minutes: 45 };

  // Explicitly capped, and still open: an install with no checkout offers no
  // way to lift the gate, so it must not gate.
  assert.equal(meetingMinutesCap(), null);
  assert.equal(overMeetingCap(4 * 3600), 0);
});

test("operator switched billing off — no refusal", () => {
  sellingDeployment();
  platform = { arch: "cloud", billing_upgrade: 0 };
  quota = { plan: "free", meeting_minutes: 45 };

  assert.equal(overMeetingCap(4 * 3600), 0);
});

test("0 minutes means unlimited, not zero — the server's convention", () => {
  sellingDeployment();
  quota = { ...quota, plan: "team", meeting_minutes: 0 };

  assert.equal(meetingMinutesCap(), null);
  assert.equal(overMeetingCap(24 * 3600), 0);
});

test("a capped plan refuses past the cap and reports the number", () => {
  sellingDeployment();
  quota = { ...quota, meeting_minutes: 45 };

  assert.equal(meetingMinutesCap(), 45);
  assert.equal(overMeetingCap(46 * MIN), 45);
  assert.equal(overMeetingCap(2 * 3600), 45);
});

test("exactly the cap is allowed", () => {
  sellingDeployment();
  quota = { ...quota, meeting_minutes: 45 };

  assert.equal(overMeetingCap(45 * MIN), 0);
  assert.equal(overMeetingCap(44 * MIN), 0);
});

test("stray seconds do not turn an allowed meeting into a refused one", () => {
  // The organiser typed 09:00–09:45; whatever the epochs came out as, that is
  // a 45-minute meeting and the cap is 45.
  sellingDeployment();
  quota = { ...quota, meeting_minutes: 45 };

  assert.equal(overMeetingCap(45 * MIN + 59), 0);
  assert.equal(overMeetingCap(46 * MIN), 45);
});

test("a garbage or negative duration is never a refusal", () => {
  sellingDeployment();
  quota = { ...quota, meeting_minutes: 45 };

  assert.equal(overMeetingCap(NaN), 0);
  assert.equal(overMeetingCap(undefined), 0);
  assert.equal(overMeetingCap(-3600), 0);
});

test("an unparseable entitlement is unknown, and unknown is open", () => {
  sellingDeployment();

  for (const v of ["", "many", null, "abc", {}]) {
    quota = { plan: "free", domain_id: 1, meeting_minutes: v };
    assert.equal(overMeetingCap(6 * 3600), 0, `meeting_minutes=${JSON.stringify(v)}`);
  }
});

test('a numeric string is a cap — quota JSON is not typed', () => {
  sellingDeployment();
  quota = { ...quota, meeting_minutes: "45" };

  assert.equal(meetingMinutesCap(), 45);
  assert.equal(overMeetingCap(90 * MIN), 45);
});

// ── the two call sites ──────────────────────────────────────────────────────

const FOLDER = readFileSync(
  join(__dirname, "../src/drumee/builtins/window/folder/index.js"),
  "utf8",
);
const PANEL = readFileSync(
  join(__dirname, "../src/drumee/builtins/panel/calendar/index.js"),
  "utf8",
);

test("the workspace calendar refuses BEFORE it books", () => {
  const submit = FOLDER.slice(FOLDER.indexOf("\n  submitMeetingModal("));
  const gate = submit.indexOf("_meetingOverPlanCap");
  const book = submit.indexOf("SERVICE.room && SERVICE.room.book");
  assert.ok(gate > -1, "no cap gate in submitMeetingModal");
  assert.ok(book > -1, "room.book call not found");
  assert.ok(gate < book, "the cap must be checked before room.book");
});

test("the workspace calendar gate has no ownership precondition", () => {
  // It used to gate only workspaces whose privilege carried the owner bit.
  // Inside an org the hub owner and the billing entity differ — every member
  // shares the ORG's plan — so that silently waved through any workspace admin
  // who did not happen to own the hub, which is the common case. A gate that
  // quietly does nothing is indistinguishable from a broken build.
  const m = /_meetingOverPlanCap\(form\) \{[\s\S]*?\n  \}/.exec(FOLDER);
  assert.ok(m, "_meetingOverPlanCap not found");
  assert.doesNotMatch(m[0], /_K\.permission\.owner/);
  assert.doesNotMatch(m[0], /_a\.privilege/);
  assert.match(m[0], /overMeetingCap\(form\.etime - form\.stime\)/);
});

test("the personal calendar refuses BEFORE it books", () => {
  const submit = PANEL.slice(PANEL.indexOf("async _submitMeeting("));
  const gate = submit.indexOf("overMeetingCap");
  const post = submit.indexOf("postService({ service: bookSvc");
  assert.ok(gate > -1, "no cap gate in _submitMeeting");
  assert.ok(post > -1, "room.book call not found");
  assert.ok(gate < post, "the cap must be checked before room.book");
});

test("the personal calendar measures the duration it will actually book", () => {
  // The end time falls back to +30min when it is missing or not after the
  // start; the cap has to be measured against the value that gets stored.
  const submit = PANEL.slice(PANEL.indexOf("async _submitMeeting("));
  assert.match(submit, /const end = etime > stime \? etime : stime \+ 30 \* 60;/);
  assert.match(submit, /overMeetingCap\(end - stime\)/);
  assert.match(submit, /etime: end,/);
});

test("both call sites raise the scheduling card, not the runtime one", () => {
  for (const [name, src] of [["folder", FOLDER], ["panel", PANEL]]) {
    assert.match(src, /promptFeatureLock\("meeting_schedule", \[capMins\]\)/, name);
    assert.doesNotMatch(src, /"meeting_duration"/, name);
  }
});

test("the scheduling card has its own copy, in every language", () => {
  const lock = readFileSync(
    join(__dirname, "../src/drumee/builtins/widget/feature-lock/index.js"),
    "utf8",
  );
  assert.match(lock, /meeting_schedule: \{/);
  assert.match(lock, /LOCALE\.UNLOCK_MEETING_SCHEDULE\b/);
  assert.match(lock, /LOCALE\.UNLOCK_MEETING_SCHEDULE_DESC\.format\(args\[0\]\)/);

  for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
    const dict = JSON.parse(
      readFileSync(join(__dirname, `../locale/${lang}.json`), "utf8"),
    );
    assert.ok(dict.UNLOCK_MEETING_SCHEDULE, `${lang}: title missing`);
    assert.ok(dict.UNLOCK_MEETING_SCHEDULE_DESC, `${lang}: description missing`);
    // The cap is named in the sentence — a card that says "limited to
    // minutes" is worse than no card.
    assert.ok(
      dict.UNLOCK_MEETING_SCHEDULE_DESC.includes("{0}"),
      `${lang}: description drops the {0} placeholder`,
    );
  }
});
