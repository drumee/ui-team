// tests/calendar-meeting-info-modal.test.js — on the Personal Calendar, a
// WORKSPACE meeting chip (any view) opens the folder's own "Meeting
// information" modal, hosted by meeting_modal_host in the calendar's modal
// slot, instead of handing over to the workspace. A PERSONAL meeting chip
// opens the calendar's own "personal meeting" form, as before.
//
//   node --test tests/calendar-meeting-info-modal.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const CAL = path.join(__dirname, "../src/drumee/builtins/panel/calendar");
const SRC = fs.readFileSync(path.join(CAL, "index.js"), "utf8");
const SKL = fs.readFileSync(path.join(CAL, "skeleton/index.js"), "utf8");
const openItem = eval(`(${sliceFunction(SRC, "_openItem(cmd)")})`);
const openInfo = eval(`(${sliceFunction(SRC, "_openMeetingInfo(row, { at, occurrence = false } = {})")})`);

const personal = { id: "m1", nid: "m1", kind: "meeting", scope: "personal", hub_id: "me", can_write: true, stime: 100, etime: 3700 };
const workspace = { id: "m2", nid: "m2", kind: "meeting", scope: "workspace", hub_id: "h2", can_write: false, stime: 200, etime: 3800 };

function calendar() {
  const calls = [];
  return {
    calls,
    _items: [personal, workspace],
    _openMeetingInfo: (row, opt) => calls.push(["info", row.id, opt]),
    _openMeetingForm: () => calls.push(["form"]),
    _openInWorkspace: () => calls.push(["workspace"]),
    _openTaskForm: () => calls.push(["task"]),
    _openQuickTask: () => calls.push(["quick"]),
    warn() {},
  };
}
const chipCmd = (row, extra = {}) => {
  const v = { itemId: row.id, itemKind: row.kind, itemOccurrence: 0, itemStime: row.stime, ...extra };
  return { mget: (k) => v[k] };
};

test("a workspace meeting chip opens the folder's meeting-info modal", () => {
  const self = calendar();
  openItem.call(self, chipCmd(workspace));
  assert.deepEqual(self.calls, [["info", "m2", { at: workspace.stime, occurrence: false }]]);
});

test("a personal meeting chip opens the calendar's own personal meeting form", () => {
  const self = calendar();
  openItem.call(self, chipCmd(personal));
  assert.deepEqual(self.calls, [["form"]]);
});

test("a personal occurrence, or one the viewer may not edit, opens nothing", () => {
  const occ = calendar();
  openItem.call(occ, chipCmd(personal, { itemOccurrence: 1, itemStime: 9000 }));
  assert.deepEqual(occ.calls, []);
  const ro = calendar();
  ro._items = [{ ...personal, can_write: false }];
  openItem.call(ro, chipCmd(ro._items[0]));
  assert.deepEqual(ro.calls, []);
});

test("a workspace occurrence chip passes its own start, not the series'", () => {
  const self = calendar();
  openItem.call(self, chipCmd(workspace, { itemOccurrence: 1, itemStime: 9000 }));
  assert.deepEqual(self.calls, [["info", "m2", { at: 9000, occurrence: true }]]);
});

test("_openMeetingInfo stores the coordinates the host needs", () => {
  const self = { _closeMenus() {}, rendered: 0, _renderModal() { this.rendered++; } };
  openInfo.call(self, personal, { at: 9000, occurrence: true });
  assert.deepEqual(self._form, { kind: "meeting-info", row: personal, at: 9000, occurrence: 9000 });
  assert.equal(self.rendered, 1);
  openInfo.call(self, workspace, { at: 200 });
  assert.equal(self._form.occurrence, 0);
});

test("the modal mounts meeting_modal_host with the row's coordinates", () => {
  const at = SKL.indexOf("function meetingInfo(ui, form)");
  assert.ok(at > 0);
  const body = SKL.slice(at, SKL.indexOf("\n}\n", at));
  for (const want of [
    /kind: "meeting_modal_host"/,
    /hub_id: row\.hub_id/,
    /meeting_nid: row\.nid \|\| row\.id/,
    /stime: form\.at/,
    /occurrence: form\.occurrence/,
    /may_write: !!row\.can_write/,
  ]) assert.match(body, want);
  assert.match(SKL, /if \(form\.kind === "meeting-info"\) return \[meetingInfo\(ui, form\)\];/);
});

test("the host closing closes the calendar modal, carrying a write", () => {
  const at = SRC.indexOf('case "meeting-host-closed": {');
  assert.ok(at > 0);
  const body = SRC.slice(at, SRC.indexOf("\n      }\n", at));
  assert.match(body, /if \(args && args\.wrote\) form\.wrote = true;/);
  assert.match(body, /return this\._closeForm\(\);/);
});

test("Escape closes a meeting-info form", () => {
  const keys = sliceFunction(SRC, "_installFormKeys()");
  assert.match(keys, /if \(form\.kind === "meeting-info"\) return this\._closeForm\(\);/);
});
