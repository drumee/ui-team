// tests/calendar-window-timezone-pad.test.js — calendar.list turns from/to
// (YYYY-MM-DD) into epochs in the SERVER's timezone (calendar.js _epoch; UTC
// on stage), while the grid places a meeting on the VIEWER's local day. A
// meeting at 00:00 on 02/10 in UTC+7 starts 2026-10-01 17:00 UTC, so a Day
// view of 02/10 never got it back, while the month window did
// (s110@drumee.com, "rrrr", 2026-10-28). The request is padded one day each
// side — enough for any UTC offset — and getVisibleItems keeps only the rows
// that fall on the view's own local days.
//
//   node --test tests/calendar-window-timezone-pad.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const dayjs = require("dayjs");
const { sliceFunction } = require("./helpers/slice-method");

const CAL_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/builtins/panel/calendar/index.js"),
  "utf8"
);

// Names _readWindow closes over.
/* eslint-disable no-unused-vars */
const SERVICE = {};
const Visitor = { id: "me" };
const ymd = (d) => dayjs(d).format("YYYY-MM-DD");
const normalizeRow = (r) => r;
/* eslint-enable no-unused-vars */
const readWindow = eval(`(${sliceFunction(CAL_SRC, "async _readWindow(from, to)")})`);

function calendar() {
  const sent = [];
  return {
    sent,
    fetchService(args) {
      sent.push(args);
      return Promise.resolve([]);
    },
    warn() {},
  };
}

test("a Day view asks the server for the day before and after too", async () => {
  const self = calendar();
  const day = dayjs("2026-10-02");
  await readWindow.call(self, day.startOf("day"), day.endOf("day"));
  assert.equal(self.sent[0].from, "2026-10-01");
  assert.equal(self.sent[0].to, "2026-10-03");
});

test("a month window is padded the same way", async () => {
  const self = calendar();
  await readWindow.call(self, dayjs("2026-09-27"), dayjs("2026-11-07").endOf("day"));
  assert.equal(self.sent[0].from, "2026-09-26");
  assert.equal(self.sent[0].to, "2026-11-08");
});
