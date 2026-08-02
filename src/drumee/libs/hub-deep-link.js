/**
 * The "open this workspace once I am signed in" intent.
 *
 * Armed by the welcome module when a URL names a workspace (`?hub_id=…` — the
 * workspace-invite email's CTA is exactly that link), consumed by desk/wm on boot,
 * which hands it to Wm.loadWorkspace() so the pane opens by itself. Nobody has to
 * click anything: see
 * docs/superpowers/specs/2026-08-02-invite-cta-skip-guest-landing-design.md.
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
 * Writes both shelves. The sessionStorage value keeps its original bare-string
 * shape so any other reader of the raw key keeps working unchanged.
 *
 * @param {String|Number} hub_id
 */
function arm(hub_id) {
  if (!hub_id) return;
  try {
    sessionStorage.setItem(KEY, String(hub_id));
  } catch (e) {
    console.warn("[hub-deep-link] sessionStorage unavailable", e);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ hub_id: String(hub_id), ts: Date.now() }));
  } catch (e) {
    // The session copy above is the primary; losing the fallback only costs the
    // new-tab signup case.
    console.warn("[hub-deep-link] localStorage unavailable", e);
  }
}

/**
 * The armed workspace, without consuming it. Session first — it is the intent
 * belonging to THIS tab — then the dated fallback.
 * @returns {String} hub_id, or "" when nothing (fresh) is armed
 */
function peek() {
  try {
    const s = sessionStorage.getItem(KEY);
    if (s) return String(s);
  } catch (e) {
    /* fall through to localStorage */
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "";
    const v = JSON.parse(raw);
    if (!v || !v.hub_id) return "";
    // Undated (armed by an older build) is honoured; too old is not.
    if (v.ts && Date.now() - Number(v.ts) > AGE_LIMIT) return "";
    return String(v.hub_id);
  } catch (e) {
    // Unreadable or malformed JSON — treat as nothing armed.
    return "";
  }
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
 * Read and forget, in one breath — so a consumed intent can never re-open the
 * workspace on the next load.
 * @returns {String} hub_id, or "" when nothing (fresh) was armed
 */
function consume() {
  const hub_id = peek();
  clear();
  return hub_id;
}

module.exports = { arm, peek, has, clear, consume, KEY, AGE_LIMIT };
