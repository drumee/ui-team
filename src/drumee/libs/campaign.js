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
// A Set: this is read as a membership test far more often than it is iterated,
// and insertion order is preserved, so the `for ... of` below is unaffected.
const PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign"]);
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
/**
 * The markers on THIS navigation's URL, and nothing else.
 *
 * Kept separate from captureUtm's stored fallback: "what campaign has this
 * browser ever seen" and "did this particular arrival come from a campaign
 * link" are different questions, and only the URL can answer the second.
 *
 * Guarded like the other libs/ globals (see libs/billing): a lib must not
 * assume bootstrap has run, and this one promises never to throw. The typeof
 * test has to stay in front of the optional chain — `Visitor?.x` still throws
 * a ReferenceError when Visitor was never declared at all.
 */
function readUrlMarkers() {
  const args = (typeof Visitor !== "undefined" && Visitor?.parseModuleArgs?.()) || {};
  let search = null;
  try { search = new URLSearchParams(location.search); } catch (e) { /* no URL API */ }

  const utm = {};
  for (const k of PARAMS) {
    const v = args[k] || search?.get(k) || "";
    if (v) utm[k] = String(v).trim().slice(0, MAX_LEN);
  }
  return utm;
}

function captureUtm() {
  let utm = readUrlMarkers();

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

/**
 * Session-scoped proof that THIS visit arrived on a campaign link.
 *
 * Separate from the localStorage marker above, and deliberately so. That one is
 * attribution — which campaign this browser last saw, kept indefinitely. This
 * one answers a narrower question the reward gate needs: did the user actually
 * follow the CTA on the way in? Being on the recipient list is an invitation;
 * clicking is the entitlement.
 *
 * sessionStorage is the right shelf for it. It survives the FULL PAGE RELOAD
 * that signing in triggers — the same reason welcome/index.js relays
 * drumee_secure_share_return and drumee_hubDeepLink through it — but it dies
 * with the tab, so it cannot accumulate one key per user, leak to the next
 * person to sign in, or go quietly stale the way a localStorage latch does.
 */
const ARRIVAL_KEY = "drumee_campaign_arrival";

/**
 * Take the campaign params back out of the URL once they have been recorded.
 *
 * Without this the address bar keeps them for the life of the tab, and since
 * every boot and every route re-reads the URL, a plain reload — or a restored
 * session, or signing in again — looks exactly like a fresh click. That is how
 * a user who never touched the CTA ended up being handed the flow.
 *
 * replaceState, not assignment: it rewrites the URL WITHOUT firing hashchange,
 * so tidying up cannot kick off another routing pass. Only the utm keys are
 * removed; any other deep-link args on the hash are left exactly as they were.
 */
function stripCampaignParams() {
  if (typeof history === "undefined" || !history.replaceState) return;
  try {
    const drop = (qs) =>
      qs.split("&").filter((p) => p && !PARAMS.has(p.split("=")[0])).join("&");

    const hash = location.hash || "";
    const qi = hash.indexOf("?");
    let nextHash = hash;
    if (qi >= 0) {
      const kept = drop(hash.slice(qi + 1));
      nextHash = kept ? `${hash.slice(0, qi)}?${kept}` : hash.slice(0, qi);
    }

    const search = location.search || "";
    let nextSearch = search;
    if (search.length > 1) {
      const kept = drop(search.slice(1));
      nextSearch = kept ? `?${kept}` : "";
    }

    if (nextHash === hash && nextSearch === search) return;
    history.replaceState(null, "", `${location.pathname}${nextSearch}${nextHash}`);
  } catch (e) {
    // Recoverable, and deliberately not rethrown: this runs inside the router's
    // boot and route, so a throw here would break navigation itself. The marker
    // is already stored by the caller, so the only cost of failing to tidy the
    // URL is that a later load of the same address counts as a fresh arrival.
    console.warn("[campaign] could not strip the campaign params from the URL", e);
  }
}

/**
 * Record the campaign this visit arrived on, if any.
 *
 * Must run BEFORE anything can rewrite the hash — the signin plugin replaces it
 * wholesale with "#/welcome/signin" and would erase the markers.
 *
 * Called from the router BOTH at boot and on every route: a click that lands in
 * a tab where the app is already running is a same-document navigation, so only
 * hashchange fires and initialize() never runs again. Capturing at boot alone
 * silently missed exactly that case — the commonest one, since the recipient is
 * usually already sitting on a Drumee page. Routing from a module is no better:
 * it is skipped when the module is already mounted and only route() re-runs.
 *
 * Reads the URL DIRECTLY rather than going through captureUtm, whose stored
 * fallback is right for attribution and wrong here: it would make every later
 * page load look like a fresh click, and a browser still holding someone else's
 * stored campaign would manufacture a click for whoever signed in next.
 */
function captureCampaignArrival() {
  const campaign = readUrlMarkers().utm_campaign;
  if (!campaign) return;
  try {
    sessionStorage.setItem(ARRIVAL_KEY, campaign);
  } catch (e) { /* private mode — the gate simply will not open */ }
  // Consume the URL itself, so this arrival is counted once and not re-counted
  // on every subsequent load of the same address.
  stripCampaignParams();
}

/**
 * Read the arrival marker, optionally consuming it.
 * @param {Boolean} [consume] remove it, once it has been recorded server-side
 * @returns {String} the campaign arrived on, "" when this visit did not
 */
function campaignArrival(consume) {
  let v = "";
  try {
    v = sessionStorage.getItem(ARRIVAL_KEY) || "";
    if (v && consume) sessionStorage.removeItem(ARRIVAL_KEY);
  } catch (e) {
    // sessionStorage is unavailable (private mode) or the read was refused.
    // Recovering as "no arrival" is the safe answer rather than a rethrow: the
    // caller is a gate, and it should stay shut rather than open on a guess.
    console.warn("[campaign] sessionStorage unreadable, treating as no arrival", e);
    v = "";
  }
  return v;
}

module.exports = { captureUtm, captureCampaignArrival, campaignArrival, ARRIVAL_KEY };
