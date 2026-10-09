/**
 * Contact-invitation intents carried by the invitation emails, kept until
 * somebody is signed in and then answered by the desk.
 *
 *   token   "Join Drumee" — an invitation to an address with NO account
 *           (#/welcome/signup?email=…&contact_invite=<token>, server
 *           contact._joinLink). Redeemed with contact.accept_invite by
 *           whoever signs in: holding the secret is the authorisation.
 *   accept  "Open my desktop" — an invitation to an EXISTING account
 *           (#/welcome/signin?contact_accept=<inviter id>&for=<invitee id>,
 *           server contact._acceptLink). Answered with contact.invite_accept,
 *           and ONLY by the account it was sent to (`for`); any other account
 *           leaves it armed for the right one.
 *
 * Before these, both links led nowhere: the invitation stayed "Pending" on
 * both sides after the recipient clicked.
 *
 * Two shelves, for the two ways an arrival leaves the page that saw the link:
 *
 *   localStorage  sign-up finishing in the verification tab, same origin.
 *   cookie        signing in (or out) hops between main_domain and an
 *                 organisation host (<org>.<main_domain>); web storage is per
 *                 origin, a cookie on main_domain is read by every subdomain.
 *                 Same reasoning as libs/hub-deep-link.
 *
 * Dated; storage that throws (private mode, blocked) means "no intent".
 */

const TOKEN_KEY = "drumee_contactInvite";
const ACCEPT_KEY = "drumee_contactAccept";

/** yp.token rows for these invitations are purged after 7 days server-side. */
const AGE_LIMIT = 7 * 24 * 3600 * 1000;

/** A day is far beyond any sign-in; the shelf is cleared once answered. */
const COOKIE_MAX_AGE_S = 24 * 3600;

/** Tokens are server-minted random strings; anything else is not ours. */
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;
/** Drumee account ids. */
const ID_RE = /^[0-9a-f]{16}$/;

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
    const v = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== "object") return null;
    if (v.ts && Date.now() - Number(v.ts) > AGE_LIMIT) return null;
    return v;
  } catch (e) {
    return null;
  }
}

function _write(key, value) {
  const payload = JSON.stringify({ ...value, ts: Date.now() });
  try {
    localStorage.setItem(key, payload);
  } catch (e) {
    console.warn("[contact-invite-link] localStorage unavailable", e);
  }
  const md = _mainDomain();
  if (!md) return;
  try {
    document.cookie =
      `${key}=${encodeURIComponent(payload)}; domain=${md}; path=/; max-age=${COOKIE_MAX_AGE_S}; secure; samesite=lax`;
  } catch (e) {
    /* cookies blocked: localStorage still covers this origin */
  }
}

function _read(key) {
  let v = null;
  try {
    v = _parse(localStorage.getItem(key));
  } catch (e) {
    v = null;
  }
  if (v) return v;
  try {
    const m = new RegExp("(?:^|;\\s*)" + key + "=([^;]*)").exec(document.cookie || "");
    return m && m[1] ? _parse(decodeURIComponent(m[1])) : null;
  } catch (e) {
    return null;
  }
}

function _erase(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    /* nothing to clear */
  }
  try {
    const md = _mainDomain();
    if (md) document.cookie = `${key}=; domain=${md}; path=/; max-age=0; secure; samesite=lax`;
    document.cookie = `${key}=; path=/; max-age=0`;
  } catch (e) {
    /* nothing to erase */
  }
}

/* ---------------------------------------------------------------- token -- */

/**
 * Remember a "Join Drumee" invitation token until somebody is signed in.
 * @param {String} token
 */
function arm(token) {
  token = String(token || "");
  if (!TOKEN_RE.test(token)) return;
  _write(TOKEN_KEY, { token });
}

/** The armed token, without consuming it; null when nothing (fresh) is armed. */
function peek() {
  const v = _read(TOKEN_KEY);
  return v && TOKEN_RE.test(String(v.token || "")) ? String(v.token) : null;
}

/** Forget the token on both shelves. */
function clear() {
  _erase(TOKEN_KEY);
}

/** Read and forget in one breath, so a redemption is attempted once. */
function consume() {
  const token = peek();
  clear();
  return token;
}

/* --------------------------------------------------------------- accept -- */

/**
 * Remember "accept <inviter>'s invitation as <for>". Re-arming the SAME pair
 * keeps `forced` (see markForced), so the welcome page re-reading the link
 * after the sign-out it asked for does not ask for another one.
 * @param {String} inviter inviter's account id
 * @param {String} forUid  invitee's account id — the only one allowed to answer
 */
function armAccept(inviter, forUid) {
  inviter = String(inviter || "");
  forUid = String(forUid || "");
  if (!ID_RE.test(inviter) || !ID_RE.test(forUid) || inviter === forUid) return;
  const cur = peekAccept();
  const forced = cur && cur.inviter === inviter && cur.for === forUid ? cur.forced : 0;
  _write(ACCEPT_KEY, { inviter, for: forUid, forced: forced ? 1 : 0 });
}

/** @returns {{inviter: String, for: String, forced: Number}|null} */
function peekAccept() {
  const v = _read(ACCEPT_KEY);
  if (!v || !ID_RE.test(String(v.inviter || "")) || !ID_RE.test(String(v.for || ""))) return null;
  return { inviter: String(v.inviter), for: String(v.for), forced: v.forced ? 1 : 0 };
}

/**
 * Record that a wrong-account session was already signed out for this intent.
 * One sign-out per arrival: should the person sign in with another account
 * again, they keep it instead of being thrown out in a loop.
 */
function markForced() {
  const cur = peekAccept();
  if (cur) _write(ACCEPT_KEY, { ...cur, forced: 1 });
}

/** Forget the accept intent on both shelves. */
function clearAccept() {
  _erase(ACCEPT_KEY);
}

module.exports = {
  arm, peek, clear, consume,
  armAccept, peekAccept, markForced, clearAccept,
  TOKEN_KEY, ACCEPT_KEY,
};
