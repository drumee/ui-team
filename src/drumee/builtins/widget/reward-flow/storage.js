/**
 * Reward-flow scratch state.
 *
 * Split out of index.js for the same reason as steps.js: index.js extends the
 * `LetcBox` global and cannot be required under bare Node, so none of this
 * could be exercised without a browser. Everything here touches only
 * `localStorage` and `Visitor`, both read lazily and both guarded, so the
 * module loads (and can be driven with stubs) anywhere.
 *
 * WHAT LIVES HERE, AND WHAT NO LONGER DOES.
 *
 * Eligibility and the resume point are the SERVER's (yp.reward_claim, read via
 * reward.get_state). They used to be localStorage keys, which made "has this
 * user finished" a fact about a BROWSER: it did not follow them to another
 * device, it grew one key per user on a shared machine, and clearing the table
 * could not reset it.
 *
 * What is left is genuinely local: two scratch values describing the
 * walkthrough currently in progress. They are meaningless once it ends, they
 * are deleted at _finish, and storing them server-side would need columns for
 * no benefit. They stay namespaced per user so two people on one browser cannot
 * read each other's half-finished run.
 */

// Latched when the user invites a member from the Step 1 permission panel, so
// Step 2 has nothing left to ask for.
const KEY_INVITED = "reward_invited";
// The workspace created in Step 1. Step 3 reopens it.
const KEY_WORKSPACE = "reward_workspace";

/** Keys this widget used to own before eligibility moved to the server. Purged
 *  on mount so a browser that ran the old build does not keep one dead
 *  `reward_flow_done:<uid>` per user forever. */
const LEGACY_PREFIXES = ["reward_flow_done", "reward_step", "reward_utm_owner"];

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
 * person. The widget only ever runs inside the desk, which requires a session,
 * so an id is always available; the bare key is kept as a fallback so a missing
 * Visitor degrades gracefully rather than writing "<key>:undefined" that
 * nothing reads back.
 */
function userScoped(key) {
  const uid = (typeof Visitor !== "undefined" && Visitor && Visitor.id) || "";
  return uid ? `${key}:${uid}` : key;
}

function runGet(key) { return lsGet(userScoped(key)); }
function runSet(key, value) { lsSet(userScoped(key), value); }
function runDel(key) { lsDel(userScoped(key)); }

/**
 * Drop every key from the pre-server-eligibility build.
 *
 * Matches on prefix because those keys were namespaced per user, so a shared
 * browser accumulated one apiece — exactly the growth that motivated moving
 * eligibility to the server. Iterating a snapshot of the key list keeps the
 * removals from disturbing the index as we walk it.
 */
function purgeLegacyKeys() {
  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (LEGACY_PREFIXES.some((p) => k === p || k.startsWith(`${p}:`))) {
        lsDel(k);
      }
    }
  } catch (e) { /* private mode, or no enumerable storage — nothing to clean */ }
}

module.exports = {
  KEY_INVITED, KEY_WORKSPACE, LEGACY_PREFIXES,
  lsGet, lsSet, lsDel,
  userScoped, runGet, runSet, runDel, purgeLegacyKeys,
};
