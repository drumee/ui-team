/**
 * Scratch storage for the guided flows.
 *
 * A walkthrough in progress has a little state that is genuinely local — the
 * workspace it created a step ago, say. It is meaningless once the run ends,
 * it is deleted when the flow finishes, and storing it server-side would need
 * a column for no benefit.
 *
 * What is NOT here is anything that decides whether a flow should run. That is
 * a fact about a USER, not a browser: as a localStorage latch it did not follow
 * them to another device, it grew one key per user on a shared machine, and
 * clearing the server's own table could not reset it. reward-flow moved that to
 * yp.reward_claim for exactly those reasons; activate-workspace has no such
 * state at all.
 *
 * Everything here touches only `localStorage` and `Visitor`, both read lazily
 * and both guarded, so the module loads (and can be driven with stubs)
 * anywhere.
 */

/** localStorage is unavailable in private mode — never let it break the desk. */
function lsGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* quota/private mode */ }
}
function lsDel(key) {
  try { localStorage.removeItem(key); } catch (e) { /* quota/private mode */ }
}

/**
 * Namespace a scratch key to the signed-in user.
 *
 * localStorage is per browser, but a half-finished walkthrough belongs to one
 * person. These widgets only ever run inside the desk, which requires a
 * session, so an id is always available; the bare key is kept as a fallback so
 * a missing Visitor degrades gracefully rather than writing "<key>:undefined"
 * that nothing reads back.
 */
function userScoped(key) {
  const uid = (typeof Visitor !== "undefined" && Visitor?.id) || "";
  return uid ? `${key}:${uid}` : key;
}

/**
 * A get/set/del trio bound to one user-scoped key.
 *
 * Each flow has one or two scratch values and refers to them constantly, so
 * binding the key once reads better at the call sites than passing it through
 * every call — and it removes the chance of one caller forgetting the
 * namespacing that the others apply.
 *
 * The key is resolved per CALL, not at construction: the store is typically
 * built while the module is being required, which can be before `Visitor` has
 * an id.
 *
 * @param {String} key the un-namespaced key
 * @returns {{get: Function, set: Function, del: Function}}
 */
function makeRunStore(key) {
  return {
    get: () => lsGet(userScoped(key)),
    set: (value) => lsSet(userScoped(key), value),
    del: () => lsDel(userScoped(key)),
  };
}

module.exports = { lsGet, lsSet, lsDel, userScoped, makeRunStore };
