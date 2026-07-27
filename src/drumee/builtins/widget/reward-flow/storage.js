/**
 * Reward-flow persistence.
 *
 * Split out of index.js for the same reason as steps.js: index.js extends the
 * `LetcBox` global and cannot be required under bare Node, so none of this
 * could be exercised without a browser. Everything here touches only
 * `localStorage` and `Visitor`, both read lazily and both guarded, so the
 * module loads (and can be driven with stubs) anywhere.
 *
 * The important rule this file encodes: run state is PER USER, not per browser.
 */

const KEY_DONE = "reward_flow_done";
const KEY_STEP = "reward_step";
// Latched when the user invites a member from the Step 1 permission panel, so
// Step 2 has nothing left to ask for. Persisted alongside the step so a reload
// mid-flow doesn't send them back to the invite popup.
const KEY_INVITED = "reward_invited";
// The workspace created in Step 1. Step 3 reopens it, so it must survive a
// reload the same way the step itself does.
const KEY_WORKSPACE = "reward_workspace";

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
 * Namespace a run key to the signed-in user.
 *
 * The run keys describe ONE PERSON's progress, but localStorage is per BROWSER.
 * Unscoped, the first user to finish or drop the walkthrough latched
 * reward_flow_done for everyone who signed in on that machine afterwards — and
 * that key is never cleared, so user 2 could click the campaign CTA, log in,
 * and silently get nothing. Shared laptops, demo machines and two testers on
 * one box all hit this.
 *
 * Visitor.id is the signed-in user. The gate and the widget only ever run
 * inside the desk, which requires a session, so an id is always available; the
 * bare key is kept as a fallback so a missing Visitor degrades to the old
 * behaviour rather than writing "<key>:undefined" that nothing reads back.
 */
function userScoped(key) {
  const uid = (typeof Visitor !== "undefined" && Visitor && Visitor.id) || "";
  return uid ? `${key}:${uid}` : key;
}

/** Per-user run-state accessors. The campaign marker (drumee_utm) is
 *  deliberately NOT routed through these: it is written by libs/campaign
 *  captureUtm() before anyone is signed in, and its key is a contract shared
 *  with the signup repo. */
function runGet(key) { return lsGet(userScoped(key)); }
function runSet(key, value) { lsSet(userScoped(key), value); }
function runDel(key) { lsDel(userScoped(key)); }

/**
 * Adopt a pre-scoping `reward_flow_done` for the current user, once.
 *
 * Without this every user who already completed the flow would see it again on
 * their next desk load, because their "done" sits under the old bare key that
 * nothing reads any more (and drumee_utm survives _finish, so no second CTA
 * click is even needed to re-trigger it).
 *
 * The legacy key does not record WHO finished, so this assigns it to whoever
 * loads the desk first and then removes it. On a single-user browser — the
 * overwhelmingly common case — that is exactly right. On a shared one it can
 * mark the wrong person done, but only once and only for that one user: the
 * legacy key is gone afterwards, so everyone else is judged on their own key.
 * Strictly better than the bug it replaces, which mislabelled EVERY later user
 * forever.
 */
function migrateLegacyDone() {
  const scoped = userScoped(KEY_DONE);
  // No id yet, so the "scoped" key IS the legacy one: there is nothing to move,
  // and the delete below would throw the latch away and re-show a finished
  // flow. Bail rather than corrupt it.
  if (scoped === KEY_DONE) return;
  if (lsGet(KEY_DONE) !== "1") return;
  if (lsGet(scoped) !== "1") lsSet(scoped, "1");
  lsDel(KEY_DONE);
}

module.exports = {
  KEY_DONE, KEY_STEP, KEY_INVITED, KEY_WORKSPACE,
  lsGet, lsSet, lsDel,
  userScoped, runGet, runSet, runDel, migrateLegacyDone,
};
