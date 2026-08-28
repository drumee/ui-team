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
  .replace(/(^|[^:])\/\/.*$/gm, "$1")
  // Collapse what the stripping left behind. This codebase comments densely, so
  // removing a docblock can leave thirty blank lines between two statements —
  // enough to push the second one outside a fixed-size slice window and fail a
  // case against correct code, which is how two cases here first failed.
  .replace(/\n\s*\n+/g, "\n");

const LIB = SRC("src/drumee/libs/billing-deep-link.js");
const WIDGET = SRC("src/drumee/builtins/widget/settings/account/billing/index.js");
const WIDGET_DESK = SRC("src/drumee/modules/desk/index.js");

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

// ── the link is addressed, and a forwarded one is refused ──────────────
//
// A mail gets forwarded, screenshotted, and opened on machines already signed
// in as a colleague. Without the marker, every one of those walks that person
// into a discounted checkout with a partner code applied that was never offered
// to them.
//
// A UX GUARD, NOT A SECURITY CONTROL — mkt_coupon_reserve has no recipient
// allowlist, so the code can still be typed by anyone who learns it. What is
// pinned here is that the AUTOMATIC path is addressed.
const LIBFN = (name) => {
  const m = new RegExp(`function ${name}\\(([^)]*)\\) \\{([\\s\\S]*?)\\n\\}`).exec(LIB);
  assert.ok(m, `${name} not found`);
  return { args: m[1], body: m[2] };
};
const tagFn = LIBFN("recipientTag");
const tag = new Function(tagFn.args, tagFn.body);

test("parseParams carries the recipient marker", () => {
  const out = parseWith("#/desk/billing?promo=X&for=cd8f5912");
  assert.equal(out.for, "cd8f5912",
    "the marker is dropped at the first hop — every link would read as unaddressed");
});

test("the client's tag matches analytics-server's, byte for byte", () => {
  // The two are separate implementations in separate repos. If they drift,
  // EVERY campaign link is refused and the feature dies silently — which is a
  // worse failure than the one the marker prevents.
  const SRV = readFileSync(
    "/home/drumee/analytics-server/service/index.js", "utf8");
  const m = /_recipientTag\(email\) \{([\s\S]*?)\n  \}/.exec(SRV);
  assert.ok(m, "analytics-server _recipientTag is gone — the contract has one end");
  const srv = new Function("email", m[1]);
  for (const e of ["midax74173@kolsea.com", "huan@drumee.org", "a@b.c",
                   "  MiXeD@Case.COM  ", ""]) {
    assert.equal(tag(e), srv(e), `tags disagree for ${JSON.stringify(e)}`);
  }
});

test("the tag ignores case and surrounding whitespace", () => {
  // One side reads a ticked table row, the other a session profile.
  assert.equal(tag("A@B.C"), tag("  a@b.c  "));
  assert.equal(tag(""), null);
  assert.equal(tag(null), null);
});

// isForCurrentUser, driven against a stubbed Visitor.
const forFn = LIBFN("isForCurrentUser");
const isFor = (preselect, email) => new Function(
  "Visitor", "recipientTag", forFn.args, forFn.body,
)({ profile: () => ({ email }) }, tag, preselect);

test("a link addressed to this account passes", () => {
  assert.equal(isFor({ for: tag("midax74173@kolsea.com") }, "midax74173@kolsea.com"), true);
});

test("a link addressed to somebody else is refused", () => {
  assert.equal(isFor({ for: tag("midax74173@kolsea.com") }, "someone.else@example.com"), false,
    "a forwarded mail still opens a discounted checkout for the wrong account");
});

test("an UNADDRESSED link passes — absent means not bound, not refuse", () => {
  // Every link written before the marker existed carries none, and so does one
  // a caller built by hand. Refusing those would kill working links.
  assert.equal(isFor({ plan: "team" }, "anyone@example.com"), true);
  assert.equal(isFor({ for: "" }, "anyone@example.com"), true);
});

test("a session with no readable address passes rather than dead-ends", () => {
  // Turning a missing profile field into a silently dead campaign link is a
  // worse failure than the one this guards against.
  assert.equal(isFor({ for: tag("a@b.c") }, ""), true);
  assert.equal(isFor({ for: tag("a@b.c") }, undefined), true);
});

test("the desk decides BEFORE it consumes", () => {
  // This case previously asserted the reverse — that the check ran after
  // consume() — on the reasoning that a link for somebody else should not stay
  // armed. That was wrong, and it is the bug this ordering fixes: consuming
  // first made every refusal permanent, so a wrong-account sign-in destroyed a
  // destination the recipient had not used yet.
  const body = stripComments(methodBody(WIDGET_DESK, "_maybeOpenBillingDeepLink() {"));
  const peek = body.indexOf("billingDeepLink.peek()");
  const check = body.indexOf("isForCurrentUser");
  const upgrade = body.indexOf("canUpgradePlan()");
  const consume = body.indexOf("billingDeepLink.consume()");
  assert.ok(peek >= 0, "the desk still consumes up front — every refusal is permanent");
  assert.ok(check > peek && upgrade > peek, "the gates run before anything is read out");
  assert.ok(consume > check && consume > upgrade,
    "consume() runs before a gate can refuse — a refused destination is destroyed");
});

