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
 * THIRD SHELF: a cookie on the deployment's main domain (2026-10).
 *
 * Both web-storage shelves are per ORIGIN, and signing in does not always come
 * back to the origin that armed them: a member of an organisation is sent to
 * the organisation's own host after authentication (google.callback redirects
 * to `https://<user domain>/-/`, the password path hops to
 * `<org>.<main_domain>` as well). On that host the intent is invisible, the
 * invitation is never answered, and the person lands on their desk with no
 * sign that anything was expected of them. Organisation hosts are subdomains
 * of main_domain, and a cookie set on main_domain is readable from every one
 * of them, so the cookie is what crosses the hop. Short-lived: a day is well
 * beyond any sign-in, and the shelf is cleared with the others on consume().
 * A host outside main_domain (a custom domain) simply never sees it, which is
 * today's behaviour, not a regression.
 */
const COOKIE_MAX_AGE_S = 24 * 3600;

function _mainDomain() {
  try {
    const { main_domain } = (typeof bootstrap === "function" && bootstrap()) || {};
    const md = String(main_domain || "").toLowerCase();
    const host = String(location.hostname || "").toLowerCase();
    if (!md || (host !== md && !host.endsWith("." + md))) return "";
    return md;
  } catch (e) {
    return "";
  }
}

function _writeCookie(value) {
  const md = _mainDomain();
  if (!md) return;
  try {
    document.cookie =
      `${KEY}=${encodeURIComponent(value)}; domain=${md}; path=/; max-age=${COOKIE_MAX_AGE_S}; secure; samesite=lax`;
  } catch (e) {
    /* cookies blocked: the two storage shelves still work on this origin */
  }
}

function _eraseCookie() {
  const md = _mainDomain();
  try {
    if (md) document.cookie = `${KEY}=; domain=${md}; path=/; max-age=0; secure; samesite=lax`;
    document.cookie = `${KEY}=; path=/; max-age=0`;
  } catch (e) {
    /* nothing to erase */
  }
}

/** The cookie copy, parsed like the localStorage one; null when absent or stale. */
function _cookieIntent() {
  try {
    const m = new RegExp("(?:^|;\\s*)" + KEY + "=([^;]*)").exec(document.cookie || "");
    if (!m || !m[1]) return null;
    const v = JSON.parse(decodeURIComponent(m[1]));
    if (!v || !v.hub_id) return null;
    if (v.ts && Date.now() - Number(v.ts) > AGE_LIMIT) return null;
    return {
      hub_id: String(v.hub_id),
      name: v.name ? String(v.name) : "",
      invite: v.invite ? String(v.invite) : "",
      action: v.action ? String(v.action) : "",
    };
  } catch (e) {
    return null;
  }
}

/**
 * Remember that this visit should open `hub_id` once authenticated.
 *
 * Writes both shelves. The sessionStorage value stays a BARE hub_id string — its
 * original shape — so a desk bundle from before this module (or mid-deploy) still
 * reads it correctly; the display name rides only on the localStorage copy, which
 * is new and has no older reader. The name is copy for the prompt, so losing it
 * costs a nicer message and nothing else.
 *
 * The invitation TOKEN rides on the localStorage copy too (2026-10). The
 * email's Accept link carries `?invite=<token>&invite_action=accept`; the
 * welcome module used to keep that token in memory only, and signing in
 * reloads the document, so the desk came up with a hub_id and no token: it
 * opened a workspace nobody had added the person to (403, endless spinner).
 * With the token here, the desk answers the invitation first, then opens.
 *
 * @param {String|Number} hub_id
 * @param {String} [name] workspace display name, for the prompt's message
 * @param {Object} [extra]
 * @param {String} [extra.invite] invitation token from the email link
 * @param {String} [extra.action] "accept" (default) or "decline"
 */
function arm(hub_id, name, extra = {}) {
  if (!hub_id) return;
  const invite = extra && extra.invite ? String(extra.invite) : "";
  const action = extra && extra.action ? String(extra.action) : "";
  try {
    sessionStorage.setItem(KEY, String(hub_id));
  } catch (e) {
    console.warn("[hub-deep-link] sessionStorage unavailable", e);
  }
  const payload = JSON.stringify({
    hub_id: String(hub_id),
    name: name ? String(name) : "",
    ts: Date.now(),
    invite,
    action,
  });
  // Crosses the sign-in hop to an organisation host; see COOKIE_MAX_AGE_S.
  _writeCookie(payload);
  try {
    localStorage.setItem(KEY, payload);
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
    return {
      hub_id: String(v.hub_id),
      name: v.name ? String(v.name) : "",
      invite: v.invite ? String(v.invite) : "",
      action: v.action ? String(v.action) : "",
    };
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
  const l = _fallback() || _cookieIntent();
  if (s) {
    // Only lend the name to the SAME workspace — a leftover copy for another hub
    // must not label this one.
    const same = l && l.hub_id === String(s) ? l : null;
    return {
      hub_id: String(s),
      name: (same && same.name) || "",
      invite: (same && same.invite) || "",
      action: (same && same.action) || "",
    };
  }
  return l;
}

/** True when a (fresh) intent is armed. Does not consume it. */
function has() {
  return !!peek();
}

/** Forget any armed intent, on both shelves. */
function clear() {
  _eraseCookie();
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
