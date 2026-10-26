// tests/desk-rail-return-to-call.test.js — "Return to call" on a docked
// MEETING lights the rail's Meet row; the meeting ending puts the rail back on
// the tab the workspace is on underneath.
//
// Runs the REAL desk methods against a stub `this` (the desk only loads under
// webpack).
//
//   node --test tests/desk-rail-return-to-call.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DESK = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/index.js"),
  "utf8",
);
const PARKING = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/webrtc/call-parking.js"),
  "utf8",
);

const radio = [];
global._a = { chat: "chat", task: "task", kind: "kind" };
global._ = { isFunction: (f) => typeof f === "function" };
global.RADIO_BROADCAST = { trigger: (ch, p) => radio.push([ch, p && p.pn]) };

const method = (sig) => new Function(`return ${sliceFunction(DESK, sig)}`)();
const railHighlight = method("_railHighlight(tab, { stamp = true } = {})");
const onCallBack = method("_onCallBack(call)");
const onCallGone = method("_onCallGone(call)");
const onCallParked = method("_onCallParked()");

function desk(mtab = "files") {
  radio.length = 0;
  const parts = {};
  for (const k of ["files", "chat", "task", "meet", "access"]) {
    parts[`sidebar-${k}`] = { pn: `sidebar-${k}`, el: {} };
    parts[`mrail-${k}`] = { pn: `mrail-${k}`, el: {} };
  }
  return {
    el: { dataset: { mtab } },
    closed: 0,
    closeAllPanels() { this.closed++; },
    getPart: (pn) => parts[pn],
    _railHighlight: railHighlight,
  };
}

test("returning to a docked meeting closes the covering screen and lights Meet", () => {
  const d = desk("files");
  onCallBack.call(d, { kind: "window_meeting" });
  assert.equal(d.closed, 1);
  assert.deepEqual(radio, [
    ["sidebar-radio", "sidebar-meet"],
    ["mobile-rail-radio", "mrail-meet"],
  ]);
});

test("lighting Meet for the call keeps the workspace's own tab stamp", () => {
  const d = desk("chat");
  onCallBack.call(d, { kind: "window_meeting" });
  assert.equal(d.el.dataset.mtab, "chat");
});

test("returning to a 1:1 call closes the screen but leaves the rail alone", () => {
  const d = desk("files");
  onCallBack.call(d, { kind: "window_connect" });
  onCallBack.call(d, undefined);
  assert.equal(d.closed, 2);
  assert.deepEqual(radio, []);
});

test("the meeting ending puts the rail back on the tab underneath", () => {
  const d = desk("task");
  onCallBack.call(d, { kind: "window_meeting" });
  radio.length = 0;
  onCallGone.call(d, { kind: "window_meeting" });
  assert.deepEqual(radio, [
    ["sidebar-radio", "sidebar-task"],
    ["mobile-rail-radio", "mrail-task"],
  ]);
  // Once only.
  radio.length = 0;
  onCallGone.call(d, { kind: "window_meeting" });
  assert.deepEqual(radio, []);
});

test("a meeting that ends while parked leaves the rail to whatever navigated", () => {
  const d = desk("files");
  onCallBack.call(d, { kind: "window_meeting" });
  onCallParked.call(d);
  radio.length = 0;
  onCallGone.call(d, { kind: "window_meeting" });
  assert.deepEqual(radio, []);
});

test("_railHighlight still stamps the tab by default", () => {
  const d = desk("files");
  railHighlight.call(d, "meeting");
  assert.equal(d.el.dataset.mtab, "meeting");
});

test("the desk listens for return, park and end", () => {
  assert.match(DESK, /this\._onCallReturned = \(call\) => this\._onCallBack\(call\);/);
  assert.match(DESK, /RADIO_BROADCAST\.on\("call:ended", this\._onCallEnded\)/);
  assert.match(DESK, /RADIO_BROADCAST\.off\("call:ended", this\._onCallEnded\)/);
  assert.match(DESK, /RADIO_BROADCAST\.on\("call:minimize", this\._onCallMinimized\)/);
  assert.match(DESK, /RADIO_BROADCAST\.off\("call:minimize", this\._onCallMinimized\)/);
});

test("the call window says which kind of call came back / ended", () => {
  assert.match(PARKING, /RADIO_BROADCAST\.trigger\("call:returned", \{ kind: this\.mget\(_a\.kind\) \}\)/);
  assert.match(PARKING, /RADIO_BROADCAST\.trigger\("call:ended", \{ kind: this\.mget\(_a\.kind\) \}\)/);
});
