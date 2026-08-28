/**
 * The "open Billing & subscription once I am signed in" intent.
 *
 * A shareable link — `#/desk/billing` — that lands on the billing screen
 * whether or not the recipient has a live session:
 *
 *   signed in   the desk consumes the intent on boot and opens the page.
 *   signed out  the router captures it, the visitor signs in, and the desk
 *               that mounts afterwards opens the page.
 *
 * It exists as a stored intent rather than plain routing because the hash does
 * not survive the sign-in: the signin plugin replaces it wholesale with
 * "#/welcome/signin" (see the note on captureCampaignArrival in
 * router/index.js, which is recorded early for exactly the same reason). By
 * the time a module could read the URL, the destination is gone.
 *
 * sessionStorage only, deliberately. The relay has to outlive the full page
 * reload that signing in triggers, which it does, and nothing more: a billing
 * link is read and acted on in one sitting. `hub-deep-link` keeps a dated
 * localStorage copy as well because a workspace INVITE is finished by signing
 * UP, and email verification can land the recipient in a different tab — a
 * journey this link does not have. Dying with the tab is the right lifetime
 * here; a stale "open billing" surprising someone days later is not.
 *
 * Every entry point is defensive about storage itself: private mode and
 * blocked storage both throw on access, and the honest answer there is "no
 * intent" rather than a broken boot.
 */

const KEY = "drumee_billingDeepLink";

/**
 * The opaque marker naming who a campaign CTA was written for.
 *
 * A mail link ends up forwarded, screenshotted, and opened on machines already
 * signed in as somebody else. Without this, any of those walks that person into
 * a discounted checkout with a partner code applied that was never offered to
 * them. With it, the desk drops the destination when the signed-in account does
 * not match, and they land on an ordinary desk.
 *
 * A UX GUARD, NOT A SECURITY CONTROL. mkt_coupon_reserve has no recipient
 * allowlist, so anyone who learns the code can type it into the promo field.
 * What this stops is the AUTOMATIC path, not redemption. Restricting the code
 * itself belongs in the proc.
 *
 * FNV-1a, matching analytics-server's _recipientTag byte for byte — the two
 * must agree or every link is refused. Not cryptographic and not required to
 * be: it is computed here synchronously (SubtleCrypto is async, and this runs
 * inside a routing decision), and it protects nothing a determined person could
 * not do by hand.
 *
 * @param {String} email
 * @returns {String|null} 8 hex chars, or null for an unusable address
 */
