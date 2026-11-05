// tests/billing-open-lights-plan-and-busy.test.js — every way into Billing
// lights the rail's Plan row (`sidebar-plan`; the restore map pointed at a
// `sidebar-upgrade` part that does not exist), openBillingPage reports back
// to a caller that shows its own busy state, and "Proceed to Checkout" spins
// from the press until the page leaves for Stripe.
//
//   node --test tests/billing-open-lights-plan-and-busy.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const DESK_SRC = read("src/drumee/modules/desk/index.js");
const BILLING_SRC = read("src/drumee/builtins/widget/settings/account/billing/index.js");
const SIDEBAR_SRC = read("src/drumee/modules/desk/skeleton/sidebar.js");

function method(src, sig, scope = {}) {
  const names = Object.keys(scope);
  return new Function(...names, `return (${sliceFunction(src, sig)});`)(...names.map((n) => scope[n]));
}

// ── the Plan row ──────────────────────────────────────────────────────────────

test("the restore map names the Plan row the rail actually has", () => {
  assert.match(SIDEBAR_SRC, /"sidebar-plan"/);
  assert.match(DESK_SRC, /"upgrade-plan": "sidebar-plan"/);
  assert.doesNotMatch(DESK_SRC, /"sidebar-upgrade"/);
});

// ── openBillingPage ───────────────────────────────────────────────────────────

function openBilling(preselect) {
  const log = [];
  global.LOCALE = {};
  global.SERVICE = {};
  global.RADIO_BROADCAST = { trigger: () => {} };
  global.Kind = { waitFor: async () => true };
  const fn = method(DESK_SRC, "openBillingPage(preselect)");
  const self = {
    _showBillingLoader: () => log.push("loader-on"),
    _hideBillingLoader: () => log.push("loader-off"),
    togglePanel: async (kind, pn, a, opt) => { log.push(["toggle", opt]); return "settled"; },
    _lightRestoredRow: (s) => log.push(["light", s]),
  };
  return fn.call(self, preselect).then(() => log);
}

test("openBillingPage lights Plan once the page is open (plain open keeps its loader)", async () => {
  const log = await openBilling({ plan: "team" });
  assert.deepEqual(log, [
    "loader-on",
    ["toggle", { page: 1, plan: "team" }],
    ["light", "upgrade-plan"],
    "loader-off",
  ]);
});

test("onOpened / noLoader are for the caller only: no loader, callback after, never passed to the panel", async () => {
  let called = 0;
  const log = await openBilling({ plan: "team", tab: "checkout", noLoader: 1, onOpened: () => called++ });
  assert.deepEqual(log, [
    ["toggle", { page: 1, plan: "team", tab: "checkout" }],
    ["light", "upgrade-plan"],
  ]);
  assert.equal(called, 1);
});

// ── Proceed to Checkout busy ──────────────────────────────────────────────────

