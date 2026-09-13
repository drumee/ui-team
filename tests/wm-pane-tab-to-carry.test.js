const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const SRC = fs.readFileSync(
  require.resolve("../src/drumee/modules/desk/wm/index.js"),
  "utf8",
);

// paneTabToCarry's body: it opens on `\n  paneTabToCarry() {\n` and closes on
// the first `\n  }\n` (a 2-space-indented close; the body itself is 4+ spaces).
const m = SRC.match(/\n  paneTabToCarry\(\) \{\n([\s\S]*?)\n  \}\n/);
assert.ok(m, "paneTabToCarry() not found");
const body = m[1];

const fakeA = { chat: "chat", task: "task" };
const run = new Function("_a", body);

function call(activeTab) {
  const win = {
    headlessPane() {
      return { activeTab };
    },
  };
  return run.call(win, fakeA);
}

test("switching workspace carries the Access tab over, like Chat/Task/Meet", () => {
  assert.equal(call("access"), "access");
});

test("switching workspace still carries Chat, Task and Meet, and drops Files/unknown", () => {
  assert.equal(call("chat"), "chat");
  assert.equal(call("task"), "task");
  assert.equal(call("meeting"), "meeting");
  assert.equal(call("files"), null);
  assert.equal(call(undefined), null);
  assert.equal(call("bogus"), null);
});