test("consuming is still what makes it single-use", () => {
  // The other half, and the two are easy to break in each other's name: the
  // matching account MUST take it, or it replays after a later sign-out (the
  // regression fixed in e4230226).
  const body = stripComments(methodBody(WIDGET_DESK, "_maybeOpenBillingDeepLink() {"));
  const consume = body.indexOf("billingDeepLink.consume()");
  const open = body.indexOf("this.openBillingPage(");
  assert.ok(consume > 0, "nothing takes the intent — it would reopen on the next sign-in");
  assert.ok(consume < open, "it is taken after the screen opens; a failure in between would leave it armed");
});

// ── one identity source, and it is Visitor ─────────────────────────────
// signin used to decide whether to hand the destination over, reading the
// signer from data.user.profile.email — a shape that app does not otherwise
// use. Unverifiable, and a wrong answer there decided everything: refuse when it
// should not, and the recipient never gets their destination.
//
// The decision is now asked only of Visitor, in the two places that run after a
// session exists. A second source anywhere reintroduces the gap where the two
// disagree and the destination dies.
test("the recipient decision is asked only of Visitor", () => {
  const isFor = stripComments(LIBFN("isForCurrentUser").body);
  assert.match(isFor, /Visitor\s*\.\s*profile/,
    "isForCurrentUser no longer reads the session profile");
  const signin = readFileSync(
    "/home/drumee/signin/src/widgets/form/index.js", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  // Deliberately broad: `data.user.profile.email` was only ONE spelling of the
  // second source, and the next one will be spelled differently. After the
  // removal this file contains no occurrence of any of these words outside a
  // comment, so the assertion costs nothing until somebody reaches for an
  // identity here again.
  assert.ok(!/\bprofile\b|\bsigner\b/.test(signin),
    "signin reads an identity again — that is the second source, and when the "
    + "two disagree the destination is destroyed in the gap between them");
  assert.ok(!/intentIsForSigner|recipientTag/.test(signin),
    "signin decides recipiency again — it belongs to Visitor");
});

// ── a click and a hand-off are different URLs ──────────────────────────
// THE BUG THIS CAUGHT. urlWantsBilling() is true for both shapes, and they mean
// opposite things at the switch:
//   #/desk/billing?…  a CLICK — the CTA as the visitor arrived on it. changeHost
//                     carries it onward under its own steam, and this origin's
//                     copy is still the only one that survives a sign-out.
//   ?billing=1&…      a HAND-OFF — written only by signin, to carry the
//                     destination across on behalf of the account it belongs to.
// Measured: a refused wrong-account sign-in landed on
// team-NNNN…/#/desk/billing?…&for=… — the CTA hash, carried across — and the
// disarm fired on it, taking the recipient's copy.
test("only the hand-off form licenses a disarm", () => {
  const fn = LIBFN("urlIsHandoff");
  const run = (hash) => new Function("window", "ARG",
    `function urlIsHandoff() {${fn.body}}; return urlIsHandoff();`
  )({ location: { hash } }, /[?&]billing=1(?:&|$)/i);
  assert.equal(run("#/desk/billing?plan=team&for=cd8f5912"), false,
    "the CTA link reads as a hand-off — a refused visitor would disarm on it");
  assert.equal(run("#/welcome/signin?billing=1&plan=team"), true,
    "signin's hand-off is not recognised — the destination would replay");
  assert.equal(run("#/desk?billing=1"), true);
  assert.equal(run("#/welcome/signin"), false);
  assert.equal(run("#/desk"), false);
});

// ── the scenario, driven against the real peek/consume/disarm ──────────
// Addressed to A. B signs in → refused, and it SURVIVES. A signs in → opens,
// and it is gone. A again → nothing.
function libStore(initial) {
  const m = new Map();
  if (initial != null) m.set("drumee_billingDeepLink", initial);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null),
           removeItem: (k) => m.delete(k), setItem: (k, v) => m.set(k, v),
           size: () => m.size };
}
function libFns(ss) {
  const grab = (n) => new RegExp(`function ${n}\\(\\)[\\s\\S]*?\\n\\}`).exec(LIB)[0];
  const src = grab("peek") + grab("disarm") + grab("consume")
    + "\nreturn { peek, disarm, consume };";
  return new Function("sessionStorage", "urlWantsBilling", "parseParams", "KEY", "console", src)(
    ss, () => false, () => null, "drumee_billingDeepLink", console);
}

