// tests/calendar-meetings-changed-same-tab.test.js — a meeting booked, edited
// or deleted in a folder's "Meeting information" modal reaches the Personal
// Calendar in the SAME tab. room.* pushes skip the socket that made the write
// (server-team room.js _broadcast), so the calendar mounted in that tab never
// heard of it and kept the old schedule until its 60s staleness rule or the
// next navigation reloaded it — "sometimes not synced". The modal now
// announces each successful write on a tab-local event; the calendar answers
// it the way it answers a push (_scheduleReload).
//
//   node --test tests/calendar-meetings-changed-same-tab.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

// A minimal RADIO_BROADCAST: on / off / trigger.
const handlers = {};
global.RADIO_BROADCAST = {
  on: (ev, fn) => (handlers[ev] = handlers[ev] || []).push(fn),
  off: (ev, fn) => (handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn)),
  trigger: (ev, ...a) => (handlers[ev] || []).slice().forEach((f) => f(...a)),
};

const SRC = path.join(__dirname, "../src/drumee");
const { announceMeetingsChanged, onMeetingsChanged } = require(path.join(SRC, "libs/meetings-changed.js"));

test("announce reaches every listener; the returned off() unbinds", () => {
  let n = 0;
  const off = onMeetingsChanged(() => n++);
  announceMeetingsChanged();
  assert.equal(n, 1);
  off();
  announceMeetingsChanged();
  assert.equal(n, 1);
});

test("announce without a RADIO_BROADCAST is a no-op, not a throw", () => {
  const saved = global.RADIO_BROADCAST;
  delete global.RADIO_BROADCAST;
  try {
    assert.doesNotThrow(() => announceMeetingsChanged());
  } finally {
    global.RADIO_BROADCAST = saved;
  }
});

const CAL = fs.readFileSync(path.join(SRC, "builtins/panel/calendar/index.js"), "utf8");

test("the calendar answers the announcement with a debounced reload", () => {
  const handler = eval(`(${sliceFunction(CAL, "_onMeetingsChanged()")})`);
  let reloads = 0;
  const self = { _scheduleReload: () => reloads++, isDestroyed: () => false };
  handler.call(self);
  assert.equal(reloads, 1);
  const gone = { _scheduleReload: () => reloads++, isDestroyed: () => true };
  handler.call(gone);
  assert.equal(reloads, 1, "a destroyed calendar does nothing");
});

test("the calendar binds the listener once and releases it on destroy", () => {
  assert.match(CAL, /onMeetingsChanged\(/);
  const destroy = sliceFunction(CAL, "onBeforeDestroy()");
  assert.match(destroy, /_offMeetingsChanged/);
});

const FOLDER = fs.readFileSync(path.join(SRC, "builtins/window/folder/index.js"), "utf8");

test("the folder modal announces after each successful room write", () => {
  // Update and book (saveMeetingModal), and delete (deleteMeetingModal).
  const del = sliceFunction(FOLDER, "deleteMeetingModal()");
  assert.match(del, /_mmSucceeded\(res\)\) return fail\(\);\s*announceMeetingsChanged\(\);/);
  const saveAt = FOLDER.indexOf('|| "room.update", {\n        flag: "all"');
  assert.ok(saveAt > 0, "update call not found");
  const saveTail = FOLDER.slice(saveAt, FOLDER.indexOf("deleteMeetingModal()", saveAt));
  // After the update succeeds, and after the book succeeds (createdNid known).
  assert.match(saveTail, /if \(!this\._mmSucceeded\(res\)\) return fail\(\);\s*announceMeetingsChanged\(\);/);
  assert.match(saveTail, /createdNid = node && \(node\.id \|\| node\.nid\);\s*if \(!createdNid\) return;\s*announceMeetingsChanged\(\);/);
});
