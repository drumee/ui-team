// Post-onboarding on a phone: the workspace tour (and its migrate hand-off)
// runs even with the mobile_tours rollout switch off; nothing else does.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee");

global.Platform = { get: (k) => ({ contextual_tours: 1, mobile_tours: 0 })[k] };
global.Visitor = { isMobile: () => true, get: () => 0, id: "u1", settings: () => ({}) };
global.localStorage = { getItem: () => null, setItem: () => {} };
const Tours = require(path.join(SRC, "libs/tutorial-tours.js"));
test.after(() => { delete global.Platform; delete global.Visitor; delete global.localStorage; });

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
  assert.match(desk, /if \(postOnboarding\) \{\s*require\("libs\/tutorial-tours"\)\.allowPhone\(\["workspace"\]\);/);
  for (const f of ["modules/desk/tutorial/index.js", "builtins/window/tutorial/index.js"]) {
    const src = fs.readFileSync(path.join(SRC, f), "utf8");
    assert.match(src, /Tours\.mobileToursOn\(this\._tour && this\._tour\.id\)/);
    assert.match(src, /this\.mget\('phone_ok'\)/);
  }
});

test("phone gate: a phone's own trigger passes the switch, others do not", () => {
  assert.equal(Tours.offerable("chat", {}), false);
  assert.deepEqual(Tours.phoneGate(), { phone: true });
  assert.equal(Tours.offerable("chat", {}, Tours.phoneGate()), true);
});

test("fire with the phone gate stamps phone_ok on the broadcast", () => {
  const seen = [];
  global.RADIO_BROADCAST = { trigger: (ch, a) => seen.push(a) };
  try {
    assert.equal(Tours.fire("meeting", {}, { x: 1 }, { phone: true }), true);
    assert.deepEqual(seen[0], { tour: "meeting", opt: { x: 1, phone_ok: 1 } });
  } finally {
    Tours.release("meeting");
    delete global.RADIO_BROADCAST;
  }
});

test("triggers wired: bar Chat/Task/Meet, gdrive row/card, share entries; no phone hand-off", () => {
  const desk = fs.readFileSync(path.join(SRC, "modules/desk/index.js"), "utf8");
  assert.match(desk, /_railTabWithTour\(_a\.chat, _a\.chat, require\("libs\/tutorial-tours"\)\.phoneGate\(\)\)/);
  assert.match(desk, /_railTabWithTour\(_a\.task, "folder_task", require\("libs\/tutorial-tours"\)\.phoneGate\(\)\)/);
  assert.match(desk, /_railTabWithTour\("meeting", "meeting", require\("libs\/tutorial-tours"\)\.phoneGate\(\)\)/);
  assert.match(desk, /_railTabWithTour\("files", "migrate"\);/);
  const folder = fs.readFileSync(path.join(SRC, "builtins/window/folder/index.js"), "utf8");
  assert.match(folder, /!_phoneMigrateRaised && Visitor\.isMobile\(\)\s*&& this\.showTutorial\("migrate", \{ phone_ok: 1 \}\)/);
  assert.match(folder, /showTutorial\("share", \{\s*\.\.\.\(Visitor\.isMobile\(\) \? \{ phone_ok: 1 \} : \{\}\)/);
  assert.match(folder, /Tours\.claim\(tour, this, opt\.phone_ok \? \{ phone: true \} : undefined\)/);
  const media = fs.readFileSync(path.join(SRC, "builtins/media/interact.js"), "utf8");
  assert.match(media, /_Tours\.fire\("share", this, \{[\s\S]*?\}, _Tours\.phoneGate\(\)\)/);
  const host = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/index.js"), "utf8");
  assert.match(host, /_chainMigrateTour\(pane\) \{[\s\S]*?if \(this\._layout === 'phone'\) return;/);
});
