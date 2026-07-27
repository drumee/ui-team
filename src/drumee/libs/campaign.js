/**
 * Marketing campaign attribution — persists the utm params a campaign email
 * put on its CTA, so the in-app flow that email advertises can gate itself.
 *
 * Today the only consumer is the reward flow: `reward_flow.isEligible()`
 * (builtins/widget/reward-flow) mounts the "Claim your free storage"
 * walkthrough only when the stored marker carries its own campaign name.
 *
 * The claim-reward email targets users who ALREADY have accounts, so the click
 * usually lands on the desk with a live session — the signup app never runs
 * and cannot be the one to record the marker. Hence two call sites:
 *
 *   welcome/index.js  — signed-out click, alongside the return_to / hub_id
 *                       deep-link captures. localStorage survives the
 *                       post-login full page reload on its own, so unlike
 *                       return_to this needs no sessionStorage relay.
 *   desk/index.js     — signed-in click. The main audience.
 *
 * KEEP IN SYNC with `captureUtm` in signup/src/widgets/router/index.js: same
 * key, same shape, same clamp. signup is a separate repo, so the contract is
 * duplicated rather than shared — a drift on either side silently breaks the
 * campaign.
 */

const KEY = "drumee_utm";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign"];
// Long enough for any real campaign name, short enough that a crafted link
// cannot bloat localStorage.
const MAX_LEN = 64;

/**
 * Record the campaign markers on the current URL, if any.
 *
 * Hash args win over the query string: parseModuleArgs is how the rest of the
 * app reads deep-link intent, and a link carrying both is stating the hash one
 * deliberately.
 *
 * Absent params are NOT a signal to forget an earlier campaign — the user
 * clicked through once and may take several visits to finish the flow — so a
 * param-less load leaves any stored marker untouched and simply returns it.
 *
 * @returns {Object} the markers now in force, `{}` when none were ever seen
 */
function captureUtm() {
  // Guarded like the other libs/ globals (see libs/billing): a lib must not
  // assume bootstrap has run, and this one promises never to throw. The typeof
  // test has to stay in front of the optional chain — `Visitor?.x` still throws
  // a ReferenceError when Visitor was never declared at all.
  const args = (typeof Visitor !== "undefined" && Visitor?.parseModuleArgs?.()) || {};
  let search = null;
  try { search = new URLSearchParams(location.search); } catch (e) { /* no URL API */ }

  let utm = {};
  for (const k of PARAMS) {
    const v = args[k] || search?.get(k) || "";
    if (v) utm[k] = String(v).trim().slice(0, MAX_LEN);
  }

  try {
    if (Object.keys(utm).length) {
      localStorage.setItem(KEY, JSON.stringify(utm));
    } else {
      utm = JSON.parse(localStorage.getItem(KEY) || "{}");
    }
  } catch (e) {
    // Private mode, quota, or a corrupt value: fall back to whatever we parsed
    // off the URL. Worst case the flow does not trigger — never a throw that
    // takes the desk down with it.
  }
  return utm;
}

module.exports = { captureUtm };
