// Contextual tours are offered to NEW accounts only: an account created before
// platform.tours_new_user_since never gets one, whatever its seen-set says.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const Tours = require(path.join(__dirname, "../src/drumee/libs/tutorial-tours.js"));

const CUTOFF = 1790000000;
const broadcasts = [];

function boot({ since, ctime, settings = {} }) {
  const platform = { contextual_tours: 1, tours_new_user_since: since };
  const user = { ctime, settings };
  global.Platform = { get: (k) => platform[k] };
  global.Visitor = {
    id: "u1",
    get: (k) => user[k],
    settings: () => user.settings,
    isMobile: () => false,
  };
  global.RADIO_BROADCAST = { trigger: (ch, p) => broadcasts.push(p) };
  global.localStorage = { getItem: () => null, setItem: () => {} };
  broadcasts.length = 0;
  Tours.__resetModuleState();
}

test.after(() => {
  for (const k of ["Platform", "Visitor", "RADIO_BROADCAST", "localStorage"]) delete global[k];
});

test("no cutoff: an old account is eligible (behaviour before the gate)", () => {
  boot({ since: 0, ctime: 1600000000 });
  assert.equal(Tours.isNewUser(), true);
  for (const id of Tours.TOUR_IDS) assert.equal(Tours.offerable(id), true, id);
});

test("account created before the cutoff: no tour is offered, claimed or fired", () => {
  boot({ since: CUTOFF, ctime: CUTOFF - 1 });
  assert.equal(Tours.isNewUser(), false);
  for (const id of Tours.TOUR_IDS) {
    assert.equal(Tours.offerable(id), false, id);
    assert.equal(Tours.claim(id), false, id);
    assert.equal(Tours.fire(id), false, id);
  }
  assert.equal(broadcasts.length, 0);
  assert.equal(Tours.inFlight(), null);
});

test("account created at or after the cutoff: every tour is offered", () => {
  for (const ctime of [CUTOFF, CUTOFF + 86400]) {
    boot({ since: CUTOFF, ctime });
    for (const id of Tours.TOUR_IDS) assert.equal(Tours.offerable(id), true, id);
  }
});

test("new account: fire() broadcasts the tour", () => {
  boot({ since: CUTOFF, ctime: CUTOFF + 1 });
  assert.equal(Tours.fire("chat"), true);
  assert.deepEqual(broadcasts, [{ tour: "chat", opt: null }]);
});

test("cutoff set but ctime unreadable: fails closed", () => {
  for (const ctime of [undefined, null, "", "abc", 0]) {
    boot({ since: CUTOFF, ctime });
    assert.equal(Tours.isNewUser(), false, String(ctime));
    assert.equal(Tours.offerable("migrate"), false, String(ctime));
  }
});

test("ctime as a numeric string still counts", () => {
  boot({ since: CUTOFF, ctime: String(CUTOFF + 5) });
  assert.equal(Tours.isNewUser(), true);
});

test("new account still honours the seen-set", () => {
  boot({ since: CUTOFF, ctime: CUTOFF + 1, settings: { tutorials_seen: { share: 1 } } });
  assert.equal(Tours.offerable("share"), false);
  assert.equal(Tours.offerable("chat"), true);
});
