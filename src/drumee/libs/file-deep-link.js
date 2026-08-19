/**
 * The "open this file once I am signed in" intent.
 *
 * A Designation link — `#/desk/wm/o/<nid>/<hub_id>/<filetype>`, or its long twin
 * `#/desk/wm/open/nid=…&hub_id=…` — is a link you send to somebody else, so it is
 * usually opened by a visitor with no live session. Until this module existed,
 * that visitor signed in and landed on the desk with no file open, and the link
 * they were sent silently did nothing.
 *
 * ── Why the obvious mechanism does not work ────────────────────────────────
 *
 * `wm.route()` already reads `localStorage.locationOnStart` for exactly this
 * purpose, but that value cannot survive the journey:
 *
 *   1. `router/butler/index.js` writes `locationOnStart` on EVERY boot, unguarded.
 *   2. Signed out, the router replaces the hash with "#/welcome/signin".
 *   3. Sign-in success ends in `location.reload()` (welcome/signin/index.js).
 *   4. Boot 2's butler OVERWRITES `locationOnStart` with "#/welcome/signin".
 *
 * Measured on the test env 2026-08-18: boot 1 stored an 83-character hash
 * carrying `nid=`, boot 2 stored 16 characters of "/welcome/signin". So by the
 * time route() looks, the destination is gone — for the long form exactly as much
 * as for the compact one. This module is the relay that does survive, and it is
 * the same one `libs/billing-deep-link.js` and `libs/hub-deep-link.js` use for
 * the identical hazard.
 *
 * ── Lifetime ───────────────────────────────────────────────────────────────
 *
 * sessionStorage only, like billing-deep-link and for the same reason: the relay
 * must outlive the full page reload that signing in triggers, and nothing more.
 * `hub-deep-link` also keeps a dated localStorage copy because a workspace INVITE
 * is finished by signing UP and email verification can land the recipient in a
 * different tab — a journey a file link does not have. Dying with the tab is the
 * right lifetime here.
 *
 * On top of that the intent is DATED and short-lived. Unlike billing, consumption
 * happens at a spot route() reaches on ordinary navigation too, so a forgotten
 * intent could otherwise reopen a file long after the visitor moved on. Two
 * guards prevent that: `AGE_LIMIT` below, and `clear()` called by the warm path
 * the moment it opens the file itself.
 *
 * Every entry point is defensive about storage: private mode and blocked storage
 * both throw on access, and the honest answer is "no intent" rather than a broken
 * boot.
 */

const KEY = "drumee_fileDeepLink";

/**
 * How long an armed intent stays honourable.
 *
 * Long enough for a sign-in — including a slow password reset — and short enough
 * that an intent nobody completed cannot surprise the same tab later. Deliberately
 * far shorter than hub-deep-link's 7 days: that one relays an invite finished by
 * signing up, this one relays a link opened in one sitting.
 */
const AGE_LIMIT = 15 * 60 * 1000;

/**
 * Hash shapes that name a file to open.
 *
 * Only the two the Designation link produces. `#/desk/wm/file|edit|play|folder/`
 * also reach openFileLocation and have the same cold-arrival gap, but they are
 * not what this change was asked to fix and every extra shape widens what can be
 * replayed after a sign-in — so they are deliberately left out.
 *
 * `#@` as well as `#/` because moduleName() accepts both (router/modules.js).
 *
 * Matched with a literal regex rather than `_K.module.desk` / Visitor.parseModule
 * on purpose: captureFromUrl() runs at MODULE SCOPE in index.web.js, which is the
 * earliest code the app runs — before locale/index.js has defined `_K`, `_a` or
 * the Visitor helpers. Reaching for an injected global there would throw during
 * boot. billing-deep-link.js makes the same choice for the same reason.
 */
const LONG = /^#[/@]desk\/wm\/open\/.*nid=/i;
const COMPACT = /^#[/@]desk\/wm\/o\/[^/]+\/[^/]+\/[^/]+$/i;

/**
 * Does the CURRENT url name a file to open?
 * @returns {Boolean}
 */
function urlWantsFile() {
  try {
    const hash = String(window.location.hash || "");
    return LONG.test(hash) || COMPACT.test(hash);
  } catch (e) {
    // Reading location cannot normally throw; if it does, this visit carries no
    // readable destination and saying so is the only honest answer.
    console.warn("[file-deep-link] could not read location", e);
    return false;
  }
}

/**
 * Remember that this visit should end on `hash`.
 * @param {String} hash a full location.hash, e.g. "#/desk/wm/o/12/ab/image"
 */
function arm(hash) {
  if (!hash) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ hash: String(hash), ts: Date.now() }));
  } catch (e) {
    // Private mode. The signed-IN case is unaffected — it never needed the relay
    // — so this only costs the signed-out one.
    console.warn("[file-deep-link] sessionStorage unavailable", e);
  }
}

/**
 * Arm from the current url, if it names a file. Safe to call on every load: a url
 * that says nothing leaves any armed intent untouched, which is what lets the
 * intent survive boot 2, whose hash is "#/welcome/signin".
 *
 * @returns {Boolean} whether this load carried such a link
 */
function captureFromUrl() {
  if (!urlWantsFile()) return false;
  try {
    arm(String(window.location.hash || ""));
  } catch (e) {
    console.warn("[file-deep-link] could not capture location", e);
    return false;
  }
  return true;
}

/** The armed hash, or null when absent, stale or unreadable. Does not consume. */
function peek() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !v.hash) return null;
    // Undated (armed by an older build) is honoured; too old is not.
    if (v.ts && Date.now() - Number(v.ts) > AGE_LIMIT) return null;
    return String(v.hash);
  } catch (e) {
    // Unreadable, malformed, or blocked storage — treat as nothing armed.
    return null;
  }
}

/** Forget any armed intent. Called by the warm path when it opens the file itself. */
function clear() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (e) {
    /* nothing to clear */
  }
}

/**
 * Read and forget, in one breath — an intent acted on twice would reopen the file
 * over whatever the visitor did next.
 * @returns {String|null} the armed hash, or null when nothing (fresh) was armed
 */
function consume() {
  const hash = peek();
  clear();
  return hash;
}

module.exports = { arm, peek, clear, consume, captureFromUrl, urlWantsFile, KEY, AGE_LIMIT };