function recipientTag(email) {
  const s = String(email || "").trim().toLowerCase();
  if (!s) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Is this destination addressed to the account now signed in?
 *
 * TRUE WHEN THE LINK NAMES NOBODY, deliberately: every link written before this
 * existed carries no marker, and so does one a caller built by hand. An absent
 * marker means "not bound", not "refuse".
 *
 * TRUE WHEN THE SESSION HAS NO ADDRESS TO COMPARE. Refusing there would turn a
 * missing profile field into a silently dead campaign link, which is a worse
 * failure than the one this guards against.
 *
 * @param {Object} preselect from consume()
 * @returns {Boolean}
 */
function isForCurrentUser(preselect) {
  const want = preselect && preselect.for;
  if (!want) return true;
  let email = "";
  try {
    email = (typeof Visitor !== "undefined" && Visitor && Visitor.profile
      ? (Visitor.profile() || {}).email
      : "") || "";
  } catch (e) {
    return true;
  }
  if (!email) return true;
  return recipientTag(email) === String(want).trim().toLowerCase();
}

/**
 * Shapes that mean "open billing".
 *
 * Two of them, because they survive different things:
 *
 *   #/desk/billing    the readable form, for a link opened with a session.
 *   ...?billing=1     an ARG anywhere in the hash. changeHost does
 *                     `location.host = host`, which keeps path and hash — so
 *                     an arg rides across the host switch a signed-in visitor
 *                     gets sent through, where per-origin storage cannot
 *                     follow.
 */
const PATH = /^#[/@]desk\/billing(?:[/?]|$)/i;
const ARG = /[?&]billing=1(?:&|$)/i;

/**
 * Does the CURRENT url ask for the billing screen?
 *
 * Reads location.hash directly rather than Visitor.parseModule(): this runs
 * from the router's initialize, before a module — and therefore before the
 * Visitor helpers a module relies on — is in play.
 *
 * @returns {Boolean}
 */
function urlWantsBilling() {
  try {
    const hash = String(window.location.hash || "");
    return PATH.test(hash) || ARG.test(hash);
  } catch (e) {
    // Reading location cannot normally throw; if it does, this visit carries
    // no readable destination and saying so is the only honest answer.
    console.warn("[billing-deep-link] could not read location", e);
    return false;
  }
}

/**
 * Pull the preselect out of the hash's query string, e.g. the link the segment
 * campaign mails carry:
 *
 *   #/desk/billing?plan=team&cycle=monthly&tab=checkout&promo=EMAILMKT270826_2
 *
 * Only the keys actually present are returned; validating the VALUES is the
 * billing widget's job (this lib stays dumb so a malformed param can never
 * break the boot). Returns {} when the link carries no preselect.
 *
 * AN ALLOWLIST, NOT A PASSTHROUGH, and it has to stay one. This runs from the
 * router's initialize, before a module — and therefore before anything that
 * could sanitise a value — is in play, and whatever it returns is handed
 * straight to sessionStorage by arm(). Forwarding arbitrary keys would put
 * unread link content into storage and then into a widget's options.
 *
 * `promo` is the coupon the CTA carries into checkout. It is on this list
 * rather than read from the URL later for the reason the whole module exists:
 * arm() stores what THIS function returns, so a key missing here is a key lost
 * across the sign-in reload as well — and a mail recipient is very often
 * signed out.
 *
 * `for` is the recipient marker — see recipientTag below.
 *
 * @returns {{plan?:string, cycle?:string, tab?:string, promo?:string, for?:string}}
 */
function parseParams() {
  const out = {};
  try {
    const hash = String(window.location.hash || "");
    const q = hash.indexOf("?");
    if (q === -1) return out;
    const usp = new URLSearchParams(hash.slice(q + 1));
    for (const k of ["plan", "cycle", "tab", "promo", "for"]) {
      const v = usp.get(k);
      if (v) out[k] = v;
    }
  } catch (e) {
    console.warn("[billing-deep-link] could not parse params", e);
  }
  return out;
}

/**
 * Remember that this visit should end on the billing screen, with whatever
 * plan/cycle/tab preselect the link carried.
 *
 * @param {Object} [params] preselect from parseParams() — {plan,cycle,tab,promo}
 */
function arm(params) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(params || {}));
  } catch (e) {
    // Private mode. The signed-IN case still works — the desk reads the hash
    // as a fallback — so this only costs the signed-out one.
    console.warn("[billing-deep-link] sessionStorage unavailable", e);
  }
}

/**
 * Arm from the current url, if it asks for billing. Safe to call on every
 * load; a url that says nothing leaves any armed intent untouched.
 *
 * @returns {Boolean} whether this load carried the link
 */
function captureFromUrl() {
  if (!urlWantsBilling()) return false;
  arm(parseParams());
  return true;
}

/**
 * Drop the intent on THIS origin, without acting on it.
 *
 * For the one moment the URL takes over as the carrier: the router is about to
 * set location.host, which keeps path and hash, so the destination travels to
 * the new origin and is re-armed there by captureFromUrl. The copy left behind
 * is then pure liability — Butler.logout brings the visitor back to this very
 * origin, and a copy sitting here is read at the NEXT sign-in and replays the
 * whole flow for somebody who never clicked anything.
 *
 * NOT consume(). That means "I am acting on this now" and returns the value;
 * this means "somebody else is carrying it from here".
 *
 * Clearing at the sign-in form instead does not work, and the reason is worth
 * recording: the value is cleared there, then written into the URL, and the
 * reload's own captureFromUrl immediately re-arms it from that URL. Measured
 * against the live site. The only place the copy can be dropped for good is
 * after the URL has demonstrably taken over.
 */
function disarm() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (e) {
    // Blocked storage — there was nothing to drop.
  }
}

/**
 * Take the intent, if there is one. Reading CLEARS the stored copy — an intent
 * acted on twice would reopen billing over whatever the user did next.
 *
 * The url is accepted as a second source so the signed-in case does not depend
 * on storage at all: there, the hash is still intact by the time the desk boots.
 *
 * @returns {Object|null} the preselect object ({plan?,cycle?,tab?,promo?}, possibly
 *   empty) when this boot should open billing, else null. An empty object is
 *   still truthy, so callers that only test truthiness keep working unchanged.
 */
function consume() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw != null) {
      sessionStorage.removeItem(KEY);
      try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
    }
  } catch (e) {
    // Blocked storage. The url is checked below regardless, so a signed-IN
    // visitor still gets there; only the across-sign-in relay is lost.
    console.warn("[billing-deep-link] sessionStorage unavailable", e);
  }
  return urlWantsBilling() ? parseParams() : null;
}

module.exports = {
  arm, disarm, consume, captureFromUrl, urlWantsBilling, parseParams,
  recipientTag, isForCurrentUser, KEY,
};
