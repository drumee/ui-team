const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const LANGS = ["en", "es", "fr", "km", "ru", "zh"];
const CATS = { ru: ["ONE", "FEW", "MANY", "OTHER"] };
const BASE = [
  "DAILY_REMINDER_HELLO", "DAILY_REMINDER_HELLO_NO_NAME",
  "DAILY_REMINDER_SUB_MORNING", "DAILY_REMINDER_SUB_NOON",
  "DAILY_REMINDER_SUB_AFTERNOON", "DAILY_REMINDER_SUB_EVENING",
  "DAILY_REMINDER_SUB_WEEK_END", "DAILY_REMINDER_CAL_ROW",
  "MAYBE_LATER", "OPEN_MY_CALENDAR",
];

for (const lang of LANGS) {
  test(`${lang}.json carries every daily-reminder key`, () => {
    const t = require(path.join(__dirname, "..", "locale", `${lang}.json`));
    const cats = CATS[lang] || ["ONE", "OTHER"];
    const want = [...BASE];
    for (const b of ["MSG", "TASK", "MEET"]) {
      for (const c of cats) want.push(`DAILY_REMINDER_${b}_LABEL_${c}`);
    }
    for (const k of want) {
      assert.equal(typeof t[k], "string", `${lang}: missing ${k}`);
      assert.ok(t[k].trim(), `${lang}: empty ${k}`);
    }
    assert.match(t.DAILY_REMINDER_HELLO, /\{0\}/);
    assert.match(t.DAILY_REMINDER_HELLO, /\{1\}/);
    assert.match(t.DAILY_REMINDER_HELLO_NO_NAME, /\{0\}/);
  });
}

// The pre-redesign strings. Nothing reads them since the 2026-09-23 card; a
// leftover would be a translation someone keeps maintaining for nothing.
const RETIRED = /^DAILY_REMINDER_(TITLE|TITLE_NO_NAME|SUBLINE|MESSAGES_[A-Z]+|TASKS_[A-Z]+|MEETINGS_[A-Z]+)$/;

for (const lang of LANGS) {
  test(`${lang}.json no longer carries the retired daily-reminder keys`, () => {
    const t = require(path.join(__dirname, "..", "locale", `${lang}.json`));
    assert.deepEqual(Object.keys(t).filter((k) => RETIRED.test(k)), []);
    // still needed by the new card, or elsewhere
    for (const k of ["DAILY_REMINDER_NOTHING", "DISCARD", "MY_CALENDAR"]) {
      assert.equal(typeof t[k], "string", `${lang}: lost ${k}`);
    }
  });
}
