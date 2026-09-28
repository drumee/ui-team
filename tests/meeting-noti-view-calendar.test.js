// Meeting notifications open the meeting's card on the Meet tab calendar:
// the notification-panel rows (activity item) and the invitation popup
// (desk push toast). No DOM here — the pure helpers are exercised, and the
// wiring is pinned by source so a refactor cannot silently drop it.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const ITEM = path.join(ROOT, "src/drumee/builtins/panel/activity/widget/item");
const { isMeetingRollup, meetingDeepLink } = require(path.join(ITEM, "meeting-link.js"));
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("isMeetingRollup: a single schedule rollup is a meeting", () => {
  assert.equal(isMeetingRollup({ item_filetype: "schedule", cnt: 1 }), true);
  assert.equal(isMeetingRollup({ item_filetype: "schedule", cnt: "1" }), true);
  assert.equal(isMeetingRollup({ uploaded_filetype: "schedule" }), true);
});

test("isMeetingRollup: multi-item, files and raw rows are not", () => {
  assert.equal(isMeetingRollup({ item_filetype: "schedule", cnt: 2 }), false);
  assert.equal(isMeetingRollup({ item_filetype: "image", cnt: 1 }), false);
  assert.equal(isMeetingRollup({ filetype: "schedule", cnt: 1 }), false);
  assert.equal(isMeetingRollup({}), false);
  assert.equal(isMeetingRollup(), false);
});

test("meetingDeepLink: id + start anchor", () => {
  assert.equal(meetingDeepLink("abc123", 1790000000), "&open_meeting_nid=abc123&open_meeting_stime=1790000000");
  assert.equal(meetingDeepLink("abc123", "1790000000"), "&open_meeting_nid=abc123&open_meeting_stime=1790000000");
  assert.equal(meetingDeepLink("abc123"), "&open_meeting_nid=abc123");
  assert.equal(meetingDeepLink("abc123", 0), "&open_meeting_nid=abc123");
});

test("meetingDeepLink: nothing without an id (calendar-only fallback)", () => {
  for (const v of [undefined, null, "", 0, "0", false]) assert.equal(meetingDeepLink(v, 5), "");
});

test("meetingDeepLink: the id cannot inject another hash argument", () => {
  assert.equal(meetingDeepLink("a&hub_id=x", 0), "&open_meeting_nid=a%26hub_id%3Dx");
});

test("activity rows: meeting_notice + schedule rollup carry the deep link", () => {
  const src = read("src/drumee/builtins/panel/activity/widget/item/index.js");
  // a cancelled meeting's node is gone → it must NOT try to open the card
  assert.match(src, /meeting_kind'\) !== 'cancelled' && this\.mget\('meeting_nid'\)/);
  assert.match(src, /isMeetingRollup\(this\.model\.toJSON\(\)\)/);
  assert.equal((src.match(/meetingDeepLink\(/g) || []).length, 2);
  // still the DOCKED route only — a launch-time activeTab=meeting starts a call
  assert.ok(!/wm\/open\/[^`]*activeTab=\$\{_a\.meeting\}/.test(src));
});

test("skeleton and click share ONE rollup test", () => {
  const sk = read("src/drumee/builtins/panel/activity/widget/item/skeleton/index.js");
  assert.match(sk, /require\('\.\.\/meeting-link'\)/);
  assert.match(sk, /if \(isMeetingRollup\(data\)\)/);
  assert.ok(!/itemFiletype === 'schedule' && cnt <= 1/.test(sk));
});

test("invite toast: View Calendar only on the invitation, only with hub+nid", () => {
  const src = read("src/drumee/modules/desk/wm/push.js");
  assert.match(src, /variant === "invite" && this\._canOpenMeetingInCalendar\(data\)/);
  assert.match(src, /return !!\(data && data\.hub_id && data\.nid\);/);
  assert.match(src, /open_meeting_nid: data\.nid/);
  // the invite card must never carry data-hub: conference.start's dedup reads it
  assert.match(src, /"data-hub": variant === "invite" \? "" : String\(data\.hub_id \|\| ""\)/);
});

const LANGS = ["en", "es", "fr", "km", "ru", "zh"];
for (const lang of LANGS) {
  test(`${lang}.json carries MEETING_VIEW_CALENDAR`, () => {
    const t = require(path.join(ROOT, "locale", `${lang}.json`));
    assert.equal(typeof t.MEETING_VIEW_CALENDAR, "string");
    assert.ok(t.MEETING_VIEW_CALENDAR.trim());
  });
}
