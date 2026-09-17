// The Checkout tab must never be taken away from the user.
//
// THE REPORT (Lexis, 2026-09-16, lexishoang.drumee.in): "I open the Billing
// page and the Checkout option disappears from the tab slider." Her org has
// held a live Stripe subscription since 2026-09-10 (subscription_new
// status='active', plan business), and the tab used to be withdrawn the moment
// that mirror landed -- `_checkoutTabAllowed()` read `_hasActiveSub`, which
// only `_loadSubscription()` fills, so the tab could only be removed AFTER it
// had been offered. Making it move faster (372a1dc8) was not a fix; a tab that
// moves under the user is the defect.
//
// So the tier gate moved off the TAB and onto the BUTTON that spends money.
// These tests lock both halves, and they matter in opposite directions:
//
//   the tab   must be UNCONDITIONAL on anything fetched -- that is what makes
//             "it disappeared" impossible rather than merely unlikely;
//   the money must still be guarded -- a live subscriber may not start a plain
//             second checkout, only a confirmed REPLACEMENT (`supersede`),
//             which is the one thing payment.checkout admits.
//
// Both are exercised against the SHIPPED source: the gate and the whole
// _proceedToCheckout body are lifted out of the widget file, and the pill is
// the real skeleton/header.js render.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { installGlobals, walk } = require("./helpers/render-skeleton.js");
const { requireEsmish } = require("./helpers/load-esmish.js");

const WIDGET = "src/drumee/builtins/widget/settings/account/billing/index.js";
const HEADER = "src/drumee/builtins/widget/settings/account/billing/skeleton/header.js";
const SRC = readFileSync(join(__dirname, "..", WIDGET), "utf8");
const TAB_MONTHLY = 0;

// Lift a method body out of the class so it runs without booting the widget.
// Every nested closer inside these sits at four spaces or more, so `\n  }` is
// unambiguously the end of the method.
function body(name, async_ = false) {
  const head = async_ ? "async " : "";
  const m = SRC.match(new RegExp(`\\n {2}${head}${name}\\(\\) \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`));
  assert.ok(m, `${name}() not found in ${WIDGET}`);
  return m[1];
}

// ---------------------------------------------------------------- the TAB --

// A billing widget carrying the REAL _checkoutTabAllowed.
function widget({ mayCheckout = true, sub = null, quotaPlan = "free" } = {}) {
  const gates = new Function(
    "Visitor",
    `return { _checkoutTabAllowed() {${body("_checkoutTabAllowed")}} };`,
  )({ quota: () => ({ plan: quotaPlan }) });

  const ui = Object.assign(gates, {
    _id: "w1",
    fig: { family: "settings-billing" },
    state: { currentTab: TAB_MONTHLY, checkout: {}, plansTab: { cycle: "monthly" } },
    tab: TAB_MONTHLY,
    _mayCheckout: () => mayCheckout,
    _motionClass: () => "",
    _yearlySavingPct: () => 0,
    _promoYearlyActive: () => false,
  });
  // Exactly what _loadSubscription() writes. Left UNSET while `sub` is null --
  // that is the pre-answer state the bug lived in, and writing `false` here
  // would test a widget that never exists.
  if (sub) {
    ui._subLoaded = true;
    ui._hasPaidSub = !!sub.subscription_id;
    ui._isPromoTrial = !!sub.promo_trial;
    ui._hasActiveSub =
      /^(active|trialing|past_due)$/.test(sub.status || "") || !!sub.promo_trial;
  }
  return ui;
}

// Which pills the REAL header skeleton emits, by their `service`.
function pills(ui) {
  const restore = installGlobals();
  try {
    const tree = requireEsmish(HEADER).default(ui);
    const out = [];
    for (const n of walk(tree)) {
      if (typeof n.className === "string"
        && n.className.split(/\s+/).includes(`${ui.fig.family}__tabs-trigger-item`)) {
        out.push(n.service);
      }
    }
    return out;
  } finally {
    restore();
  }
}

