// tests/offer-card-used-modal.test.js — back from a TEAM1 Checkout with a card
// that already redeemed the offer, payment.checkout_result answers
// OFFER_CARD_USED. That used to be a red "Payment Failure!" whose only button
// opened the plain billing page. It now gets its own card: "Offer already used
// on this card", with "Use another card" (same checkout, offer kept) and
// "Continue at regular price" (same checkout, offer declined).
//
//   node --test tests/offer-card-used-modal.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const RESULT_SRC = read("src/drumee/builtins/widget/settings/account/billing/result/index.js");
const BILLING_SRC = read("src/drumee/builtins/widget/settings/account/billing/index.js");
const SKELETON_SRC = read("src/drumee/builtins/widget/settings/account/billing/result/skeleton/index.js");
const { offerStatusMessage } = require("../src/drumee/builtins/widget/settings/account/billing/offer-status");

// eslint-disable-next-line no-extend-native
String.prototype.format = function (...a) { return this.replace(/\{(\d)\}/g, (m, i) => a[i]); };
global.LOCALE = {};
global._a = { service: "service" };

function method(src, sig, scope = {}) {
  const names = Object.keys(scope);
  return new Function(...names, `return (${sliceFunction(src, sig)});`)(...names.map((n) => scope[n]));
}

// ── result widget: which state the receipt puts it in ─────────────────────────

async function refreshWith(receipt) {
  const fed = [];
  const fn = method(RESULT_SRC, "async onDomRefresh()", {
    offerStatusMessage,
    require: (m) => {
      if (m === "libs/checkout-return") return { setModalOpen() {} };
      if (m === "./skeleton") return { default: () => "skeleton" };
      throw new Error(`unexpected require ${m}`);
    },
  });
  global.SERVICE = { payment: { checkout_result: "payment.checkout_result" } };
  global.Visitor = { id: "u1" };
  const self = {
    _result: "success",
    _sessionId: "cs_1",
    _stampDesk() {},
    _installBackdropDismiss() {},
    fetchService: async () => receipt,
    feed: (x) => fed.push(x),
  };
  await fn.call(self);
  return self;
}

test("OFFER_CARD_USED gets its own state, with the code, plan and cycle to reopen", async () => {
  const self = await refreshWith({
    status: "OFFER_CARD_USED", payment_status: "unpaid", offer_code: "TEAM1", plan: "team", period: "month",
  });
  assert.equal(self._result, "offer_card_used");
  assert.deepEqual(self._offer, { code: "TEAM1", plan: "team", cycle: "monthly" });
});

test("a yearly session reopens yearly; a server without plan/period falls back to Team monthly", async () => {
  const yearly = await refreshWith({ status: "OFFER_CARD_USED", offer_code: "X1", plan: "business", period: "year" });
  assert.deepEqual(yearly._offer, { code: "X1", plan: "business", cycle: "yearly" });
  const bare = await refreshWith({ status: "OFFER_CARD_USED", payment_status: "unpaid", offer_code: "TEAM1" });
  assert.deepEqual(bare._offer, { code: "TEAM1", plan: "team", cycle: "monthly" });
});

test("the other offer refusals keep the Payment Failure card with their reason", async () => {
  const self = await refreshWith({ status: "OFFER_DOMAIN_USED", payment_status: "unpaid" });
  assert.equal(self._result, "cancel");
  assert.match(self._failReason, /company/);
});

// ── result widget: the two buttons ────────────────────────────────────────────

function clickReopen(regular, offer) {
  const handled = [];
  const opened = [];
  const left = [];
  global.RADIO_BROADCAST = { trigger: (ev, opt) => opened.push([ev, opt]) };
  const busy = [];
  const fn = method(RESULT_SRC, "_reopenOfferCheckout(regular, el)", {
    require: (m) => {
      if (m === "libs/checkout-return") return { leftForBilling: () => left.push(handled.length) };
      if (m === "libs/button-busy") {
        return {
          withButtonBusy: async (el, run) => { busy.push("on"); try { return await run(); } finally { busy.push("off"); } },
        };
      }
      throw new Error(`unexpected require ${m}`);
    },
  });
  const self = { _offer: offer, triggerHandlers: (a) => handled.push(a.service), isDestroyed: () => false };
  const p = fn.call(self, regular, { dataset: {} });
  return { handled, opened, left, busy, p };
}

