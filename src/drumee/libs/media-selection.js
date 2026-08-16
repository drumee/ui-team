/**
 * How a trash action divides the current selection, and when it has to ask
 * first.
 *
 * "Move to trash" does not act on the item the user right-clicked. It acts on
 * the whole selection — `Wm.getGlobalSelection()`, every list child whose
 * `_a.state` is truthy — and merely adds the clicked item if it was not already
 * in there. Which bucket each item lands in decides what happens to it, and the
 * buckets are not equivalent: some raise a dialog naming the item, one is
 * carried out immediately and silently.
 *
 * That decision is pure, and it is the part worth pinning down, so it lives
 * here rather than inline in the window manager (which cannot be required
 * outside webpack, so nothing in it can be tested). The caller reads the live
 * item — its status, its privileges, whether it is a hub — into a plain row and
 * asks these functions what to do with it.
 */

/** The buckets, and what the window manager does with each. Exported so a
 *  caller can build the empty shape without repeating the list. */
const BUCKETS = [
  // A hub the caller owns → confirmRemoveHub, one dialog each, naming it. This
  // DESTROYS the workspace; it is not a trash.
  "own_hubs",
  // A hub belonging to someone else → confirmLeaveHub, one dialog each.
  "other_hubs",
  // A folder with a hub somewhere inside → confirmRemoveHubsInside.
  "hubs_inside",
  // Everything disposable: files, and folders with no hub in them. Trashed
  // WITHOUT a dialog of their own — see needsBulkConfirm.
  "allowed",
  // Not disposable by this caller. Told so, and nothing happens.
  "rejected",
  // Locked. Told so, and nothing happens.
  "locked",
];

/**
 * Which bucket one item belongs in.
 *
 * The order of the tests is the behaviour and is deliberately preserved from the
 * window manager's original inline version: `locked` wins over everything, a hub
 * is judged on ownership alone (its `canRemove` is never consulted), and a folder
 * containing a hub is neither trashed nor rejected but routed to its own
 * question.
 *
 * @param {{locked: Boolean, isHub: Boolean, isOwner: Boolean, isFolder: Boolean,
 *          containsHub: Boolean, canRemove: Boolean}} row what the live item says
 *   about itself. Absent flags read as false, so a caller may pass only what
 *   applies.
 * @returns {String} one of BUCKETS
 */
function bucketFor(row = {}) {
  if (row.locked) return "locked";
  if (row.isHub) return row.isOwner ? "own_hubs" : "other_hubs";
  if (row.isFolder && row.containsHub) return "hubs_inside";
  return row.canRemove ? "allowed" : "rejected";
}

/**
 * Build the empty bucket shape.
 *
 * @returns {Object<String, Array>}
 */
function emptyBuckets() {
  const out = {};
  for (const b of BUCKETS) out[b] = [];
  return out;
}

/**
 * Does this action need one confirmation up front, before anything happens?
 *
 * The problem it answers: the `allowed` bucket is trashed with no dialog at all,
 * and the selection that fills it is not necessarily anything the user chose
 * deliberately — it is whatever was left with `_a.state` set, which has leaked in
 * the past and can leak again. One stale selection was enough to take a file
 * with no question asked.
 *
 * So: ASK ONCE when the action would trash more than one thing and at least one
 * of them would otherwise go silently.
 *
 * Both halves matter.
 *
 *   `allowed` non-empty — there is something here that has no dialog of its own.
 *     A selection of nothing but hubs already asks per item, naming each one, so
 *     gating it too would just add a click in front of questions the user is
 *     about to be asked anyway.
 *
 *   more than one actionable item — a single deliberate trash is the everyday
 *     action and must stay one gesture. This is what keeps the fix from taxing
 *     the common case: right-click one file, trash it, done, exactly as before.
 *
 * @param {Object} buckets as returned by the caller's split
 * @returns {Boolean}
 */
function needsBulkConfirm(buckets = {}) {
  const len = (k) => (buckets[k] || []).length;
  if (!len("allowed")) return false;
  const actionable =
    len("allowed") + len("own_hubs") + len("other_hubs") + len("hubs_inside");
  return actionable > 1;
}

/**
 * How many items the action would actually touch. For the confirmation's wording,
 * so it can say what it is about to do rather than asking in the abstract.
 *
 * `rejected` and `locked` are excluded: nothing happens to those, the user is
 * merely told, so counting them would overstate the damage.
 *
 * @param {Object} buckets
 * @returns {Number}
 */
function actionableCount(buckets = {}) {
  const len = (k) => (buckets[k] || []).length;
  return len("allowed") + len("own_hubs") + len("other_hubs") + len("hubs_inside");
}

module.exports = {
  BUCKETS, bucketFor, emptyBuckets, needsBulkConfirm, actionableCount,
};
