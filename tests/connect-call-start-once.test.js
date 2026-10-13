// connect-call-start-once.test.js — the caller's 1:1 window starts its
// conference once, however many "accepted" pushes arrive.
//
//   node --test tests/connect-call-start-once.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { acceptStartsCall, startOnce } = require(path.join(
  __dirname, "..", "src/drumee/builtins/window/connect/call-start.js"
));

test("only a still-ringing window acts on an accept", () => {
  assert.equal(acceptStartsCall("dial"), true); // caller: start the call
  // Callee's OTHER device, still ringing: 'connect' makes it hang up there.
  assert.equal(acceptStartsCall("ring"), true);
  for (const s of ["connect", "joining", "waiting", "getUserDevices", "online", "invite", "pickup", undefined]) {
    assert.equal(acceptStartsCall(s), false, `state ${s}`);
  }
});

test("two concurrent starts run the body once and share its result", async () => {
  const host = {};
  let runs = 0;
  const body = async () => { runs++; await new Promise((r) => setTimeout(r, 5)); return "room"; };
  const [a, b] = await Promise.all([startOnce(host, body), startOnce(host, body)]);
  assert.equal(runs, 1);
  assert.equal(a, "room");
  assert.equal(b, "room");
});

test("a failed start can be retried", async () => {
  const host = {};
  await assert.rejects(startOnce(host, async () => { throw new Error("x"); }));
  assert.equal(await startOnce(host, async () => "ok"), "ok");
});