test("a refusal keeps the intent; the recipient's use takes it", () => {
  const INTENT = JSON.stringify({ plan: "team", promo: "P1", for: tag("a@example.com") });
  const ss = libStore(INTENT);
  const lib = libFns(ss);

  // B signs in: the desk peeks, refuses, consumes nothing.
  const seen = lib.peek();
  assert.equal(isFor(seen, "b@example.com"), false, "B was not refused");
  assert.equal(ss.size(), 1, "a refused sign-in destroyed the destination");

  // A signs in: peek, accept, consume.
  const seen2 = lib.peek();
  assert.equal(isFor(seen2, "a@example.com"), true, "A was refused");
  lib.consume();
  assert.equal(ss.size(), 0, "A's use did not take it — it would replay");

  // A again, no new click.
  assert.equal(lib.peek(), null, "billing would reopen without a click");
});

test("the router disarms only when the URL is carrying the destination", () => {
  // ASKED OF THE URL, NOT OF THE USER. This previously gated on
  // isForCurrentUser, which decides from Visitor.profile().email — while signin
  // decides whether to put the destination on the URL from
  // data.user.profile.email. Two sources for one decision: if they disagree for
  // a single page load, signin refuses (URL clean) and the router disarms
  // anyway, destroying the destination with nothing carrying it onward.
  const body = stripComments(routerSrc);
  const i = body.indexOf("if (this.changeHost(Organization.host()))");
  const branch = body.slice(i, i + 700);
  // BOTH conditions. The hand-off form says the URL is carrying it; Visitor
  // says it belongs to this session. signin hands off unconditionally now — it
  // has no identity it can trust — so the form alone no longer implies
  // ownership, and this is the only place left that decides.
  assert.match(branch, /urlIsHandoff\(\)[\s\S]*?isForCurrentUser\(billingDeepLink\.peek\(\)\)[\s\S]*?disarm\(\)/,
    "the disarm is not gated on BOTH the hand-off form and the recipient");
  assert.ok(!/urlWantsBilling\(\)[\s\S]{0,120}disarm/.test(branch),
    "gated on urlWantsBilling, which is ALSO true for the CTA link itself — a "
    + "refused visitor switched to their org host would take the recipient's "
    + "only surviving copy with them");
});

// ── the destination is single-use across the host switch ───────────────
// THE BUG: open checkout from a CTA, log out, log back in as the SAME account
// without touching the mail — and it reopened with the coupon reapplied.
//
// The intent is armed on TWO origins. The main domain, where the CTA was
// clicked; and the org host (team-NNNN.drumee.in) the router switches to after
// sign-in. consume() runs on the org host and clears only that one. Butler.logout
// then does `location.hostname = main_domain`, landing back on the origin still
// holding the other copy, and the next sign-in reads it.
//
// CLEARING AT THE SIGN-IN FORM DOES NOT FIX IT, which is what made this subtle
// and is why the fix lives here instead: signin clears the value, writes it into
// the URL, and the reload's own captureFromUrl re-arms it from that URL before
// the switch. Measured against the live site — cleared, then present again one
// page load later.
const routerSrc = SRC("src/drumee/router/index.js");

test("the router disarms the origin it is switching away from", () => {
  const body = stripComments(routerSrc);
  const i = body.indexOf("changeHost(Organization.host())");
  assert.ok(i > 0, "the host switch is gone");
  const branch = body.slice(i, i + 400);
  assert.match(branch, /billingDeepLink\.disarm\(\)/,
    "the origin being left keeps its copy — logout returns here and the next "
    + "sign-in replays the flow without a click");
  assert.match(branch, /urlIsHandoff\(\)/,
    "the disarm is unconditional, or gated on the wrong question — it would drop "
    + "a destination the URL is not handing over");
  assert.ok(branch.indexOf("disarm()") < branch.indexOf("return;"),
    "disarm must run before the early return, or it never runs at all");
});

test("disarm only fires on a switch that actually happened", () => {
  // changeHost answers false for a loose_host module and in the DMZ, and there
  // the stored copy is still the only carrier.
  const body = stripComments(routerSrc);
  // Anchored on the `if`, not on the call inside it: slicing from
  // indexOf("changeHost(Organization.host())") starts AFTER the `if (this.`
  // that has to be matched, which is how this case first failed against correct
  // code.
  const i = body.indexOf("if (this.changeHost(Organization.host()))");
  assert.ok(i > 0, "the guarded host switch is gone");
  const branch = body.slice(i, i + 400);
  assert.match(branch, /if \(this\.changeHost\(Organization\.host\(\)\)\) \{[\s\S]*?urlIsHandoff\(\)[\s\S]*?disarm\(\)[\s\S]*?return;[\s\S]*?\n      \}/,
    "disarm sits outside the success branch — it would drop the destination on "
    + "a switch that never occurred");
});

test("disarm is not consume — it returns nothing and acts on nothing", () => {
  const fn = LIBFN("disarm");
  assert.ok(!/return\s+\w/.test(fn.body),
    "disarm returns a value — it means 'somebody else is carrying this', not "
    + "'I am acting on it now'");
  assert.match(fn.body, /removeItem\(KEY\)/, "disarm does not remove the key");
  assert.match(fn.body, /catch/, "disarm throws on blocked storage");
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