const strip = ([ev, { onOpened, ...rest }]) => [ev, rest, typeof onOpened];

test("Use another card: spins, opens the same checkout WITH the code, closes once Billing is open", async () => {
  const { handled, opened, left, busy, p } = clickReopen(false, { code: "TEAM1", plan: "team", cycle: "monthly" });
  assert.deepEqual(left, [0], "marked as a departure for Billing first");
  assert.deepEqual(handled, [], "modal stays up while Billing loads");
  assert.deepEqual(busy, ["on"]);
  assert.deepEqual(opened.map(strip), [["desk:open-billing-page",
    { plan: "team", cycle: "monthly", tab: "checkout", promo: "TEAM1", noLoader: 1 }, "function"]]);
  opened[0][1].onOpened(); // the desk reports the page open
  await p;
  assert.deepEqual(busy, ["on", "off"]);
  assert.deepEqual(handled, ["billing-result-close"]);
});

test("Continue at regular price: same checkout, offer declined, no code", async () => {
  const { opened, p } = clickReopen(true, { code: "TEAM1", plan: "team", cycle: "monthly" });
  assert.deepEqual(opened.map(strip), [["desk:open-billing-page",
    { plan: "team", cycle: "monthly", tab: "checkout", offer: "decline", noLoader: 1 }, "function"]]);
  opened[0][1].onOpened();
  await p;
});

// ── billing page: `offer: "decline"` stops the pending offer coming back ──────

function applyDeepLink(opt) {
  const fn = method(BILLING_SRC, "_applyDeepLink(opt)", { TAB_CHECKOUT: "checkout", TAB_MONTHLY: "monthly", TAB_YEARLY: "yearly" });
  const self = { state: { plansTab: {}, checkout: {} } };
  fn.call(self, opt);
  return self;
}

test("billing deep link with offer:decline marks the offer declined and seeds no code", () => {
  const self = applyDeepLink({ plan: "team", cycle: "monthly", tab: "checkout", offer: "decline" });
  assert.equal(self._offerDeclined, true);
  assert.equal(self.state.checkout.promoCode, undefined);
  assert.equal(self.state.currentTab, "checkout");
  assert.equal(self.state.checkout.selectedPlan, "team");
});

test("billing deep link with the promo keeps the offer and seeds the code", () => {
  const self = applyDeepLink({ plan: "team", cycle: "monthly", tab: "checkout", promo: "TEAM1" });
  assert.notEqual(self._offerDeclined, true);
  assert.equal(self.state.checkout.promoCode, "TEAM1");
});

// ── skeleton: what the card shows and which services its buttons raise ────────

test("the card shows the notice, the code, and both actions", () => {
  const box = (o) => o;
  global.Skeletons = {
    Box: { X: box, Y: box },
    Note: box,
    Image: { Svg: box },
  };
  const src = SKELETON_SRC.replace(/export default billing_result;\s*$/, "module.exports = billing_result;");
  const mod = { exports: {} };
  new Function("module", "exports", src)(mod, mod.exports);
  const tree = mod.exports({ fig: { family: "settings-billing-result" }, _result: "offer_card_used", _offer: { code: "TEAM1" } });
  const flat = [];
  const walk = (n) => { if (!n) return; flat.push(n); (n.kids || []).forEach(walk); };
  walk(tree);
  const services = flat.map((n) => n.service).filter(Boolean);
  assert.deepEqual(services, ["billing-result-close", "billing-result-offer-other-card", "billing-result-offer-regular-price"]);
  const text = flat.map((n) => n.content).filter(Boolean).join(" | ");
  assert.match(text, /Offer already used on this card/);
  assert.match(text, /TEAM1 can be used once per card/);
  assert.match(text, /Nothing was charged/);
  assert.match(text, /Use another card/);
  assert.match(text, /Continue at regular price/);
  assert.ok(flat.some((n) => /__icon notice/.test(n.className || "")), "amber notice icon, not the failure cross");
  assert.ok(!/Payment Failure/.test(text));
});
