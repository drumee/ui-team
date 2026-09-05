/**
 * The "run this in-window tour once the desk is up" intent.
 *
 * Armed from the URL by the router (`?window_tutorial=<id>`), consumed by the
 * desk once Home has settled, which opens a workspace if none is and then hands
 * the tour to that workspace's folder window.
 *
 * WHY THIS EXISTS AT ALL — two faults it fixes, both of which made the URL do
 * nothing whatsoever, silently:
 *
 *   the hash is rewritten   By the time the desk is up, `location.hash` reads
 *                           `#/desk`; the query is gone. Reading the URL late —
 *                           which is what the folder window's buildContent did —
 *                           always parsed an empty arg set. The router already
 *                           faces this for campaign and billing links and solves
 *                           it by capturing EARLY (captureCampaignArrival,
 *                           billingDeepLink.captureFromUrl); this is the same
 *                           idiom, at the same two call sites, for the same
 *                           reason.
 *
 *   there may be no window  The old hook lived in `__window_folder.buildContent`,
 *                           so with nothing open — the desk's home grid, which
 *                           desk/index.js documents as an ordinary state — it was
 *                           never called. Worst for `?window_tutorial=workspace`:
 *                           the tour that teaches CREATING a workspace could not
 *                           run in the state where you have none.
 *
 * IN MEMORY, not sessionStorage — unlike hub-deep-link, which has to survive the
 * full page reload that signing in triggers. This intent's whole trigger is the
 * URL of the current load, so it must die with it: persisting it would replay a
 * QA preview on the user's next navigation, which is exactly the surprise the
 * `preview` flag exists to avoid.
 *
 * Every entry point is defensive: `Visitor` may not exist yet on the earliest
 * call, and a boot that throws here would take the whole app down for a
 * debugging affordance.
 */

// Relative, not the `builtins` webpack alias: this module is loaded directly by
// a plain-node test, which has no alias table. Same reasoning as preview.js's
// own require of the tour registry.
const { previewRequest } = require("../builtins/window/tutorial/preview");

let _intent = null;

/**
 * Read the URL and remember any tour it names.
 *
 * WRITE-ONLY-ON-HIT, and that is the load-bearing detail. The router calls this
 * again on the rewritten `#/desk`, which names no tour; if a miss cleared the
 * field, the intent taken from the real URL would be destroyed before the desk
 * could ever consume it — reintroducing the bug this module exists to fix.
 *
 * @returns {Boolean} whether an intent is now armed
 */
function captureFromUrl() {
  try {
    const req = previewRequest(Visitor.parseModuleArgs());
    if (req) _intent = req;
  } catch (e) {
    // No Visitor yet, or a malformed hash. Either way there is no tour to run,
    // and boot must not care.
  }
  return !!_intent;
}

/** Is a tour waiting? Peek — does not consume. */
function has() {
  return !!_intent;
}

/**
 * Take the intent, if there is one.
 *
 * ONE-SHOT. Two things could plausibly consume it — the desk after Home
 * settles, and (were the folder hook ever restored) a mounting window — and a
 * tour must not be mounted twice. Whoever asks first wins; everyone else gets
 * null.
 *
 * @returns {{tour: String, opt: Object}|null}
 */
function take() {
  const i = _intent;
  _intent = null;
  return i;
}

/** Test seam only — never called by app code. */
function __reset() {
  _intent = null;
}

module.exports = { captureFromUrl, has, take, __reset };
