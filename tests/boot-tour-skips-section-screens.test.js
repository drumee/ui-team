// tests/boot-tour-skips-section-screens.test.js — a new account that has not
// finished the migrate tour reloads on Billing (settings-billing__main), the
// Calendar (calendar-main__page), the Admin console or the Inbox
// (chat-p2p__main), and the tour was drawn over that screen. The boot tour now
// stands down — and does not hide the pane for it — whenever a section screen
// is being restored or is on the canvas. It stays offerable for the next Files
// press.
//
//   node --test tests/boot-tour-skips-section-screens.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DESK_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");

function method(sig, scope = {}) {
  const names = Object.keys(scope);
  return new Function(...names, `return (${sliceFunction(DESK_SRC, sig)});`)(...names.map((n) => scope[n]));
}

const sectionOnScreen = method("_bootTourSectionOnScreen(opt = {})");

function host({ savedService = null, saved = null, deepLink = false, mainOnTop = false, current = null } = {}) {
  return {
    _savedScreenService: () => savedService,
    _bootSavedState: saved,
    _bootDeepLink: deepLink,
    _hasDeepLink: () => deepLink,
    _mainScreenOnTop: () => mainOnTop,
    _currentScreenService: () => current,
  };
}

// ── the helper ────────────────────────────────────────────────────────────────

test("a reload headed back to Billing / Calendar / Inbox / Admin console counts", () => {
  for (const s of ["upgrade-plan", "toggle-calendar", "toggle-inbox", "toggle-apps"]) {
    assert.equal(sectionOnScreen.call(host({ savedService: s }), { savedOnly: true }), true, s);
  }
});

test("a reload headed back to the organisation screen counts, unless a deep link wins", () => {
  assert.equal(sectionOnScreen.call(host({ saved: { orgView: 1 } }), { savedOnly: true }), true);
  assert.equal(sectionOnScreen.call(host({ saved: { orgView: 1 }, deepLink: true }), { savedOnly: true }), false);
});

test("live: any full-canvas screen or slide-out on top counts; savedOnly ignores them", () => {
  assert.equal(sectionOnScreen.call(host({ mainOnTop: true })), true);
  assert.equal(sectionOnScreen.call(host({ current: "toggle-trash" })), true);
  assert.equal(sectionOnScreen.call(host({ mainOnTop: true }), { savedOnly: true }), false);
});

test("plain workspace reload: nothing covers the Files pane", () => {
  assert.equal(sectionOnScreen.call(host({ saved: { workspace: { hub_id: "h" } } })), false);
});

test("a throwing read fails closed (no tour over an unknown screen)", () => {
  const h = host();
  h._savedScreenService = () => { throw new Error("boom"); };
  assert.equal(sectionOnScreen.call(h), true);
});

// ── _raiseBootTour ────────────────────────────────────────────────────────────

function bootTour(h, { offerable = true, checkoutBoot = false, resultDone = "none" } = {}) {
  const fired = [];
  const fn = method("async _raiseBootTour()", {
    require: (m) => {
      if (m === "libs/window-tutorial-intent") return { has: () => false };
      if (m === "libs/tutorial-tours") return { offerable: () => offerable };
      if (m === "libs/checkout-return") {
        return { isCheckoutBoot: () => checkoutBoot, whenResultDone: async () => resultDone };
      }
      throw new Error(`unexpected require ${m}`);
    },
  });
  const self = Object.assign(h, {
    _bootTourSectionOnScreen: sectionOnScreen,
    _awaitRestoreSettled: async () => {},
    _awaitRailWorkspace: async () => ({ id: "ws" }),
    _workspaceIncoming: () => false,
    _whenToursIdle: async () => {},
    _raiseRailTour: async (t) => { fired.push(t); return true; },
  });
  return fn.call(self).then((r) => ({ r, fired }));
}

test("boot tour: reload restoring Billing → no tour", async () => {
  const { r, fired } = await bootTour(host({ savedService: "upgrade-plan" }));
  assert.equal(r, false);
  assert.deepEqual(fired, []);
});

test("boot tour: Calendar already on the canvas when it would fire → no tour", async () => {
  const { r, fired } = await bootTour(host({ mainOnTop: true }));
  assert.equal(r, false);
  assert.deepEqual(fired, []);
});

test("boot tour: plain workspace reload still raises migrate", async () => {
  const { r, fired } = await bootTour(host());
  assert.equal(r, true);
  assert.deepEqual(fired, ["migrate"]);
});

test("boot tour: a section opened during the waits wins", async () => {
  let open = false;
  const h = host();
  h._mainScreenOnTop = () => open;
  const fn = method("async _raiseBootTour()", {
    require: (m) => (m === "libs/window-tutorial-intent" ? { has: () => false }
      : m === "libs/checkout-return" ? { isCheckoutBoot: () => false } : { offerable: () => true }),
  });
  const fired = [];
  Object.assign(h, {
    _bootTourSectionOnScreen: sectionOnScreen,
    _awaitRestoreSettled: async () => {},
    _awaitRailWorkspace: async () => ({ id: "ws" }),
    _workspaceIncoming: () => false,
    _whenToursIdle: async () => { open = true; }, // Calendar pressed while waiting
    _raiseRailTour: async (t) => { fired.push(t); return true; },
  });
  assert.equal(await fn.call(h), false);
  assert.deepEqual(fired, []);
});

// ── _holdBootTourPane: no hidden pane when the tour will not come ────────────

test("pane hold: not raised for a reload restoring a section screen", () => {
  const fn = method("_holdBootTourPane()", {
    require: (m) => (m === "libs/window-tutorial-intent" ? { has: () => false } : { offerable: () => true }),
  });
  global.Visitor = { parseModuleArgs: () => ({}) };
  const run = (h) => {
    h.el = { dataset: {} };
    h._bootTourSectionOnScreen = sectionOnScreen;
    h._releaseBootTourHold = () => {};
    fn.call(h);
    return h.el.dataset.bootTourHold;
  };
  assert.equal(run(host({ savedService: "toggle-inbox" })), undefined);
  global.BOOT_TOUR_HOLD_MAX = 1; // only read when the hold is set
});

test("boot tour: back from Checkout, modal dismissed → the tour comes (user is on Files)", async () => {
  const { r, fired } = await bootTour(host(), { checkoutBoot: true, resultDone: "closed" });
  assert.equal(r, true);
  assert.deepEqual(fired, ["migrate"]);
});

test("boot tour: back from Checkout, modal button went to Billing → no tour", async () => {
  const { r, fired } = await bootTour(host(), { checkoutBoot: true, resultDone: "left" });
  assert.equal(r, false);
  assert.deepEqual(fired, []);
});

test("boot tour: back from Checkout, modal never appeared → the tour still comes", async () => {
  const { r, fired } = await bootTour(host(), { checkoutBoot: true, resultDone: "timeout" });
  assert.equal(r, true);
  assert.deepEqual(fired, ["migrate"]);
});
