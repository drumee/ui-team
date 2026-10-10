/* ==================================================================== *
 * Department join links — the setup wizard's "Public link" (B2B Org
 * Structure, Figma 998:85923): <endpoint>?join=<token>.
 *
 * CAPTURED AT THE EARLIEST POINT, for the reason billing-deep-link is: a
 * signed-out visitor is sent to sign in (or sign up) by a full navigation, and
 * the query string may not survive it. localStorage — not sessionStorage — so
 * a sign-up finished in another tab still finds it. The desk accepts it once
 * the person is signed in (desk _maybeAcceptJoinLink).
 *
 * The ?join= stays ON THE URL until it is accepted: someone from another
 * organisation opens the link on this organisation's address and is sent to
 * their own by the router (location.host = ..., which keeps the query), where
 * this origin's localStorage does not exist. take() removes it.
 *
 * AND ON A COOKIE SCOPED TO main_domain, the shelf hub-deep-link keeps for
 * e-mail invitations: a signed-out visitor opens the link on the
 * organisation's address and signs in -- or signs up -- on main_domain, a
 * different origin with its own localStorage and a URL that no longer
 * carries the query. Every *.main_domain host reads the cookie, so whichever
 * desk the new session lands on finds the token. A day is beyond any sign-up.
 * ==================================================================== */
const KEY = "drumee_join_token";
const TOKEN_RE = /^[0-9a-f]{32}$/i;
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

function _writeCookie(token) {
  const md = _mainDomain();
  if (!md) return;
  try {
    document.cookie = `${KEY}=${token}; domain=${md}; path=/; max-age=${COOKIE_MAX_AGE_S}; secure; samesite=lax`;
  } catch (e) { /* cookies blocked: localStorage still holds it here */ }
}

function _readCookie() {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${KEY}=([0-9a-fA-F]{32})`));
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}

function _eraseCookie() {
  const md = _mainDomain();
  try {
    if (md) document.cookie = `${KEY}=; domain=${md}; path=/; max-age=0; secure; samesite=lax`;
    document.cookie = `${KEY}=; path=/; max-age=0`;
  } catch (e) { /* nothing to erase */ }
}

function captureFromUrl() {
  try {
    const params = new URLSearchParams(location.search);
    // Accepted on the person's own organisation, which then sent them here
    // (desk _maybeAcceptJoinLink): drop the copy this origin kept when the
    // link was first opened here, before the router sent them home.
    const done = params.get("join_done");
    if (done) {
      if (localStorage.getItem(KEY) === done) localStorage.removeItem(KEY);
      if (_readCookie() === done) _eraseCookie();
      params.delete("join_done");
      const q = params.toString();
      history.replaceState(null, "", `${location.pathname}${q ? `?${q}` : ""}${location.hash}`);
      return;
    }
    const token = params.get("join");
    if (!token || !TOKEN_RE.test(token)) return;
    _writeCookie(token);
    localStorage.setItem(KEY, token);
  } catch (e) {
    /* private mode / no history API: the link simply is not remembered */
  }
}

/** The pending token, removed — single-shot. */
function take() {
  let t = null;
  try {
    t = localStorage.getItem(KEY);
    if (t) localStorage.removeItem(KEY);
  } catch (e) {
    t = null;
  }
  const fromCookie = _readCookie();
  if (fromCookie) {
    if (!t) t = fromCookie;
    _eraseCookie();
  }
  try {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("join");
    if (fromUrl) {
      if (!t && TOKEN_RE.test(fromUrl)) t = fromUrl;
      params.delete("join");
      const q = params.toString();
      history.replaceState(null, "", `${location.pathname}${q ? `?${q}` : ""}${location.hash}`);
    }
  } catch (e) {
    /* no history API */
  }
  return t && TOKEN_RE.test(t) ? t : null;
}

module.exports = { captureFromUrl, take };
