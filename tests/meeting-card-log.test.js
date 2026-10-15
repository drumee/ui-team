// meeting-card-log.test.js — the chat meeting card carries a short timeline:
// "Started by X" at the card's ctime while live, then "Ended · N min" once the
// row metadata gains ended_at (channel_meeting_end / onRoomEmptied). Cards that
// ended before ended_at existed show a bare "Ended" line.
//
//   node --test tests/meeting-card-log.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

global.LOCALE = require("../locale/en.json");
global.Dayjs = require("dayjs");
global.Visitor = { language: () => "en" };

const meetingEvent = require("../src/drumee/builtins/widget/chat-item/template/meeting-event");
const { formatMeetingDuration } = meetingEvent;

const fig = "widget-chatItem";
const now = Math.floor(Date.now() / 1000);
const card = (metadata, extra = {}) =>
  meetingEvent({ fig, message_type: "meeting.start", ctime: now - 3600, metadata, ...extra });
const logRows = (html) => html.match(/__meeting-card-log-row/g) || [];

test("live card: one Started row with the start time and the starter", () => {
  const html = card({ hub_id: "h", nid: "n", by: "Huan" });
  assert.equal(logRows(html).length, 1);
  assert.match(html, /Started by Huan/);
  assert.match(html, new RegExp(Dayjs.unix(now - 3600).format("h:mm A")));
  assert.match(html, /data-service="join-meeting"/);
});

test("ended card: Ended row with end time and duration, button disabled", () => {
  const html = card({ by: "Huan", meeting_status: "ended", ended_at: now - 3600 + 45 * 60 });
  assert.equal(logRows(html).length, 2);
  assert.match(html, /Ended · 45 min/);
  assert.match(html, new RegExp(Dayjs.unix(now - 3600 + 45 * 60).format("h:mm A")));
  assert.doesNotMatch(html, /data-service="join-meeting"/);
});

test("legacy ended card without ended_at: bare Ended row, no time or duration", () => {
  const html = card({ by: "Huan", meeting_status: "ended" });
  assert.equal(logRows(html).length, 2);
  assert.match(html, /__meeting-card-log-text">Ended</);
  assert.doesNotMatch(html, /Ended ·/);
});

test("a meeting from another day gets a date prefix", () => {
  const old = now - 3 * 86400;
  const html = card({ by: "Huan" }, { ctime: old });
  assert.match(html, new RegExp(Dayjs.unix(old).format("D MMM h:mm A")));
});

test("starter name is HTML-escaped", () => {
  const html = card({ by: "<b>x</b>" });
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

test("duration formatting", () => {
  assert.equal(formatMeetingDuration(30), "< 1 min");
  assert.equal(formatMeetingDuration(45 * 60), "45 min");
  assert.equal(formatMeetingDuration(65 * 60), "1 h 05 min");
  assert.equal(formatMeetingDuration(-5), "");
  assert.equal(formatMeetingDuration(NaN), "");
});
