/**
 * The "redeem this contact invitation once I am signed in" intent.
 *
 * A contact invitation sent to an address with no Drumee account mails a
 * "Join Drumee" link carrying the invitation token
 * (#/welcome/signup?email=…&contact_invite=<token>, server contact._joinLink).
 * The welcome module arms it; the desk consumes it once somebody is signed in
 * and redeems it with contact.accept_invite, which connects the two accounts.
 *
 * Before this the token rode on the link and nothing read it, so the invitation
 * stayed "Pending" on both sides forever.
 *
 * Two shelves, for the two ways the arrival leaves the page that saw the link:
 *
 *   localStorage  sign-UP finishes in the tab the verification email opens, on
 *                 the same origin. Dated, so a forgotten intent goes stale.
 *   cookie        sign-IN of a member of an organisation hops to the
 *                 organisation's host (<org>.<main_domain>), where this origin's
 *                 storage is invisible. A cookie on main_domain is readable from
 *                 every such subdomain. Same reasoning as libs/hub-deep-link.
 *
 * Storage that throws (private mode, blocked) means "no intent", never a broken
 * boot.
 */

const KEY = "drumee_contactInvite";

/** yp.token rows for these invitations are purged after 7 days server-side. */
const AGE_LIMIT = 7 * 24 * 3600 * 1000;

/** A day is far beyond any sign-in; the shelf is cleared on consume(). */
const COOKIE_MAX_AGE_S = 24 * 3600;

/** Tokens are server-minted random strings; anything else is not ours. */
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

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

function _parse(raw) {
  try {
    const v = JSON.parse(raw);
    if (!v || !TOKEN_RE.test(String(v.token || ""))) return null;
    if (v.ts && Date.now() - Number(v.ts) > AGE_LIMIT) return null;
    return String(v.token);
  } catch (e) {
    return null;
  }
}

function _readCookie() {
  try {
    const m = new RegExp("(?:^|;\\s*)" + KEY + "=([^;]*)").exec(document.cookie || "");
    return m && m[1] ? _parse(decodeURIComponent(m[1])) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Remember the invitation token until somebody is signed in.
 * @param {String} token
 */
function arm(token) {
  token = String(token || "");
  if (!TOKEN_RE.test(token)) return;
  const payload = JSON.stringify({ token, ts: Date.now() });
  try {
    localStorage.setItem(KEY, payload);
  } catch (e) {
    console.warn("[contact-invite-link] localStorage unavailable", e);
  }
  const md = _mainDomain();
  if (!md) return;
  try {
    document.cookie =
      `${KEY}=${encodeURIComponent(payload)}; domain=${md}; path=/; max-age=${COOKIE_MAX_AGE_S}; secure; samesite=lax`;
  } catch (e) {
    /* cookies blocked: localStorage still covers this origin */
  }
}

/** The armed token, without consuming it; null when nothing (fresh) is armed. */
function peek() {
  let l = null;
  try {
    l = _parse(localStorage.getItem(KEY) || "");
  } catch (e) {
    l = null;
  }
  return l || _readCookie();
}

/** Forget the intent on both shelves. */
function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* nothing to clear */
  }
  try {
    const md = _mainDomain();
    if (md) document.cookie = `${KEY}=; domain=${md}; path=/; max-age=0; secure; samesite=lax`;
    document.cookie = `${KEY}=; path=/; max-age=0`;
  } catch (e) {
    /* nothing to erase */
  }
}

/** Read and forget in one breath, so a redemption is attempted once. */
function consume() {
  const token = peek();
  clear();
  return token;
}

module.exports = { arm, peek, clear, consume, KEY };
