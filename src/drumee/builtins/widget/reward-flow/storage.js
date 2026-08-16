/**
 * Reward-flow scratch state.
 *
 * The storage primitives are shared with every other guided flow (see
 * libs/guided-flow/storage) and re-exported here, so nothing inside this widget
 * has to know where they live. What stays is reward-flow's own: the one key it
 * writes, and the list of keys it used to write.
 *
 * WHAT LIVES HERE, AND WHAT NO LONGER DOES.
 *
 * Eligibility and the resume point are the SERVER's (yp.reward_claim, read via
 * reward.get_state). They used to be localStorage keys, which made "has this
 * user finished" a fact about a BROWSER: it did not follow them to another
 * device, it grew one key per user on a shared machine, and clearing the table
 * could not reset it.
 *
 * What is left is genuinely local: one scratch value describing the walkthrough
 * currently in progress. It is meaningless once that ends, it is deleted at
 * _finish, and storing it server-side would need a column for no benefit. It
 * stays namespaced per user so two people on one browser cannot read each
 * other's half-finished run.
 */
const {
  lsGet, lsSet, lsDel, userScoped,
} = require("../../../libs/guided-flow/storage");

// The workspace created in Step 1. Step 3 reopens it.
const KEY_WORKSPACE = "reward_workspace";

/** Keys this widget used to own and no longer writes — eligibility, which moved
 *  to the server, and `reward_invited`, the latch that let Step 2 offer a plain
 *  Continue before the permission panel itself became Step 2. Purged on mount
 *  so a browser that ran an older build does not keep one dead key per user
 *  forever. */
const LEGACY_PREFIXES = [
  "reward_flow_done", "reward_step", "reward_utm_owner", "reward_invited",
];

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
  KEY_WORKSPACE, LEGACY_PREFIXES,
  lsGet, lsSet, lsDel,
  userScoped, runGet, runSet, runDel, purgeLegacyKeys,
};
