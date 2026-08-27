// The campaign CTA's coupon, from the URL to preview_coupon.
//
// The segment mails (analytics-server segment-a/b-101/102-contacts) send a link
// straight to Team checkout with a partner code already in it:
//
//   #/desk/billing?plan=team&cycle=monthly&tab=checkout&promo=EMAILMKT270826_2
//
// Three hops carry that code, and each one can drop it silently:
//
//   1. parseParams  — an ALLOWLIST. A key missing here is dropped before arm()
//                     stores it, so it is lost across the sign-in reload too,
//                     which is the path most of these recipients take.
//   2. _applyDeepLink — seeds the field. Must NOT claim the code is applied.
//   3. _autoApplyDeepLinkPromo — asks the server, once, and only on a screen
//                     that still has a checkout on it.
//
// Nothing fails loudly at any hop. The reader simply lands on a checkout with
// no code, or — worse, and the case case 2 below exists for — a code sitting in
// the box next to a full-price total that looks applied and is not.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = (p) => readFileSync(join(__dirname, "..", p), "utf8");

/**
 * Source with comments removed.
 *
 * This codebase explains at length, and both files here name the very strings
 * asserted about — `promo`, `checkout.promo`, `TAB_CHECKOUT`. A raw search
 * finds the prose and reports the code correct whatever it does; the same trap
 * campaign-capture-order.test.js documents.
 */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const LIB = SRC("src/drumee/libs/billing-deep-link.js");
const WIDGET = SRC("src/drumee/builtins/widget/settings/account/billing/index.js");

/**
 * One function or method, lifted whole from a source file.
 *
 * The closing brace is matched at the DECLARATION'S OWN INDENTATION — `\n  }`
 * for a class method, `\n}` for a top-level function. A single terminator does
 * not work for both: parseParams is top-level and contains a try/catch, so
 * slicing it at the class-method brace cut it mid-block and it would not
 * compile. That is what this argument exists for.
 */
function methodBody(src, sig, close = "\n  }") {
  const i = src.indexOf(sig);
  assert.ok(i > 0, `${sig} not found`);
  const end = src.indexOf(close, i);
  assert.ok(end > i, `${sig} has no closing brace at its own indentation`);
  return src.slice(i, end + close.length);
}

// ── hop 1: parseParams forwards the coupon ─────────────────────────────
//
// BEHAVIOURAL — the real function, run against a stubbed location. The
// allowlist is one array literal, and an assertion that only reads it would
// pass against a function that built `out` some other way.
function parseWith(hash) {
  const body = methodBody(LIB, "function parseParams()", "\n}");
  // The whole declaration, then called — rather than re-wrapping its body,
  // which loses the brace balance of the try/catch inside it.
  const fn = new Function("window", "URLSearchParams", "console",
    `${body}\nreturn parseParams();`);
  return fn({ location: { hash } }, URLSearchParams, console);
}

test("parseParams carries promo alongside plan/cycle/tab", () => {
  const out = parseWith(
    "#/desk/billing?plan=team&cycle=monthly&tab=checkout&promo=EMAILMKT270826_2");
  assert.equal(out.plan, "team");
  assert.equal(out.cycle, "monthly");
  assert.equal(out.tab, "checkout");
  assert.equal(out.promo, "EMAILMKT270826_2",
    "the coupon is dropped at the first hop — and with it, across sign-in");
});

test("a promo-only link still yields the coupon", () => {
  assert.equal(parseWith("#/desk/billing?promo=ABC123").promo, "ABC123");
});

test("a link with no preselect yields nothing", () => {
  assert.deepEqual(parseWith("#/desk/billing"), {});
});

test("parseParams stays an allowlist", () => {
  // It runs before any module exists and its result goes straight to
  // sessionStorage, so an unknown key must not ride along.
  const out = parseWith("#/desk/billing?promo=OK&evil=1&plan=team");
  assert.equal(out.evil, undefined, "parseParams forwards arbitrary keys");
  assert.deepEqual(Object.keys(out).sort(), ["plan", "promo"]);
});

// ── hop 2: the widget seeds the field, and only the field ──────────────
const applyDeepLink = stripComments(methodBody(WIDGET, "_applyDeepLink(opt) {"));

