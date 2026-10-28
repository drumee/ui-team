// tests/calendar-title-enter-no-submit.test.js — Enter in the task modal's
// "Task title" box saves nothing and closes nothing, in the New task and the
// Detail (edit) modal alike. Only the Create / Update button submits. Enter
// used to commit through cal-submit-task, which saved the task and shut the
// modal under the user's hands — including when the Enter that opened the
// modal from a focused chip landed on the freshly focused title.
//
//   node --test tests/calendar-title-enter-no-submit.test.js
//
// Source-text checks: task-form.js only loads under webpack.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CAL = path.join(__dirname, "../src/drumee/builtins/panel/calendar");
const FORM = fs.readFileSync(path.join(CAL, "skeleton/task-form.js"), "utf8");
const INDEX = fs.readFileSync(path.join(CAL, "index.js"), "utf8");

// The Entry({...}) literal that owns sys_pn "form-title".
const titleEntry = () => {
  const at = FORM.indexOf('sys_pn: "form-title"');
  assert.ok(at > 0, "title Entry not found");
  const start = FORM.lastIndexOf("Skeletons.Entry({", at);
  const end = FORM.indexOf("}),", at);
  return FORM.slice(start, end);
};

test("the title Entry does not carry the submit service", () => {
  const entry = titleEntry();
  assert.doesNotMatch(entry, /service: "cal-submit-task"/);
  assert.match(entry, /service: "cal-form-title"/);
});

test("cal-form-title is handled as a no-op, never reaching a submit", () => {
  const at = INDEX.indexOf('case "cal-form-title":');
  assert.ok(at > 0, "no cal-form-title case in onUiEvent");
  const next = INDEX.indexOf("case ", at + 1);
  const body = INDEX.slice(at, next);
  assert.match(body, /return;/);
  assert.doesNotMatch(body, /_submitTask|_closeForm/);
});

test("the Create / Update button still submits", () => {
  assert.match(FORM, /button\("primary", editing \? LOCALE\.UPDATE : LOCALE\.CREATE, "cal-submit-task"\)/);
});
