// topics-mock.test.js — the UI-test mock topics (window/folder/topics-mock):
// appended to the real list only while MOCK_TOPICS is on, never duplicating
// a real topic, ids safe for the server's topic_id pattern.
//
//   node --test tests/topics-mock.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/drumee/builtins/window/folder/topics-mock");

test("withMockTopics appends the mock set after the real topics", () => {
  const real = [{ id: "r1", name: "Real", emoji: "🔥" }];
  const got = M.withMockTopics(real, true);
  assert.equal(got[0], real[0]);
  assert.ok(got.length >= real.length + 6, "enough to page a 3-per-page carousel");
  for (const t of got.slice(1)) {
    assert.match(t.id, /^[0-9a-zA-Z]{1,16}$/);
    assert.ok(t.name && t.emoji);
  }
  assert.equal(new Set(got.map((t) => t.id)).size, got.length);
});

test("off → the real list untouched", () => {
  const real = [{ id: "r1" }];
  assert.equal(M.withMockTopics(real, false), real);
});
