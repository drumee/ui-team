const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PERIODS, periodOf, weekdayName, sublineKey, pluralCategory, coerceCount,
} = require("../src/drumee/builtins/widget/daily-reminder-popup/period");

const at = (h, m = 0, day = 26) => new Date(2026, 8, day, h, m); // 2026-09-26 is a Saturday; 25 is Friday

test("periodOf buckets the local hour", () => {
  assert.deepEqual(PERIODS, ["morning", "noon", "afternoon", "evening"]);
  assert.equal(periodOf(at(5)), "morning");
  assert.equal(periodOf(at(11, 59)), "morning");
  assert.equal(periodOf(at(12)), "noon");
  assert.equal(periodOf(at(13, 59)), "noon");
  assert.equal(periodOf(at(14)), "afternoon");
  assert.equal(periodOf(at(17, 59)), "afternoon");
  assert.equal(periodOf(at(18)), "evening");
  assert.equal(periodOf(at(23, 59)), "evening");
});

test("periodOf wraps past midnight into evening", () => {
  assert.equal(periodOf(at(0)), "evening");
  assert.equal(periodOf(at(2)), "evening");
  assert.equal(periodOf(at(4, 59)), "evening");
});

test("periodOf falls back to now on a bad date", () => {
  assert.ok(PERIODS.includes(periodOf(new Date("nope"))));
  assert.ok(PERIODS.includes(periodOf(undefined)));
});

test("weekdayName is localized and survives a bad lang", () => {
  assert.equal(weekdayName(at(9, 0, 25), "en"), "Friday");
  assert.equal(weekdayName(at(9, 0, 25), "fr"), "vendredi");
  assert.equal(weekdayName(at(9, 0, 25), "!!"), "Friday");
});

test("sublineKey: Friday afternoon/evening wraps up the week", () => {
  assert.equal(sublineKey("afternoon", at(15, 0, 25)), "DAILY_REMINDER_SUB_WEEK_END");
  assert.equal(sublineKey("evening", at(19, 0, 25)), "DAILY_REMINDER_SUB_WEEK_END");
  assert.equal(sublineKey("morning", at(9, 0, 25)), "DAILY_REMINDER_SUB_MORNING");
  assert.equal(sublineKey("noon", at(12, 0, 26)), "DAILY_REMINDER_SUB_NOON");
  assert.equal(sublineKey("afternoon", at(15, 0, 26)), "DAILY_REMINDER_SUB_AFTERNOON");
  assert.equal(sublineKey("evening", at(19, 0, 26)), "DAILY_REMINDER_SUB_EVENING");
});

test("pluralCategory follows CLDR and upper-cases", () => {
  assert.equal(pluralCategory(1, "en"), "ONE");
  assert.equal(pluralCategory(2, "en"), "OTHER");
  assert.equal(pluralCategory(3, "ru"), "FEW");
  assert.equal(pluralCategory(5, "ru"), "MANY");
  assert.equal(pluralCategory(1, "zh"), "OTHER");
  assert.equal(pluralCategory(1, "!!"), "ONE");
});

test("coerceCount only ever yields a non-negative integer", () => {
  assert.equal(coerceCount("51"), 51);
  assert.equal(coerceCount(2.9), 2);
  assert.equal(coerceCount(-4), 0);
  assert.equal(coerceCount("<b>"), 0);
  assert.equal(coerceCount(undefined), 0);
});
