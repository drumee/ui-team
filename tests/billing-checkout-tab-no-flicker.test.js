// The Checkout tab must never be painted and then taken away.
//
// THE REPORT (Lexis, 2026-09-16): "I open the Billing page and about five
// seconds later the Checkout option disappears from the tab slider" — on
// lexishoang.drumee.in, and going on for over a week.
//
// TRACED on stage: her org `12d3d4dc12d3d4e1` (domain 13, she is owner_id) has
// held a live Stripe subscription since 2026-09-10 —
// subscription_new.status='active', plan business, and yp.quota carries the
// matching business entitlement. So the tab is CORRECTLY withdrawn: a live
// subscriber has nothing left to buy self-serve and payment.checkout would
// answer ALREADY_SUBSCRIBED. The defect is that it was put on screen first.
//
// Why it was put there: _checkoutTabAllowed() reads _hasActiveSub, and only
// _loadSubscription() fills it. Until the mirror answers the flag is
// `undefined`, the gate reads "nothing is live", and the pill goes up — on a
// guess that is wrong for precisely the people who can never use it. 372a1dc8
// (2026-09-08) shortened the window from ~5 s to ~250 ms by no longer making
// the correcting render wait on the Stripe catalog; it could not close it.
//
// The guess does not have to be wrong. get_quota is tenant-first (verified on
// stage: CALL get_quota(<Lexis>) → business), so Visitor.quota() already names
// the ORGANISATION's plan synchronously, and _paidPlanSync() is that signal —
// the same stand-in the plan-card CTA has used since 2026-08-06.
//
// Both halves are tested against the SHIPPED source: the gate is lifted out of
// the widget file, and the pill is the real skeleton/header.js render.
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
const TAB_CHECKOUT = 2;

// Lift a no-argument method body out of the class so it runs without booting
// the widget. Every nested closer inside these three sits at four spaces or
// more, so `\n  }` is unambiguously the end of the method.
function body(name) {
  const m = SRC.match(new RegExp(`\\n {2}${name}\\(\\) \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`));
  assert.ok(m, `${name}() not found in ${WIDGET}`);
  return m[1];
}

