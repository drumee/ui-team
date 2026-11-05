// tests/checkout-boot-skips-screen-restore.test.js — Checkout starts on the
// Billing screen, so the desk remembers "upgrade-plan" on the way out to
// Stripe. Back from Checkout it replayed that screen a second after the result
// modal appeared, and the plans page took the receipt off screen (stage
// recording 2026-11-04 21:27). On a Checkout boot the workspace is restored
// but the remembered screen and the organisation landing are not.
//
//   node --test tests/checkout-boot-skips-screen-restore.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

// The hold release waits two frames; node has none.
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const DESK_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");

function restoreWith({ saved, checkoutBoot }) {
  const fn = new Function("require", "LANDING_HOLD_MAX", `return (${sliceFunction(DESK_SRC, "async _restoreDeskState()")});`)(
    (m) => {
      if (m === "libs/checkout-return") return { isCheckoutBoot: () => checkoutBoot };
      throw new Error(`unexpected require ${m}`);
    },
    15000,
  );
  const calls = [];
  const self = {
    _bootDeepLink: false,
    _bootSavedState: saved,
    _savedStateIsRestorable: (s) => !!s,
    _waitForWm: async () => ({}),
    _restoreFloatingWindows: async () => calls.push("windows"),
    _restoreWorkspace: async () => { calls.push("workspace"); return true; },
    _openDefaultWorkspace: async () => { calls.push("default-workspace"); return true; },
    _landOnOrgView: async (...a) => calls.push(a[1] && a[1].firstOpen ? "org-view-first" : "org-view"),
    _restoreScreen: (service, onOpened) => { calls.push(`screen:${service}`); onOpened(); return Promise.resolve(); },
    _clearRestoreInFlight: (ms) => { if (checkoutBoot) calls.push(`flag-cleared:${ms}`); },
    _releaseLandingHold: () => calls.push("release-landing"),
    _settleHomeGrid: () => {},
  };
  return fn.call(self).then(() => calls);
}

test("back from Checkout: NO workspace, NO remembered screen — straight to Billing + card", async () => {
  const calls = await restoreWith({
    saved: { service: "upgrade-plan", workspace: { hub_id: "h1" } },
    checkoutBoot: true,
  });
  // Nothing is opened; the restore flag stays up (capped) and the pane hold
  // is left for wm to release once Billing + the card are up.
  assert.deepEqual(calls, ["flag-cleared:15000"]);
});

test("back from Checkout: a remembered organisation screen is not replayed either", async () => {
  const calls = await restoreWith({ saved: { orgView: 1, workspace: { hub_id: "h1" } }, checkoutBoot: true });
  assert.deepEqual(calls, ["flag-cleared:15000"]);
});

test("back from Checkout with nothing saved: no default workspace either, no org-screen landing", async () => {
  const calls = await restoreWith({ saved: null, checkoutBoot: true });
  assert.deepEqual(calls, ["flag-cleared:15000"]);
});

test("an ordinary reload still puts Billing back", async () => {
  const calls = await restoreWith({
    saved: { service: "upgrade-plan", workspace: { hub_id: "h1" } },
    checkoutBoot: false,
  });
  assert.deepEqual(calls, ["workspace", "screen:upgrade-plan"]);
});

test("an ordinary first open still lands on the organisation screen", async () => {
  const calls = await restoreWith({ saved: null, checkoutBoot: false });
  assert.deepEqual(calls, ["default-workspace", "org-view-first"]);
});

// ── No bare pane before a remembered screen (2026-11-05) ─────────────────────
// The workspace still opens underneath, hidden (landing hold), and the hold
// comes down only once the remembered screen is drawn.

