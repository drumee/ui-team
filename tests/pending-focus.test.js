// pending-focus.test.js — "open this file ON that comment" handed from a
// notification click to the editor window it launches
// (builtins/editor/pending-focus.js).
//   node --test tests/pending-focus.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const PF = require("../src/drumee/builtins/editor/pending-focus");

test("a target is taken once, by the nid it was left for", () => {
  PF.set("n1", { comment_id: "7", tab_id: "t2" });
  assert.equal(PF.take("n2"), null);
  assert.deepEqual(PF.take("n1"), { comment_id: "7", tab_id: "t2" });
  assert.equal(PF.take("n1"), null, "used once");
});

test("a stale target is ignored, so a later open does not jump to an old comment", () => {
  PF.set("n1", { comment_id: "7" });
  assert.equal(PF.take("n1", Date.now() + PF.TTL_MS + 1), null);
});

test("junk is ignored", () => {
  PF.set("", { comment_id: "7" });
  PF.set("n3", null);
  assert.equal(PF.take(""), null);
  assert.equal(PF.take("n3"), null);
});

test("waitFor resolves with the first truthy probe, null on timeout or cancel; a throwing probe means not yet", async () => {
  let n = 0;
  assert.equal(await PF.waitFor(() => (++n < 3 ? null : "ok"), { every: 5 }), "ok");
  let m = 0;
  assert.equal(await PF.waitFor(() => { if (++m < 2) throw new Error("x"); return 1; }, { every: 5 }), 1);
  assert.equal(await PF.waitFor(() => null, { timeout: 30, every: 5 }), null);
  assert.equal(await PF.waitFor(() => null, { timeout: 1000, every: 5, cancelled: () => true }), null);
});
