/**
 * Where an account was standing when it signed out — kept for THAT account only.
 *
 * Butler.logout must not leave the desk's remembered screen (or the mirrored
 * folder hash) lying around for whoever signs in next: a different account
 * was sent into a workspace it is not a member of (DESIGNATION_LINK_NO_ACCESS).
 * But the SAME account signing back in should land where it left, exactly as a
 * reload does. So logout moves the remembered screen here, stamped with the
 * account id, and the desk's boot puts it back only when that id signs in.
 *
 * sessionStorage, like the remembered screen itself: this tab, nothing more.
 */
const KEY = "drumee.signedOutLocation";

/** Long enough for a coffee break, short enough not to surprise anybody. */
const AGE_LIMIT = 12 * 60 * 60 * 1000;

function deskStateKey() {
  return require("libs/location-url").DESK_STATE_KEY;
}

/**
 * Move the remembered desk screen aside for `uid`.
 * @param {String} uid the account signing out
 */
function stash(uid) {
  try {
    const stateKey = deskStateKey();
    const state = sessionStorage.getItem(stateKey);
    sessionStorage.removeItem(stateKey);
    if (!uid || !state) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify({ uid, state, ts: Date.now() }));
  } catch (e) {
    /* storage blocked — nothing was remembered either */
  }
}

/**
 * Put the stashed screen back when `uid` is the account that left it; drop it
 * otherwise. Either way the stash is consumed.
 * @param {String} uid the account now signed in
 * @returns {Boolean} whether a screen was restored
 */
function reclaim(uid) {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    sessionStorage.removeItem(KEY);
    const v = JSON.parse(raw) || {};
    if (!uid || v.uid !== uid || !v.state) return false;
    if (v.ts && Date.now() - Number(v.ts) > AGE_LIMIT) return false;
    sessionStorage.setItem(deskStateKey(), v.state);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { stash, reclaim, KEY, AGE_LIMIT };