test("remembered screen: the hold is released AFTER the screen restore settles", async () => {
  const calls = await restoreWith({
    saved: { service: "toggle-calendar", workspace: { hub_id: "h1" } },
    checkoutBoot: false,
  });
  // promise → two frames (setTimeouts here): wait until it lands, bounded.
  for (let i = 0; i < 50 && !calls.includes("release-landing"); i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  assert.deepEqual(calls, ["workspace", "screen:toggle-calendar", "release-landing"]);
});

function holdWith({ savedService = null, saved = null, deepLink = false, checkout = false, mobile = false, orgFeature = false, tour = true }) {
  global.Visitor = { isMobile: () => mobile };
  const fn = new Function("require", "LANDING_HOLD_MAX", `return (${sliceFunction(DESK_SRC, "_holdLandingPane()")});`)(
    (m) => {
      if (m === "libs/checkout-return") return { isCheckoutBoot: () => checkout };
      if (m === "libs/org-overview") return { orgFeature: () => orgFeature };
      throw new Error(`unexpected require ${m}`);
    },
    15000,
  );
  const self = {
    el: { dataset: {} },
    _bootDeepLink: deepLink,
    _bootSavedState: saved,
    _savedScreenService: () => savedService,
    _savedStateIsRestorable: (st) => !!st,
    _bootTourComing: () => tour,
    _releaseLandingHold: () => {},
  };
  fn.call(self);
  clearTimeout(self._landingHoldTimer);
  return self;
}

test("hold: a reload reopening the Calendar / Inbox / Admin Console / Billing hides the pane", () => {
  for (const s of ["toggle-calendar", "toggle-inbox", "toggle-apps", "upgrade-plan"]) {
    // even for a new account (tour offerable) and with no org feature
    const self = holdWith({ savedService: s, saved: { service: s, workspace: {} }, tour: true, orgFeature: false });
    assert.equal(self.el.dataset.landingHold, "1", s);
    assert.equal(self._screenRestoreHold, true, s);
  }
});

test("hold: not for a deep link or a plain workspace reload", () => {
  assert.equal(holdWith({ savedService: "toggle-calendar", deepLink: true }).el.dataset.landingHold, undefined);
  assert.equal(holdWith({ saved: { workspace: {} } }).el.dataset.landingHold, undefined);
});

test("hold: a Checkout return hides the pane until Billing + the card are up (wm releases it)", () => {
  const self = holdWith({ saved: { service: "upgrade-plan", workspace: {} }, checkout: true, tour: true });
  assert.equal(self.el.dataset.landingHold, "1");
  assert.equal(self._checkoutHold, true);
  assert.equal(self._screenRestoreHold, true, "survives _navigated (opening Billing navigates)");
});

test("restore on a Checkout boot does NOT release the Checkout hold", async () => {
  const fn = new Function("require", "LANDING_HOLD_MAX", `return (${sliceFunction(DESK_SRC, "async _restoreDeskState()")});`)(
    (m) => ({ isCheckoutBoot: () => true }), 15000);
  const calls = [];
  await fn.call({
    _checkoutHold: true,
    _bootDeepLink: false,
    _bootSavedState: { service: "upgrade-plan", workspace: { hub_id: "h1" } },
    _savedStateIsRestorable: (s) => !!s,
    _waitForWm: async () => ({}),
    _restoreWorkspace: async () => { calls.push("workspace"); return true; },
    _openDefaultWorkspace: async () => true,
    _clearRestoreInFlight() {}, _settleHomeGrid() {},
    _releaseLandingHold: () => calls.push("release-landing"),
  });
  assert.deepEqual(calls, [], "no workspace opened, hold left for wm");
});

test("_navigated keeps a screen-restore hold up (the reopen itself navigates)", () => {
  const body = sliceFunction(DESK_SRC, "_navigated()");
  assert.match(body, /if \(!this\._landingOpening && !this\._screenRestoreHold\) this\._releaseLandingHold\(\);/);
  const rel = sliceFunction(DESK_SRC, "_releaseLandingHold()");
  assert.match(rel, /this\._screenRestoreHold = false;/);
});

test("_releaseCheckoutHold drops the pane hold and the restore flag the Checkout boot kept up", () => {
  const body = sliceFunction(DESK_SRC, "_releaseCheckoutHold()");
  assert.match(body, /this\._checkoutHold = false;/);
  assert.match(body, /this\._releaseLandingHold\(\);/);
  assert.match(body, /this\._clearRestoreInFlight\(2000\);/);
});