function proceed(result) {
  const el = { dataset: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
  const added = [];
  global.window = { addEventListener: (ev) => added.push(ev) };
  const fn = method(BILLING_SRC, "_proceedWithBusy(el)");
  let release;
  const self = { _proceedToCheckout: () => new Promise((r) => { release = r; }) };
  fn.call(self, el);
  return { el, added, finish: async (v) => { release(v); await new Promise((r) => setTimeout(r, 0)); } };
}

test("Proceed to Checkout spins from the press, and stops when the page stays", async () => {
  const { el, finish } = proceed();
  assert.equal(el.dataset.loading, "1");
  assert.equal(el.attrs["aria-busy"], "true");
  await finish(undefined); // subdomain taken / ALREADY_SUBSCRIBED / error
  assert.equal(el.dataset.loading, undefined);
  assert.equal(el.attrs["aria-busy"], undefined);
});

test("…and keeps spinning through the redirect to Stripe (cleared on a bfcache return)", async () => {
  const { el, added, finish } = proceed();
  await finish("redirect");
  assert.equal(el.dataset.loading, "1");
  assert.deepEqual(added, ["pageshow"]);
});

test("a second press while busy is dropped", () => {
  const el = { dataset: { loading: "1" }, setAttribute() {}, removeAttribute() {} };
  let runs = 0;
  const fn = method(BILLING_SRC, "_proceedWithBusy(el)");
  fn.call({ _proceedToCheckout: () => { runs++; } }, el);
  assert.equal(runs, 0);
});

test("the checkout chain is RETURNED and a Stripe URL resolves 'redirect'", () => {
  const body = sliceFunction(BILLING_SRC, "async _proceedToCheckout()");
  assert.match(body, /return this\.postService\(SERVICE\.payment\.checkout, payload\)/);
  assert.match(body, /if \(url\) \{ window\.location\.assign\(url\); return "redirect"; \}/);
});

// ── Billing page announces itself → Plan lit, every way in ───────────────────

test("the full-page Billing announces itself on render (page mode only)", () => {
  const body = sliceFunction(BILLING_SRC, "async onDomRefresh()");
  assert.match(body, /if \(this\._page\) RADIO_BROADCAST\.trigger\("desk:billing-page-shown"\);/);
});

test("the desk listens for it for its whole life, and unhooks on destroy", () => {
  assert.match(DESK_SRC, /RADIO_BROADCAST\.on\("desk:billing-page-shown", this\._onBillingPageShown\);/);
  assert.match(DESK_SRC, /RADIO_BROADCAST\.off\("desk:billing-page-shown", this\._onBillingPageShown\);/);
  assert.match(DESK_SRC, /this\._onBillingPageShown = \(\) => this\._lightRestoredRow\("upgrade-plan"\);/);
});

test("lighting 'upgrade-plan' broadcasts sidebar-radio for the sidebar-plan part", async () => {
  const lit = [];
  global.RADIO_BROADCAST = { trigger: (ch, p) => lit.push([ch, p.name]) };
  const fn = new Function("desk_module", `return (${sliceFunction(DESK_SRC, "_lightRestoredRow(service)")});`)(
    { _RESTORABLE_SCREENS: { "upgrade-plan": "sidebar-plan" } },
  );
  await fn.call({ ensurePart: async (pn) => ({ name: pn }) }, "upgrade-plan");
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(lit, [["sidebar-radio", "sidebar-plan"]]);
});

// ── THE DEAD BUTTONS (2026-11-05): Billing already open under the card ───────
// togglePanel's openOnly path ignores an open screen of the same kind, after
// dismissing the modal: the card vanished and the plans view stayed. An open
// Billing asked for something specific is now cleared and mounted again.

function openOnBilling({ pending = "settings_billing", preselect }) {
  const log = [];
  global.LOCALE = {};
  global.SERVICE = {};
  global.RADIO_BROADCAST = { trigger: () => {} };
  global.Kind = { waitFor: async () => true };
  const fn = method(DESK_SRC, "openBillingPage(preselect)");
  const self = {
    _pendingKinds: { "settings-main-slot": pending },
    _showBillingLoader() {}, _hideBillingLoader() {}, _lightRestoredRow() {},
    _clearOpenBilling: () => log.push("clear"),
    togglePanel: async (k, pn, a, opt) => { log.push(["toggle", opt]); },
  };
  return fn.call(self, preselect).then(() => log);
}

test("Use another card on an open Billing: cleared, then mounted with the checkout options", async () => {
  const log = await openOnBilling({ preselect: { plan: "team", cycle: "monthly", tab: "checkout", promo: "TEAM1", noLoader: 1 } });
  assert.deepEqual(log, ["clear", ["toggle", { page: 1, plan: "team", cycle: "monthly", tab: "checkout", promo: "TEAM1" }]]);
});

test("Continue at regular price on an open Billing: cleared, mounted with offer:decline", async () => {
  const log = await openOnBilling({ preselect: { plan: "team", cycle: "monthly", tab: "checkout", offer: "decline" } });
  assert.equal(log[0], "clear");
  assert.equal(log[1][1].offer, "decline");
});

test("a bare open of an already-open Billing leaves it alone", async () => {
  assert.deepEqual(await openOnBilling({ preselect: undefined }), [["toggle", { page: 1 }]]);
  assert.deepEqual(await openOnBilling({ preselect: { noTrack: 1, onOpened() {} } }), [["toggle", { page: 1 }]]);
});

test("Billing not open: nothing to clear", async () => {
  const log = await openOnBilling({ pending: "calendar_main", preselect: { plan: "team", tab: "checkout" } });
  assert.deepEqual(log, [["toggle", { page: 1, plan: "team", tab: "checkout" }]]);
});

test("_clearOpenBilling clears Billing only", () => {
  global._ = Object.assign(global._ || {}, { isFunction: (f) => typeof f === "function" });
  global._a = Object.assign(global._a || {}, { kind: "kind" });
  const fn = method(DESK_SRC, "_clearOpenBilling()");
  const run = (kind) => {
    let cleared = 0;
    const p = { isEmpty: () => false, clear: () => { cleared++; }, children: { last: () => ({ mget: () => kind, el: { dataset: {} } }) } };
    const self = { getPart: () => p, _pendingKinds: { "settings-main-slot": kind } };
    fn.call(self);
    return { cleared, pending: self._pendingKinds["settings-main-slot"] };
  };
  assert.deepEqual(run("settings_billing"), { cleared: 1, pending: null });
  assert.deepEqual(run("calendar_main"), { cleared: 0, pending: "calendar_main" });
});
