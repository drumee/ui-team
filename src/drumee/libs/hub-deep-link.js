/**
 * The "open this workspace once I am signed in" intent.
 *
 * Armed by the welcome module when a URL names a workspace (`?hub_id=…&name=…` —
 * the workspace-invite email's CTA is exactly that link), consumed by the desk once
 * Home has settled, which asks "Open Workspace / Cancel" and, on confirm, opens the
 * hub through the #/desk/wm/open/ deep link. See
 * docs/superpowers/specs/2026-08-02-invite-cta-skip-guest-landing-design.md.
 *
 * The desk owns the consumption, NOT desk/wm's boot path, so the prompt inherits
 * _waitForHomePopups() — the reward flow and the LAUNCH30 popup are full-screen,
 * and an earlier version of this prompt appeared on top of them.
 *
 * It lives in TWO places, and the pair is the whole point of this module:
 *
 *   sessionStorage  the original relay. Survives the full page reload signing in
 *                   triggers, dies with the tab, cannot go stale.
 *   localStorage    a dated fallback, because sign-UP does not stay in one tab:
 *                   the recipient leaves for their mail client and may finish in
 *                   the NEW TAB the verification link opens, where a session-scoped
 *                   key does not exist. (check-inbox polls check_verification and
 *                   redirects the ORIGINAL tab, which usually saves it — but only
 *                   while that tab is still open.) Same reasoning, and the same
 *                   {hub_id, ts} shape, as the guest flow's drumee_guest_join.
 *
 * Outliving the session means it can also outlive the recipient's interest, so the
 * localStorage copy carries a timestamp and is ignored once stale. The invite is
 * unaffected either way — it stays in the activity list.
 *
 * Every entry point is defensive about storage itself: private mode and blocked
 * storage both throw on access, and the honest answer there is "no intent" rather
 * than a broken desk boot.
 */

const KEY = "drumee_hubDeepLink";

/** How long a localStorage intent stays honourable. Mirrors _maybeOfferInvitedWorkspace. */
const AGE_LIMIT = 7 * 24 * 3600 * 1000;

/**
 * Remember that this visit should open `hub_id` once authenticated.
 *
 * Writes both shelves. The sessionStorage value stays a BARE hub_id string — its
 * original shape — so a desk bundle from before this module (or mid-deploy) still
 * reads it correctly; the display name rides only on the localStorage copy, which
 * is new and has no older reader. The name is copy for the prompt, so losing it
 * costs a nicer message and nothing else.
 *
 * @param {String|Number} hub_id
 * @param {String} [name] workspace display name, for the prompt's message
 */
function arm(hub_id, name) {
  if (!hub_id) return;
  try {
    sessionStorage.setItem(KEY, String(hub_id));
  } catch (e) {
    console.warn("[hub-deep-link] sessionStorage unavailable", e);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({
      hub_id: String(hub_id),
      name: name ? String(name) : "",
      ts: Date.now(),
    }));
  } catch (e) {
    // The session copy above is the primary; losing the fallback only costs the
    // new-tab signup case.
    console.warn("[hub-deep-link] localStorage unavailable", e);
  }
}

/** The dated localStorage copy, or null when absent, stale or unreadable. */
function _fallback() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !v.hub_id) return null;
    // Undated (armed by an older build) is honoured; too old is not.
    if (v.ts && Date.now() - Number(v.ts) > AGE_LIMIT) return null;
    return { hub_id: String(v.hub_id), name: v.name ? String(v.name) : "" };
  } catch (e) {
    // Unreadable or malformed JSON — treat as nothing armed.
    return null;
  }
}

/**
 * The armed workspace, without consuming it. Session decides WHETHER an intent
 * belongs to this tab; the localStorage copy supplies the name, and stands in
 * wholesale when the session key is gone (the new-tab signup case).
 * @returns {{hub_id: String, name: String}|null} null when nothing (fresh) is armed
 */
function peek() {
  let s = "";
  try {
    s = sessionStorage.getItem(KEY) || "";
  } catch (e) {
    /* fall through to the localStorage copy */
  }
  const l = _fallback();
  if (s) {
    // Only lend the name to the SAME workspace — a leftover copy for another hub
    // must not label this one.
    return { hub_id: String(s), name: (l && l.hub_id === String(s) && l.name) || "" };
  }
  return l;
}

/** True when a (fresh) intent is armed. Does not consume it. */
function has() {
  return !!peek();
}

/** Forget any armed intent, on both shelves. */
function clear() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (e) {
    /* nothing to clear */
  }
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* nothing to clear */
  }
}

/**
 * Read and forget, in one breath — so a consumed intent can never prompt again on
 * the next load.
 * @returns {{hub_id: String, name: String}|null} null when nothing (fresh) was armed
 */
function consume() {
  const intent = peek();
  clear();
  return intent;
}

module.exports = { arm, peek, has, clear, consume, KEY, AGE_LIMIT };
