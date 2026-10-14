// Phones were refused every contextual tour; `mobile_tours` is the switch that
// lets them in once the phone layout exists.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Tours = require(path.join(__dirname, "..", "src/drumee/libs/tutorial-tours.js"));

function env({ mobile, flag }) {
  global.Platform = { get: (k) => ({ contextual_tours: 1, mobile_tours: flag, tours_new_user_since: 0 })[k] };
  global.Visitor = {
    id: "u1", isMobile: () => mobile, get: () => 0,
    settings: () => ({ tutorials_seen: {} }),
  };
  global.localStorage = { getItem: () => null, setItem() {} };
  Tours.__resetModuleState();
}
test.after(() => { delete global.Platform; delete global.Visitor; delete global.localStorage; });

test("phone with mobile_tours off: not offerable (today's behaviour)", () => {
  env({ mobile: true, flag: 0 });
  assert.equal(Tours.offerable("chat"), false);
});

test("phone with mobile_tours on: offerable", () => {
  env({ mobile: true, flag: 1 });
  assert.equal(Tours.offerable("chat"), true);
});

test("desktop unaffected by the flag", () => {
  env({ mobile: false, flag: 0 });
  assert.equal(Tours.offerable("chat"), true);
});