const ALL_THREE = ["select-plan", "select-plan", "checkout"];
const LIVE_BUSINESS = { subscription_id: "sub_1UDzoUDjnMxCeY36FtmuKVYZ", status: "active" };

test("a live subscriber keeps the Checkout pill — before AND after the mirror lands", () => {
  // Lexis's account. The first render is the one the old code got right and
  // the second is the one that used to take the tab away.
  assert.deepEqual(pills(widget({ quotaPlan: "business" })), ALL_THREE);
  assert.deepEqual(pills(widget({ quotaPlan: "business", sub: LIVE_BUSINESS })), ALL_THREE);
});

test("the pill survives every subscription state the mirror can report", () => {
  // Whatever comes back, the tab bar is identical. This is the property the
  // report is really about: nothing the server says may remove the tab.
  for (const sub of [
    null,                                                   // still in flight
    {},                                                     // no subscription
    LIVE_BUSINESS,                                          // active
    { subscription_id: "s", status: "trialing" },
    { subscription_id: "s", status: "past_due" },           // dunning
    { subscription_id: "s", status: "canceled" },           // lapsed / pending
    { promo_trial: true },                                  // LAUNCH30, no Stripe row
  ]) {
    assert.deepEqual(pills(widget({ quotaPlan: "business", sub })), ALL_THREE,
      `pill lost for sub=${JSON.stringify(sub)}`);
  }
});

test("the gate reads NOTHING that arrives over the network", () => {
  // The shape lock. A tab can only disappear if its gate depends on something
  // that is unknown at first paint, so the gate must not name any of these --
  // this is the assertion that would have caught the original bug, and it is
  // what stops it being reintroduced.
  const gate = body("_checkoutTabAllowed");
  for (const flag of ["_hasActiveSub", "_hasPaidSub", "_isPromoTrial", "_subLoaded",
    "_subscription", "_canBuy", "_paidPlanSync"]) {
    assert.ok(!gate.includes(flag),
      `_checkoutTabAllowed() must not depend on ${flag} — that is how the tab vanished`);
  }
});

test("the pill is still withheld from someone who may not buy here at all", () => {
  // The one legitimate reason to have no Checkout tab: this deployment does
  // not sell plans, or this caller is not the org owner. Decided synchronously
  // (libs/billing canUpgradePlan), so it too cannot flicker.
  assert.deepEqual(pills(widget({ mayCheckout: false })), ["select-plan", "select-plan"]);
  assert.deepEqual(pills(widget({ mayCheckout: false, sub: LIVE_BUSINESS })),
    ["select-plan", "select-plan"]);
});

// -------------------------------------------------------------- the MONEY --

// `this` for the lifted _proceedToCheckout. Records what it actually did.
function payer({ sub = null, supersede = false, plan = "business", cycle = "monthly" } = {}) {
  const log = [];
  const ui = {
    log,
    state: {
      currentTab: 2,
      checkout: { selectedPlan: plan, billingCycle: cycle, ...(supersede ? { supersede: 1 } : {}) },
      plansTab: { cycle },
    },
    _subscription: sub,
    _hasPaidSub: !!(sub && sub.subscription_id),
    _hasActiveSub: !!(sub && (/^(active|trialing|past_due)$/.test(sub.status || "") || sub.pending_cancel)),
    _confirmReplacePlan(p, period) { log.push(`confirm-replace:${p}:${period}`); },
    postService(service, payload) {
      log.push(`POST ${service} ${JSON.stringify(payload)}`);
      return Promise.resolve({ status: "OK" });
    },
    warn() {},
    isDestroyed: () => false,
    renderContent() {},
    _loadSubscription: () => Promise.resolve(null),
    _orgIdentError: () => "err",
  };
  const run = new Function(
    "SERVICE", "Visitor", "LOCALE", "Wm", "TAB_MONTHLY",
    `return async function () {\n${body("_proceedToCheckout", true)}\n};`,
  )(
    { payment: { checkout: "payment.checkout" } },
    { id: "u1", get: (k) => (k === "domain_id" ? 13 : "") },   // inside an org: no bootstrap branch
    new Proxy({}, { get: (_t, k) => String(k) }),
    { alert: (m) => log.push(`ALERT ${m}`) },
    TAB_MONTHLY,
  );
  return { ui, run: () => run.call(ui) };
}

