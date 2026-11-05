// tests/boot-tour-then-remembered-screen.test.js — a new account that has not
// finished the migrate tour reloads on the Calendar / Inbox / Admin Console /
// Billing. The reload lands on Files with the tour, and when the tour ends the
// remembered screen comes back — unless the user went somewhere meanwhile.
//
//   node --test tests/boot-tour-then-remembered-screen.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DESK_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");

// A tiny stand-in for libs/tutorial-tours' single-flight + whenDone.
function toursStub() {
  const t = { inFlight: null, waiting: [] };
  t.lib = {
    whenDone: (id, cb) => {
      if (t.inFlight !== id) { cb(); return false; }
      t.waiting.push(cb);
      return true;
    },
  };
  t.end = () => { t.inFlight = null; const w = t.waiting; t.waiting = []; w.forEach((cb) => cb()); };
  return t;
}

function desk(tours, { navSeq = 0, mainOnTop = false, current = null } = {}) {
  const req = (m) => {
    if (m === "libs/tutorial-tours") return tours.lib;
    throw new Error(`unexpected require ${m}`);
  };
  const mk = (sig) => new Function("require", `return (${sliceFunction(DESK_SRC, sig)});`)(req);
  const log = [];
  const self = {
    _navSeq: navSeq,
    _mainScreenOnTop: () => mainOnTop,
    _currentScreenService: () => current,
    _landOnOrgView: async () => log.push("org-view"),
    _restoreScreen: (s, onOpened) => { log.push(`screen:${s}`); onOpened(); return Promise.resolve(); },
    log,
  };
  self._deferScreenUntilTour = mk("_deferScreenUntilTour(screen)");
  self._armDeferredScreen = mk("_armDeferredScreen()");
  self._replayDeferredScreen = mk("async _replayDeferredScreen()");
  return self;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test("Calendar remembered: nothing opens while the tour runs; the Calendar comes back when it ends", async () => {
  const tours = toursStub();
  const d = desk(tours);
  d._deferScreenUntilTour({ orgView: false, service: "toggle-calendar", paneComing: true });
  tours.inFlight = "migrate";        // the boot tour is up
  d._bootTourSettled = true;
  d._armDeferredScreen();
  await tick();
  assert.deepEqual(d.log, [], "tour first");
  tours.end();                       // the user finishes / closes the tour
  await tick();
  assert.deepEqual(d.log, ["screen:toggle-calendar"]);
});

test("organisation screen + slide-out remembered: both come back, org screen first", async () => {
  const tours = toursStub();
  const d = desk(tours);
  d._deferScreenUntilTour({ orgView: true, service: "toggle-trash", paneComing: true });
  d._bootTourSettled = true;
  d._armDeferredScreen();            // no tour in flight → replay now
  await tick();
  assert.deepEqual(d.log, ["org-view", "screen:toggle-trash"]);
});

test("the tour never ran: the remembered screen comes back straight away", async () => {
  const tours = toursStub();
  const d = desk(tours);
  d._deferScreenUntilTour({ orgView: false, service: "upgrade-plan", paneComing: true });
  d._bootTourSettled = true;
  d._armDeferredScreen();
  await tick();
  assert.deepEqual(d.log, ["screen:upgrade-plan"]);
});

test("the tour decided BEFORE the restore parked the screen: parking arms it at once", async () => {
  const tours = toursStub();
  const d = desk(tours);
  d._bootTourSettled = true;
  tours.inFlight = "migrate";
  d._deferScreenUntilTour({ orgView: false, service: "toggle-inbox", paneComing: true });
  await tick();
  assert.deepEqual(d.log, []);
  tours.end();
  await tick();
  assert.deepEqual(d.log, ["screen:toggle-inbox"]);
});

test("the user went somewhere during the tour (rail press): no replay", async () => {
  const tours = toursStub();
  const d = desk(tours);
  d._deferScreenUntilTour({ orgView: false, service: "toggle-apps", paneComing: true });
  tours.inFlight = "migrate";
  d._bootTourSettled = true;
  d._armDeferredScreen();
  d._navSeq += 1;                    // _navigated()
  tours.end();
  await tick();
  assert.deepEqual(d.log, []);
});

test("a screen is already up when the tour ends: no replay over it", async () => {
  const tours = toursStub();
  const d = desk(tours, { current: "toggle-contacts" });
  d._deferScreenUntilTour({ orgView: false, service: "toggle-calendar", paneComing: true });
  d._bootTourSettled = true;
  d._armDeferredScreen();
  await tick();
  assert.deepEqual(d.log, []);
});

test("replays once only", async () => {
  const tours = toursStub();
  const d = desk(tours);
  d._deferScreenUntilTour({ orgView: false, service: "toggle-calendar", paneComing: true });
  d._bootTourSettled = true;
  d._armDeferredScreen();
  d._armDeferredScreen();
  await tick();
  assert.deepEqual(d.log, ["screen:toggle-calendar"]);
});

test("_maybeRunBootTour arms the parked screen once the tour has decided", () => {
  const body = sliceFunction(DESK_SRC, "async _maybeRunBootTour()");
  assert.match(body, /this\._bootTourSettled = true;\s*\n\s*this\._armDeferredScreen\(\);/);
});

// ── THE ROOT CAUSE (2026-11-05): a reload DURING the tour lost the screen ────
// _persistDeskState (pagehide) records only what is live; the parked screen is
// not live while the tour runs, so the saved state dropped it for good.

function persist({ deferred = null, navSeq = 0, live = null, orgLive = false } = {}) {
  const store = {};
  global.sessionStorage = {
    setItem: (k, v) => { store[k] = JSON.parse(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const fn = new Function("desk_module", `return (${sliceFunction(DESK_SRC, "_persistDeskState()")});`)(
    { _DESK_STATE_KEY: "k" },
  );
  fn.call({
    _deferredScreen: deferred,
    _navSeq: navSeq,
    _currentScreenService: () => live,
    _snapshotWorkspace: () => ({ hub_id: "h1" }),
    _snapshotFloatingWindows: () => [],
    _orgViewOnScreen: () => orgLive,
  });
  return store.k;
}

test("reload during the tour keeps the parked Calendar in the saved state", () => {
  const st = persist({ deferred: { service: "toggle-calendar", orgView: false, seq: 0 } });
  assert.deepEqual(st, { service: "toggle-calendar", workspace: { hub_id: "h1" } });
});

test("…and a parked organisation screen + slide-out", () => {
  const st = persist({ deferred: { service: "toggle-trash", orgView: true, seq: 0 } });
  assert.deepEqual(st, { service: "toggle-trash", workspace: { hub_id: "h1" }, orgView: 1 });
});

test("the user went somewhere since it was parked: the parked screen is NOT carried", () => {
  const st = persist({ deferred: { service: "toggle-calendar", orgView: false, seq: 0 }, navSeq: 1 });
  assert.deepEqual(st, { workspace: { hub_id: "h1" } });
});

test("a screen the user opened is live and wins over the parked one", () => {
  const st = persist({ deferred: { service: "toggle-calendar", orgView: false, seq: 0 }, live: "toggle-inbox" });
  assert.equal(st.service, "toggle-inbox");
});

test("nothing parked: unchanged behaviour", () => {
  assert.deepEqual(persist({}), { workspace: { hub_id: "h1" } });
});
