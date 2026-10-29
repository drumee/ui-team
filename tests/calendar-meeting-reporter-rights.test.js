// tests/calendar-meeting-reporter-rights.test.js — a WORKSPACE (scheduled)
// meeting on the Personal Calendar is editable only by its reporter (the
// creator; calendar.list answers can_write = created_by === caller):
//   • its chip shows the hover × (room.remove is creator-only server-side);
//   • its "Meeting information" modal (meeting_modal_host) opens in edit mode
//     with Delete + Update for the reporter, and in view mode for anyone else
//     — fields read-only, no Delete / Update. Join is always there.
// The folder window's own modal is untouched (its host has no view mode).
//
//   node --test tests/calendar-meeting-reporter-rights.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = path.join(__dirname, "../src/drumee");
global.Dayjs = require("dayjs");
global.LOCALE = { SUBTASKS: "Subtasks", PERSONAL: "Personal" };
global._a = { share: "share", folder: "folder" };
global._ = Object.assign(global._ || {}, { uniqueId: (p) => `${p}1` });
global.Skeletons = {
  Box: { X: (o) => ({ t: "X", ...o }), Y: (o) => ({ t: "Y", ...o }) },
  Note: (o) => ({ t: "Note", ...o }),
  Element: (o) => ({ t: "Element", ...o }),
  Image: { Svg: (o) => ({ t: "Svg", ...o }) },
  Button: { Svg: (o) => ({ t: "BtnSvg", ...o }) },
};
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === "media/grid/template/folder") return () => "";
  return origLoad.call(this, req, ...rest);
};
let chip;
try {
  ({ chip } = require(path.join(SRC, "builtins/panel/calendar/skeleton/chip.js")));
} finally {
  Module._load = origLoad;
}
const ui = { fig: { family: "calendar-main" } };
const hasRemove = (node) => (node.kids || []).some((k) => /__chip-remove/.test(k.className || ""));
const meeting = (extra) => ({ kind: "meeting", id: "m", nid: "m", hub_id: "h", title: "M", stime: 1, etime: 2, ...extra });

test("a workspace meeting's reporter gets the chip's ×", () => {
  assert.equal(hasRemove(chip(ui, meeting({ scope: "workspace", can_write: true }), { compact: 1 })), true);
});

test("anyone else gets no ×", () => {
  assert.equal(hasRemove(chip(ui, meeting({ scope: "workspace", can_write: false }), { compact: 1 })), false);
});

test("an occurrence of a series never gets the ×", () => {
  assert.equal(
    hasRemove(chip(ui, meeting({ scope: "workspace", can_write: true, is_occurrence: 1 }), { compact: 1 })),
    false,
  );
});

test("a workspace TASK still gets no × (it is deleted on its board)", () => {
  const task = { kind: "task", id: "t", scope: "workspace", can_write: true, title: "T", due_date: "2026-10-02" };
  assert.equal(hasRemove(chip(ui, task, { compact: 1 })), false);
});

test("personal rows keep their rule", () => {
  assert.equal(hasRemove(chip(ui, meeting({ scope: "personal", can_write: true }), { compact: 1 })), true);
});

// ── the hosted folder modal ─────────────────────────────────────────────────
const FOLDER = path.join(SRC, "builtins/window/folder");
const SKL = fs.readFileSync(path.join(FOLDER, "skeleton/meeting-modal.js"), "utf8");
const HOST = fs.readFileSync(path.join(FOLDER, "meeting-modal-host.js"), "utf8");
const SKIN = fs.readFileSync(path.join(FOLDER, "skin/meeting-modal.scss"), "utf8");

test("the modal asks its host for view mode; the folder (no such method) stays in edit", () => {
  assert.match(SKL, /const viewOnly = isEdit && !!\(ui\.meetingViewOnly && ui\.meetingViewOnly\(\)\);/);
  assert.match(SKL, /"data-view": viewOnly \? "1" : "0"/);
});

test("view mode's footer is Join alone", () => {
  const at = SKL.indexOf("const footerKids = ");
  const footer = SKL.slice(at, SKL.indexOf("return Skeletons.Box.Y({", at));
  assert.match(footer, /viewOnly\s*\?\s*\[\s*join\s*\]/);
});

test("view mode's description is not editable", () => {
  assert.match(SKL, /contenteditable: viewOnly \? "false" : "true"/);
});

test("the host is in view mode unless its row may write", () => {
  const fn = eval(`(${sliceFunction(HOST, "meetingViewOnly()")})`);
  assert.equal(fn.call({ mget: (k) => (k === "may_write" ? true : undefined) }), false);
  assert.equal(fn.call({ mget: () => false }), true);
});

test("view mode makes every field read-only once the modal is drawn", () => {
  const fn = eval(`(${sliceFunction(HOST, "_applyViewOnly()")})`);
  const inputs = [{ readOnly: false }, { readOnly: false }];
  const editors = [{ setAttribute(k, v) { this[k] = v; } }];
  const root = {
    querySelectorAll: (sel) => (/contenteditable/.test(sel) ? editors : inputs),
  };
  fn.call({ meetingViewOnly: () => true, dialogWrapper: { el: root } });
  assert.deepEqual(inputs.map((i) => i.readOnly), [true, true]);
  assert.equal(editors[0].contenteditable, "false");
  const untouched = [{ readOnly: false }];
  fn.call({ meetingViewOnly: () => false, dialogWrapper: { el: { querySelectorAll: () => untouched } } });
  assert.equal(untouched[0].readOnly, false);
});

test("the skin stills the body in view mode, file chips still open", () => {
  assert.match(SKIN, /&__meeting-modal\[data-view="1"\] &__meeting-modal-body \{[\s\S]*?pointer-events: none;/);
  assert.match(SKIN, /&__meeting-modal\[data-view="1"\] &__meeting-modal-attach-chip \{[\s\S]*?pointer-events: auto;/);
  assert.match(SKIN, /&__meeting-modal\[data-view="1"\] &__meeting-modal-attach-chip-x \{[\s\S]*?display: none;/);
});
