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

const DESK_SRC = fs.readFileSync(
  path.join(__dirname, "..", "src/drumee/modules/desk/index.js"), "utf8");

function restoreWith({ saved, checkoutBoot, tourOwns = false }) {
  const fn = new Function("require", `return (${sliceFunction(DESK_SRC, "async _restoreDeskState()")});`)(
    (m) => {
      if (m === "libs/checkout-return") return { isCheckoutBoot: () => checkoutBoot };
      throw new Error(`unexpected require ${m}`);
    },
  );
  const calls = [];
  const self = {
    _bootDeepLink: false,
    _bootSavedState: saved,
    _savedStateIsRestorable: (s) => !!s,
    _bootTourOwnsReload: () => tourOwns,
    _deferScreenUntilTour: (d) => calls.push(`defer:${d.orgView ? "org+" : ""}${d.service || ""}`),
    _waitForWm: async () => ({}),
    _restoreFloatingWindows: async () => calls.push("windows"),
    _restoreWorkspace: async () => { calls.push("workspace"); return true; },
    _openDefaultWorkspace: async () => { calls.push("default-workspace"); return true; },
    _landOnOrgView: async (...a) => calls.push(a[1] && a[1].firstOpen ? "org-view-first" : "org-view"),
    _restoreScreen: (service, onOpened) => { calls.push(`screen:${service}`); onOpened(); return Promise.resolve(); },
    _clearRestoreInFlight: () => {},
    _releaseLandingHold: () => calls.push("release-landing"),
    _settleHomeGrid: () => {},
  };
  return fn.call(self).then(() => calls);
}

test("back from Checkout: workspace restored, remembered Billing screen NOT replayed", async () => {
  const calls = await restoreWith({
    saved: { service: "upgrade-plan", workspace: { hub_id: "h1" } },
    checkoutBoot: true,
  });
  assert.deepEqual(calls, ["workspace"]);
});

test("back from Checkout: a remembered organisation screen is not replayed either", async () => {
  const calls = await restoreWith({ saved: { orgView: 1, workspace: { hub_id: "h1" } }, checkoutBoot: true });
  assert.deepEqual(calls, ["workspace"]);
});

test("back from Checkout with nothing saved: default workspace, no org-screen landing", async () => {
  const calls = await restoreWith({ saved: null, checkoutBoot: true });
  assert.deepEqual(calls, ["default-workspace", "release-landing"]);
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

test("tour still to do: the remembered screen is PARKED for after the tour, not opened at boot", async () => {
  for (const service of ["toggle-calendar", "toggle-inbox", "toggle-apps", "upgrade-plan"]) {
    const calls = await restoreWith({
      saved: { service, workspace: { hub_id: "h1" } },
      checkoutBoot: false,
      tourOwns: true,
    });
    assert.deepEqual(calls, ["workspace", `defer:${service}`], service);
  }
});

test("tour still to do: a remembered organisation screen (+ slide-out) is parked too", async () => {
  const calls = await restoreWith({
    saved: { orgView: 1, service: "toggle-trash", workspace: { hub_id: "h1" } }, checkoutBoot: false, tourOwns: true,
  });
  assert.deepEqual(calls, ["workspace", "defer:org+toggle-trash"]);
});

test("back from Checkout nothing is parked (the receipt owns that boot)", async () => {
  const calls = await restoreWith({ saved: { service: "upgrade-plan", workspace: { hub_id: "h1" } }, checkoutBoot: true, tourOwns: true });
  assert.deepEqual(calls, ["workspace"]);
});
