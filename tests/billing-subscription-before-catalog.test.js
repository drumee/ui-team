// Billing must correct itself on the SUBSCRIPTION, not on the Stripe catalog.
//
// THE REPORT (2026-09-08): "open the billing page, 5s later the checkout
// button disappears — it shows the account on Free first, then updates to
// Business."
//
// onDomRefresh paints instantly from Visitor.quota() (a client cache) and then
// re-renders once the server answers. Both server reads were awaited together:
//
//   await Promise.all([ payment.catalog, this._loadSubscription() ])
//
// so the correcting render ran at the pace of the SLOWER one, and the two are
// nothing alike. _loadSubscription is a DB read (~250ms measured on stage);
// payment.catalog walks the plan rows and asks Stripe for each price one after
// another — 8 sequential prices.retrieve calls, ~2s on stage and a live
// third-party round trip, so several seconds is normal.
//
// The subscription is what settles the two things first paint can only guess:
// which plan is current, and whether the Checkout tab may be entered at all
// (_checkoutTabAllowed reads _hasActiveSub, which _loadSubscription fills). So
// a subscriber sat looking at the wrong plan next to a live Checkout tab for
// seconds, and then watched both change under them.
//
// These run the real onDomRefresh body against a stub `this`, with the two
// fetches resolved in a controlled order.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const WIDGET = "src/drumee/builtins/widget/settings/account/billing/index.js";
const SRC = join(__dirname, "..", WIDGET);
const SERVICE = { payment: { catalog: "payment.catalog" } };
const TAB_MONTHLY = 0;

// Lift the method body out of the class so it runs without booting the widget.
function loadMount() {
  const src = readFileSync(SRC, "utf8");
  const m = src.match(/\n {2}async onDomRefresh\(\) \{\n([\s\S]*?)\n {2}\}\n/);
  assert.ok(m, "onDomRefresh not found");
  return new Function(
    "SERVICE",
    "Visitor",
    "Desk",
    "document",
    "TAB_MONTHLY",
    `return async function () {\n${m[1]}\n};`,
  )(SERVICE, { id: "u1" }, undefined, { addEventListener() {} }, TAB_MONTHLY);
}

// A deferred promise, so the test decides when each read lands.
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

// `this` for the lifted body. `log` records every render and every read, in
// the order they actually happen.
function widget({ catalog, subscription }) {
  return {
    log: [],
    state: { currentTab: TAB_MONTHLY, checkout: {}, plansTab: { cycle: "monthly" } },
    _catalog: null,
    isDestroyed: () => false,
    _armMotion() {},
    _settleDeepLinkTab() { this.log.push("settle"); },
    fetchPlanData() { this.log.push(`render(catalog=${this._catalog ? "yes" : "no"})`); },
    fetchService(service) {
      this.log.push(`fetch:${service}`);
      return catalog;
    },
    _loadSubscription() {
      this.log.push("fetch:subscription_status");
      return subscription.then((v) => { this.log.push("subscription-landed"); return v; });
    },
  };
}

test("the correcting render does not wait on the Stripe catalog", async () => {
  const cat = deferred();
  const sub = deferred();
  const ui = widget({ catalog: cat.promise, subscription: sub.promise });
  const done = loadMount().call(ui);

  // The subscription answers first, as it does in production.
  sub.resolve({});
  await new Promise((r) => setImmediate(r));

  // A render has already happened, and it settled the checkout-tab verdict —
  // with the catalog still in flight. THIS is the assertion the bug broke:
  // before the fix the log stopped at the two fetches.
  assert.ok(ui.log.includes("settle"),
    `deep-link tab not settled on the subscription: ${ui.log.join(" -> ")}`);
  assert.equal(ui.log.filter((l) => l.startsWith("render")).length, 2,
    `expected first paint + the subscription render, got: ${ui.log.join(" -> ")}`);
  assert.ok(ui.log.indexOf("subscription-landed") < ui.log.lastIndexOf("render(catalog=no)"),
    `the correcting render must follow the subscription: ${ui.log.join(" -> ")}`);

  cat.resolve({ plans: [{ plan_code: "team", period: "month", amount: 2900 }] });
  await done;

  // The catalog still lands, and still gets its own render with the prices in.
  assert.deepEqual(ui._catalog, [{ plan_code: "team", period: "month", amount: 2900 }]);
  assert.ok(ui.log.includes("render(catalog=yes)"),
    `the catalog must still re-render the prices: ${ui.log.join(" -> ")}`);
});

test("both reads are started before either is awaited", async () => {
  const cat = deferred();
  const sub = deferred();
  const ui = widget({ catalog: cat.promise, subscription: sub.promise });
  loadMount().call(ui);
  await new Promise((r) => setImmediate(r));

  // Concurrency is the half of the old Promise.all worth keeping: making the
  // catalog wait for the subscription would just move the stall.
  assert.ok(ui.log.includes("fetch:payment.catalog"), ui.log.join(" -> "));
  assert.ok(ui.log.includes("fetch:subscription_status"), ui.log.join(" -> "));

  cat.resolve(null);
  sub.resolve({});
});

test("a widget torn down mid-flight renders nothing more", async () => {
  const cat = deferred();
  const sub = deferred();
  const ui = widget({ catalog: cat.promise, subscription: sub.promise });
  const done = loadMount().call(ui);
  ui.isDestroyed = () => true;

  sub.resolve({});
  cat.resolve(null);
  await done;

  // Only the synchronous first paint; feeding a destroyed widget is a leak.
  assert.equal(ui.log.filter((l) => l.startsWith("render")).length, 1,
    ui.log.join(" -> "));
});
