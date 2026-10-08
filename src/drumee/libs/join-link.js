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
 * ==================================================================== */
const KEY = "drumee_join_token";
const TOKEN_RE = /^[0-9a-f]{32}$/i;

function captureFromUrl() {
  try {
    const params = new URLSearchParams(location.search);
    const token = params.get("join");
    if (!token || !TOKEN_RE.test(token)) return;
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