// A billing widget carrying the REAL gate methods.
//
// `quotaPlan` is what Visitor.quota() answers — the client cache, available at
// first paint. `sub` is the subscription mirror, or null before it lands.
function widget({ quotaPlan = "free", sub = null, tab = TAB_MONTHLY, mayCheckout = true } = {}) {
  const gates = new Function(
    "TAB_CHECKOUT",
    "Visitor",
    `return {
       _checkoutTabAllowed() {${body("_checkoutTabAllowed")}},
       _checkoutTabVisible() {${body("_checkoutTabVisible")}},
       _paidPlanSync() {${body("_paidPlanSync")}},
     };`,
  )(TAB_CHECKOUT, { quota: () => ({ plan: quotaPlan }) });

  const ui = Object.assign(gates, {
    _id: "w1",
    fig: { family: "settings-billing" },
    state: { currentTab: tab, checkout: {}, plansTab: { cycle: "monthly" } },
    tab,
    _mayCheckout: () => mayCheckout,
    _motionClass: () => "",
    _yearlySavingPct: () => 0,
    _promoYearlyActive: () => false,
  });

  // Exactly what _loadSubscription() writes for these three flags. Left unset
  // while `sub` is null — that IS the pre-answer state the bug lived in, and
  // writing `false` here would test a widget that never exists.
  if (sub) {
    ui._subLoaded = true;
    ui._hasPaidSub = !!sub.subscription_id;
    ui._isPromoTrial = !!sub.promo_trial;
    ui._hasActiveSub = /^(active|trialing|past_due)$/.test(sub.status || "") || !!sub.promo_trial;
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

const hasCheckout = (ui) => pills(ui).includes("checkout");

test("a live subscriber never sees the Checkout pill at all — not even for a moment", () => {
  // Lexis's account as stage holds it: quota says business (tenant-first
  // get_quota), and the mirror will say active. FIRST PAINT, mirror still in
  // flight — this is the render that used to show the pill.
  const first = widget({ quotaPlan: "business" });
  assert.equal(hasCheckout(first), false,
    "the pill was painted before the subscription mirror answered");

  // ...and the corrected render agrees, so nothing is withdrawn in between.
  const settled = widget({
    quotaPlan: "business",
    sub: { subscription_id: "sub_1UDzoUDjnMxCeY36FtmuKVYZ", status: "active" },
  });
  assert.equal(hasCheckout(settled), false);

  // The tab bar still has its two plan pills — this hides one pill, not the bar.
  assert.deepEqual(pills(first), ["select-plan", "select-plan"]);
});

test("a free account keeps the Checkout pill from the first frame — no late pop-in", () => {
  const first = widget({ quotaPlan: "free" });
  assert.deepEqual(pills(first), ["select-plan", "select-plan", "checkout"]);

  // Mirror lands with nothing live: unchanged. The overwhelming majority of
  // page loads are this one, and they must not gain a layout shift.
  const settled = widget({ quotaPlan: "free", sub: {} });
  assert.deepEqual(pills(settled), ["select-plan", "select-plan", "checkout"]);
});

test("the stand-in only WITHHOLDS a pill — it can never add one", () => {
  // Cannot buy here (not the org owner / upgrades off): refused either way,
  // whatever the cached quota says.
  assert.equal(hasCheckout(widget({ quotaPlan: "free", mayCheckout: false })), false);
  assert.equal(hasCheckout(widget({ quotaPlan: "business", mayCheckout: false })), false);
});

test("a checkout deep link keeps its pill while the mirror is in flight", () => {
  // _applyDeepLink opens the tab optimistically, before the mirror answers.
  // Paying the content out with no pill above it would be a worse screen than
  // the one this fixes; _settleDeepLinkTab steps the tab back down after.
  const ui = widget({ quotaPlan: "business", tab: TAB_CHECKOUT });
  assert.equal(hasCheckout(ui), true);
});

test("a comped / LAUNCH30 grant gets its pill back once the mirror answers", () => {
  // Paid by quota with NO Stripe subscription — a hand-granted staff tier, or
  // a LAUNCH30 trial. Quota is a superset of "has a subscription", so the
  // stand-in withholds the pill for the round trip...
  assert.equal(hasCheckout(widget({ quotaPlan: "team" })), false);
  // ...and the mirror hands it straight back. Late, not lost.
  assert.equal(hasCheckout(widget({ quotaPlan: "team", sub: {} })), true);
  // A LAUNCH30 trial keeps checkout open on purpose (convert with a partner
  // code), and _checkoutTabAllowed's own promo branch is what says so.
  assert.equal(hasCheckout(widget({ quotaPlan: "team", sub: { promo_trial: true } })), true);
});

test("eligibility itself is untouched — the guards still refuse a live subscriber", () => {
  // _checkoutTabVisible must not have loosened the gate the click handlers,
  // the deep link and the upgrade intent all read.
  const live = widget({
    quotaPlan: "business",
    sub: { subscription_id: "sub_x", status: "active" },
  });
  assert.equal(live._checkoutTabAllowed(), false);

  // A replacement the user already confirmed is the one admitted case, and it
  // survives the visibility gate too.
  live.state.checkout.supersede = true;
  assert.equal(live._checkoutTabAllowed(), true);
  assert.equal(hasCheckout(live), true);

  // Before the mirror lands the gate is unchanged as well: it is the pill that
  // got a second opinion, not eligibility.
  assert.equal(widget({ quotaPlan: "business" })._checkoutTabAllowed(), true);
});

test("the header falls back to the pill when handed a ui without the gate", () => {
  const ui = widget({ quotaPlan: "business" });
  delete ui._checkoutTabVisible;
  assert.equal(hasCheckout(ui), true);
});
