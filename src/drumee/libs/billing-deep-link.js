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
 * Pull the preselect out of the hash's query string, e.g.
 * `#/desk/billing?plan=pro&cycle=yearly&tab=checkout`. Only the keys actually
 * present are returned; validating the VALUES is the billing widget's job (this
 * lib stays dumb so a malformed param can never break the boot). Returns {}
 * when the link carries no preselect.
 *
 * @returns {{plan?:string, cycle?:string, tab?:string}}
 */
function parseParams() {
  const out = {};
  try {
    const hash = String(window.location.hash || "");
    const q = hash.indexOf("?");
    if (q === -1) return out;
    const usp = new URLSearchParams(hash.slice(q + 1));
    for (const k of ["plan", "cycle", "tab"]) {
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
 * @param {Object} [params] preselect from parseParams()
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
 * Take the intent, if there is one. Reading CLEARS the stored copy — an intent
 * acted on twice would reopen billing over whatever the user did next.
 *
 * The url is accepted as a second source so the signed-in case does not depend
 * on storage at all: there, the hash is still intact by the time the desk boots.
 *
 * @returns {Object|null} the preselect object ({plan?,cycle?,tab?}, possibly
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

module.exports = { arm, consume, captureFromUrl, urlWantsBilling, parseParams, KEY };
