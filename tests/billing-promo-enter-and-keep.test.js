// tests/billing-promo-enter-and-keep.test.js — Billing › Checkout promo row:
// Enter applies the code like the Apply button, and the field keeps its text
// when the Current Plan / Billing Cycle pills are switched. Plus the
// Personal Calendar toolbar's left group order.
//
//   node --test tests/billing-promo-enter-and-keep.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const BILLING_SRC = read("src/drumee/builtins/widget/settings/account/billing/index.js");
const TOOLBAR_SRC = read("src/drumee/builtins/panel/calendar/skeleton/toolbar.js");

global._ = { isFunction: (f) => typeof f === "function" };
global._a = { input: "input", name: "name", service: "service" };

const method = (sig) => new Function(`return (${sliceFunction(BILLING_SRC, sig)});`)();
const fieldText = method("_promoFieldText()");
const restore = method("_restorePromoText(text, applied)");

// ── Enter applies ─────────────────────────────────────────────────────────────

test("Enter in the promo field calls the same apply as the Apply button", () => {
  const body = BILLING_SRC.slice(BILLING_SRC.indexOf("      case _a.input:"));
  const block = body.slice(0, body.indexOf("return this._handleInputField"));
  assert.match(block, /args\?\.key === "Enter" \|\| args\?\.__inputStatus === "Enter"/);
  assert.match(block, /if \(!co\.promo\?\.code && this\._promoFieldText\(\)\) this\._applyPromoCode\(\);/);
});

// ── the field keeps its text across pill switches ─────────────────────────────

test("_promoFieldText: live input first, then pending, then the applied code", () => {
  assert.equal(fieldText.call({ __promoCodeInput: { getValue: () => " team1 " }, state: { checkout: {} } }), "team1");
  assert.equal(fieldText.call({ state: { checkout: { promoPending: "ABC" } } }), "ABC");
  assert.equal(fieldText.call({ state: { checkout: { promoCode: "XYZ" } } }), "XYZ");
  assert.equal(fieldText.call({ __promoCodeInput: { getValue: () => "" }, state: { checkout: {} } }), "");
});

test("_restorePromoText: typed (unapplied) text comes back AND stays pending (Proceed blocked)", () => {
  const self = { state: { checkout: {} } };
  restore.call(self, "TEAM1", false);
  assert.equal(self.state.checkout.promoCode, "TEAM1");
  assert.equal(self.state.checkout.promoPending, "TEAM1");
});

test("_restorePromoText: an applied code comes back as text, not pending", () => {
  const self = { state: { checkout: {} } };
  restore.call(self, "TEAM1", true);
  assert.equal(self.state.checkout.promoCode, "TEAM1");
  assert.equal(self.state.checkout.promoPending, undefined);
});

test("_restorePromoText: a REMOVED code stays as text only — it must not block Proceed", () => {
  const self = { state: { checkout: {} }, _removedPromo: "team1" };
  restore.call(self, "TEAM1", false);
  assert.equal(self.state.checkout.promoCode, "TEAM1");
  assert.equal(self.state.checkout.promoPending, undefined);
});

test("_restorePromoText: empty field → nothing restored", () => {
  const self = { state: { checkout: {} } };
  restore.call(self, "", false);
  assert.deepEqual(self.state.checkout, {});
});

test("plan pill: keeps the text, re-applies an applied code against the new plan", () => {
  const body = BILLING_SRC.slice(BILLING_SRC.indexOf('      case "select-checkout-plan":'));
  const block = body.slice(0, body.indexOf('      case "select-billing-cycle":'));
  assert.match(block, /const typed = this\._promoFieldText\(\);/);
  assert.match(block, /this\._clearPromoPreview\(false\);\s*\n\s*this\._restorePromoText\(typed, wasApplied\);/);
  assert.match(block, /if \(wasApplied && typed\) \{[\s\S]*this\._applyPromoCode\(\)/);
});

test("cycle pill: an unapplied typed code is put back before the re-render", () => {
  const body = BILLING_SRC.slice(BILLING_SRC.indexOf('      case "select-billing-cycle":'));
  const block = body.slice(0, body.indexOf('      case "apply-promo-code":'));
  assert.match(block, /this\._restorePromoText\(this\._promoFieldText\(\), false\);\s*\n\s*\}\s*\n\s*this\.renderContent\(\);/);
});

// ── Calendar toolbar ──────────────────────────────────────────────────────────

test("calendar-main__toolbar-left: the ‹ Today › pill first, then the range label", () => {
  assert.match(TOOLBAR_SRC, /className: `\$\{pfx\}__toolbar-left`,[\s\S]{0,200}kids: \[nav, label\],/);
});