const posted = (log) => log.filter((l) => l.startsWith("POST"));

test("a live subscriber pressing Pay is asked to confirm the replacement — nothing is bought", async () => {
  // The guard the hidden tab used to provide, now on the button. The buyer
  // must read "your current plan will be canceled immediately" and accept it
  // BEFORE a checkout session exists.
  const { ui, run } = payer({ sub: { subscription_id: "s", plan: "business", period: "month", status: "active" }, plan: "team" });
  await run();
  assert.deepEqual(ui.log, ["confirm-replace:team:month"]);
  assert.equal(posted(ui.log).length, 0, "a live subscriber must not reach payment.checkout unconfirmed");
});

test("buying the exact plan and cycle already held is refused, with a reason", async () => {
  // The Checkout tab opens with the caller's CURRENT plan preselected, so this
  // is the very first thing Lexis can do on it. It must say something.
  const { ui, run } = payer({
    sub: { subscription_id: "s", plan: "business", period: "month", status: "active" },
    plan: "business", cycle: "monthly",
  });
  await run();
  assert.deepEqual(ui.log, ["ALERT ALREADY_SUBSCRIBED"]);
  assert.equal(posted(ui.log).length, 0);
});

test("once the replacement is confirmed, the checkout carries supersede", async () => {
  const { ui, run } = payer({
    sub: { subscription_id: "s", plan: "business", period: "month", status: "active" },
    plan: "team", supersede: true,
  });
  await run();
  const [post] = posted(ui.log);
  assert.ok(post, ui.log.join(" | "));
  const payload = JSON.parse(post.replace("POST payment.checkout ", ""));
  assert.equal(payload.supersede, 1, "the webhook only cancels the replaced sub when this is set");
  assert.equal(payload.plan, "team");
  // Still refused even WITH supersede when it would buy the same thing twice.
  const same = payer({
    sub: { subscription_id: "s", plan: "business", period: "month", status: "active" },
    plan: "business", cycle: "monthly", supersede: true,
  });
  await same.run();
  assert.equal(posted(same.ui.log).length, 0);
  assert.deepEqual(same.ui.log, ["ALERT ALREADY_SUBSCRIBED"]);
});

test("a pending-cancel or past-due subscriber is a replacement too, not a second buy", async () => {
  for (const sub of [
    { subscription_id: "s", plan: "business", period: "month", status: "past_due" },
    { subscription_id: "s", plan: "business", period: "month", status: "canceled", pending_cancel: 1 },
  ]) {
    const { ui, run } = payer({ sub, plan: "team" });
    await run();
    assert.deepEqual(ui.log, ["confirm-replace:team:month"], JSON.stringify(sub));
  }
});

test("a first purchase is untouched — no confirm, straight to checkout", async () => {
  // Nobody without a live Stripe mirror may be sent through a replacement
  // warning for a subscription they do not have.
  const cases = {
    "no subscription at all": null,
    "LAUNCH30 trial (paid by quota, no Stripe row)": { plan: "team" },
    "a lapsed mirror row left behind": { subscription_id: "s", plan: "team", period: "month", status: "canceled" },
  };
  for (const [name, sub] of Object.entries(cases)) {
    const { ui, run } = payer({ sub, plan: "business" });
    await run();
    const [post] = posted(ui.log);
    assert.ok(post, `${name}: expected a plain checkout, got ${ui.log.join(" | ")}`);
    const payload = JSON.parse(post.replace("POST payment.checkout ", ""));
    assert.equal(payload.supersede, undefined, `${name}: must not claim a supersede`);
    assert.equal(payload.plan, "business");
    assert.ok(!ui.log.some((l) => l.startsWith("confirm-replace")), `${name}: nothing to replace`);
  }
});
