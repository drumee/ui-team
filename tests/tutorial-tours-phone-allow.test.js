// Post-onboarding on a phone: the workspace tour (and its migrate hand-off)
// runs even with the mobile_tours rollout switch off; nothing else does.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee");

global.Platform = { get: (k) => ({ contextual_tours: 1, mobile_tours: 0 })[k] };
global.Visitor = { isMobile: () => true, get: () => 0, id: "u1" };
const Tours = require(path.join(SRC, "libs/tutorial-tours.js"));
test.after(() => { delete global.Platform; delete global.Visitor; });

test("switch off: phones are ruled out", () => {
  assert.equal(Tours.mobileToursOn("workspace"), false);
  assert.equal(Tours.offerable("chat", {}), false);
});

test("allowPhone opens exactly the named tours", () => {
  Tours.allowPhone(["workspace", "migrate"]);
  assert.equal(Tours.mobileToursOn("workspace"), true);
  assert.equal(Tours.mobileToursOn("migrate"), true);
  assert.equal(Tours.mobileToursOn("chat"), false);
  assert.equal(Tours.mobileToursOn(), false);
});

test("desk grants it on the post-onboarding run; hosts ask per tour", () => {
  const desk = fs.readFileSync(path.join(SRC, "modules/desk/index.js"), "utf8");
  assert.match(desk, /if \(postOnboarding\) \{\s*require\("libs\/tutorial-tours"\)\.allowPhone\(\["workspace", "migrate"\]\);/);
  for (const f of ["modules/desk/tutorial/index.js", "builtins/window/tutorial/index.js"]) {
    assert.match(fs.readFileSync(path.join(SRC, f), "utf8"), /Tours\.mobileToursOn\(this\._tour && this\._tour\.id\)/);
  }
});
