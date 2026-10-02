// tests/calendar-attachments-skeleton.test.js
//   node --test tests/calendar-attachments-skeleton.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

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
const block = require(path.join(CAL, "attachments.js"));
const taskForm = require(path.join(CAL, "task-form.js"));
const meetingForm = require(path.join(CAL, "meeting-form.js"));

const walk = (n, out = []) => {
  if (!n || typeof n !== "object") return out;
  out.push(n);
  for (const k of [].concat(n.kids || [])) walk(k, out);
  return out;
};
const ui = (form) => ({ fig: { family: "calendar-main" }, getForm: () => form });

test("both modals carry the drop zone, the paperclip and the chip part", () => {
  for (const [name, build, kind] of [["task", taskForm, "task"], ["meeting", meetingForm, "meeting"]]) {
    const all = walk(build(ui({ kind, mode: "create", draft: {} })));
    assert.ok(all.some((n) => n.attrOpt && n.attrOpt["data-drop-zone"] === "files"), `${name}: zone`);
    assert.ok(all.some((n) => n.service === "cal-pick-files"), `${name}: paperclip`);
    assert.ok(all.some((n) => n.sys_pn === "form-files"), `${name}: chip part`);
  }
});

test("chips: one per entry, keyed and stamped with status; error offers retry", () => {
  const list = [
    { localKey: "l1", filename: "a", extension: "pdf", status: "uploading" },
    { localKey: "l2", filename: "b", extension: "", status: "error" },
    { nid: "n3", linked: 1, filename: "c", extension: "png", status: "linked" },
  ];
  const chips = block.fileChips(ui({}), list);
  assert.equal(chips.length, 3);
  assert.deepEqual(chips.map((c) => c.attrOpt["data-key"]), ["l1", "l2", "nid:n3"]);
  assert.deepEqual(chips.map((c) => c.attrOpt["data-status"]), ["uploading", "error", "linked"]);
  const names = walk(chips[0]).filter((n) => n.className === "calendar-main__file-name").map((n) => n.content);
  assert.deepEqual(names, ["a.pdf"]);
  assert.ok(walk(chips[1]).some((n) => n.service === "cal-file-retry" && n.calFileKey === "l2"));
  assert.ok(!walk(chips[0]).some((n) => n.service === "cal-file-retry"));
  assert.ok(walk(chips[2]).some((n) => n.service === "cal-file-remove" && n.calFileKey === "nid:n3"));
});

test("new copy exists in every locale", () => {
  for (const lang of ["en", "fr", "es", "ru", "zh", "km"]) {
    const l = require(`../locale/${lang}.json`);
    for (const k of ["CAL_DROP_OR_BROWSE", "CAL_FILES_FAILED", "CAL_FILES_LIMIT", "CAL_FILES_NOT_ATTACHED"]) {
      assert.ok(l[k], `${lang}.${k}`);
    }
  }
});

test("only Title is required, in both modals", () => {
  for (const [name, build, kind] of [["task", taskForm, "task"], ["meeting", meetingForm, "meeting"]]) {
    const required = walk(build(ui({ kind, mode: "create", draft: {} })))
      .filter((n) => n.attrOpt && n.attrOpt["data-required"] === "1")
      .map((n) => n.attrOpt["data-field"]);
    assert.deepEqual(required, ["title"], name);
  }
});
