// tests/folder-meeting-modal-events.test.js — the folder's "Meeting
// information" modal answers its events through ONE method,
// onMeetingModalEvent, so another host (the Personal Calendar's
// meeting_modal_host) can route the same events to the same code. The
// folder's own onUiEvent asks it first.
//
//   node --test tests/folder-meeting-modal-events.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/folder");
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const SKL = fs.readFileSync(path.join(DIR, "skeleton/meeting-modal.js"), "utf8");

// What the modal emits: its services, and the two `watch` keystroke events.
const EMITTED = [
  ...new Set([...SKL.matchAll(/service: "([a-z-]+)"/g)].map((m) => m[1])),
  "mm-invitee-typed",
  "mm-file-typed",
];

const handler = () => sliceFunction(SRC, "onMeetingModalEvent(service, cmd, args = {})");
const onUiEvent = () => sliceFunction(SRC, "onUiEvent(cmd, args = {})");

test("onMeetingModalEvent owns every event the modal emits", () => {
  const body = handler();
  for (const s of EMITTED) assert.ok(body.includes(`case "${s}":`), s);
});

test("onUiEvent no longer holds those cases", () => {
  const body = onUiEvent();
  for (const s of EMITTED) assert.ok(!body.includes(`case "${s}":`), s);
});

test("onUiEvent delegates before its own switch", () => {
  const body = onUiEvent();
  const ask = body.indexOf("this.onMeetingModalEvent(service, cmd, args)");
  const sw = body.indexOf("switch (service)");
  assert.ok(ask > 0 && ask < sw);
});

test("an unknown service is reported as not handled", () => {
  const fn = eval(`(${handler()})`);
  assert.deepEqual(fn.call({}, "not-a-modal-event", {}, {}), { handled: false });
});