test("the coupon is shape-checked in the widget, not in the lib", () => {
  // The lib stays dumb by design; validation belongs here.
  assert.match(applyDeepLink, /\[A-Za-z0-9_-\]\{1,64\}/,
    "no shape check on the coupon — a malformed param would reach preview_coupon");
  assert.ok(!/\[A-Za-z0-9_-\]/.test(stripComments(LIB)),
    "the lib started validating values — that is _applyDeepLink's job");
});

test("_applyDeepLink seeds promoCode and NOT promo", () => {
  // THE CASE THIS FILE IS NAMED FOR. `checkout.promo` means "previewed and
  // accepted by the server" and draws the Applied chip and the discounted
  // total. Writing it from a URL shows a reader a discount nothing has agreed
  // to, and they find out at the charge.
  assert.match(applyDeepLink, /this\.state\.checkout\.promoCode = promo/,
    "the coupon never reaches the field");
  assert.ok(!/state\.checkout\.promo\s*=/.test(applyDeepLink),
    "_applyDeepLink writes checkout.promo — that claims a server preview it never asked for");
});

test("a promo-only link is not dropped by the early return", () => {
  const guard = /if \(!plan && !cycle && !tab([^)]*)\) return;/.exec(applyDeepLink);
  assert.ok(guard, "the preselect early-return is gone");
  assert.match(guard[1], /&& !promo/,
    "a link carrying only a coupon returns early — dropped one hop after the lib carried it");
});

test("the auto-apply flag is armed only by a deep link", () => {
  assert.match(applyDeepLink, /this\._deepLinkPromo = promo/,
    "nothing arms the auto-apply");
  const others = WIDGET.split("_applyDeepLink(opt) {")[0]
    + stripComments(WIDGET).split("_deepLinkPromo = promo")[1];
  assert.ok(!/_deepLinkPromo\s*=\s*(?!null|undefined|false)/.test(others),
    "_deepLinkPromo is set somewhere other than the deep-link path — a stale "
    + "promoCode would be silently re-applied on a normal visit");
});

// ── hop 3: applied once, and only where it can be spent ────────────────
const autoApply = stripComments(methodBody(WIDGET, "_autoApplyDeepLinkPromo() {"));

test("the auto-apply is latched, tab-gated, and reuses _applyPromoCode", () => {
  assert.match(autoApply, /this\._deepLinkPromoApplied/,
    "no once-latch — preview_coupon is a POST and renderContent runs on every "
    + "tab change, seat tweak and plan_updated push");
  assert.match(autoApply, /currentTab !== TAB_CHECKOUT/,
    "not gated on the tab — a coupon would be previewed onto the plans view, "
    + "offering a discount with nothing to spend it on");
  assert.match(autoApply, /this\._applyPromoCode\(\)/,
    "a second apply path — _applyPromoCode already owns the plan gate, the "
    + "hub_id, the error mapping and the repaint");
});

test("it runs AFTER _settleDeepLinkTab has decided the tab", () => {
  // Ordering is the whole correctness argument: that method may bounce an
  // account that cannot buy back to the plans view, and the coupon must respect
  // the verdict rather than race it.
  const settle = stripComments(methodBody(WIDGET, "_settleDeepLinkTab() {"));
  const bounce = settle.indexOf("this.tab = this.state.currentTab");
  const call = settle.indexOf("_autoApplyDeepLinkPromo()");
  assert.ok(call > 0, "_settleDeepLinkTab never triggers the auto-apply");
  assert.ok(call > bounce,
    "the coupon is applied before the tab is settled — it would preview onto a "
    + "screen this method is about to replace");
});

// ── the shape the campaign actually sends ──────────────────────────────
test("the campaign's own URL survives every hop it can be tested through", () => {
  const url = "#/desk/billing?plan=team&cycle=monthly&tab=checkout"
    + "&promo=EMAILMKT270826_2"
    + "&utm_source=email&utm_medium=email&utm_campaign=segment-a-101";
  const out = parseWith(url);
  assert.deepEqual(out, {
    plan: "team", cycle: "monthly", tab: "checkout", promo: "EMAILMKT270826_2",
  }, "the campaign link no longer parses to the preselect the widget expects");
  // The markers ride in the same query and must not be forwarded as preselect.
  assert.equal(out.utm_campaign, undefined);
});
