// tests/calendar-meeting-form.test.js
//   node --test tests/calendar-meeting-form.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"), Entry: node("Entry"), Textarea: node("Textarea"), EntryBox: node("EntryBox"),
  Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") }, Element: node("Element"),
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._a = { password: "password" };

const CAL = path.join(__dirname, "../src/drumee/builtins/panel/calendar/skeleton");
// date-field pulls in a widget the node harness cannot load; stub it.
const df = require.resolve(path.join(CAL, "date-field.js"));
require.cache[df] = { id: df, filename: df, loaded: true, exports: () => ({ type: "DateField" }) };
const meetingForm = require(path.join(CAL, "meeting-form.js"));

const walk = (n, out = []) => {
  if (!n || typeof n !== "object") return out;
  out.push(n);
  for (const k of [].concat(n.kids || [])) walk(k, out);
  return out;
};
const has = (n, cls) => String(n.className || "").split(/\s+/).includes(cls);
const tree = meetingForm({
  fig: { family: "calendar-main" },
  getForm: () => ({ kind: "meeting", mode: "create", draft: {} }),
});
const labelsIn = (col) =>
  walk(col).filter((n) => has(n, "calendar-main__field-label")).map((n) => n.content);

test("meeting body is split: Title/Date/Attachments left, Time/Invite right", () => {
  const body = walk(tree).find((n) => has(n, "calendar-main__modal-body--split"));
  assert.ok(body, "no split body");
  assert.equal(body.type, "Box.X");
  const [left, right] = body.kids;
  assert.ok(has(left, "calendar-main__modal-col--main"));
  assert.ok(has(right, "calendar-main__modal-col--side"));
  assert.deepEqual(labelsIn(left), [en.TITLE, en.DATE, en.ATTACHMENTS]);
  assert.deepEqual(labelsIn(right), [en.START_TIME, en.END_TIME, en.INVITE]);
});

test("the start field is labelled Start time, not Enter time", () => {
  assert.equal(en.START_TIME, "Start time");
  for (const lang of ["en", "fr", "es", "ru", "zh", "km"]) {
    assert.ok(require(`../locale/${lang}.json`).START_TIME, `${lang}.START_TIME`);
  }
});

test("the time boxes take two characters at most", () => {
  const boxes = walk(tree).filter((n) => has(n, "calendar-main__time-input"));
  assert.equal(boxes.length, 4);
  for (const b of boxes) assert.equal(b.maxlength, 2, b.name);
});

test("the meeting split stacks under 700px, like the task one", () => {
  const scss = fs.readFileSync(path.join(CAL, "../skin/index.scss"), "utf8");
  const media = scss.slice(scss.indexOf("@media (max-width: 700px)"));
  assert.match(media, /&__modal\[data-form="meeting"\] &__modal-body--split[\s\S]*?flex-direction: column/);
  assert.match(scss, /&__modal\[data-form="meeting"\] &__modal-col--side \{\s*flex: 0 0 \d+px/);
});
