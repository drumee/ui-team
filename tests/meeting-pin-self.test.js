// tests/meeting-pin-self.test.js — pinning your OWN tile reaches the meeting.
//
// The local tile's uiHandler is the participants manager (participants
// onDomRefresh feeds it with `uiHandler: [this]`), not the meeting window like
// the remote tiles. The manager had no onUiEvent, so the "pin-tile" the local
// tile raised died there and pinning yourself did nothing.
//
//   node --test tests/meeting-pin-self.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/webrtc/participants/index.js"),
  "utf8",
);
const onUiEvent = new Function(`return ${sliceFunction(SRC, "onUiEvent(cmd, args = {})")}`)();

function manager() {
  const sent = [];
  return { sent, triggerHandlers: (e) => sent.push(e) };
}

test("the local tile feeds the participants manager, not the meeting", () => {
  assert.match(SRC, /kind: 'webrtc_local_user',[\s\S]*?uiHandler: \[this\]/);
});

test("forwards the local tile's pin-tile to the manager's handler (the meeting)", () => {
  const m = manager();
  const args = { service: "pin-tile", participant_id: undefined, uid: "u1", isLocal: 1 };
  onUiEvent.call(m, { get: () => undefined }, args);
  assert.equal(m.sent.length, 1);
  assert.deepEqual(m.sent[0], args);
});

test("leaves every other event alone", () => {
  const m = manager();
  onUiEvent.call(m, { get: () => undefined }, { service: "togglefullscreen", state: 1 });
  onUiEvent.call(m, { get: () => undefined }, {});
  assert.equal(m.sent.length, 0);
});
