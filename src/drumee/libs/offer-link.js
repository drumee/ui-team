/**
 * Offer code carried by a signup link — `?offer=TEAM1`.
 *
 * The link is opened signed out, usually on the signup page, and the account
 * that will spend the code does not exist yet. So the code is kept in
 * localStorage (it must survive the email-verification step, which opens the
 * app in another tab) until a session exists; the desk then hands it to the
 * server (payment.offer_attach), which holds it for the account until it
 * pays. From there the billing checkout reads it back (payment.offer_pending)
 * and applies it — the stored copy here is only the bridge to that call.
 *
 * Read at boot, before the signin/signup plugins rewrite the hash, like the
 * campaign markers (libs/campaign) and the billing link (libs/billing-deep-link).
 */
const KEY = "drumee_offer";
// What yp.mkt_coupon.code stores (ascii, 64 chars). Anything else is dropped.
const SHAPE = /^[A-Za-z0-9_-]{1,64}$/;

function readUrlOffer() {
  const args = (typeof Visitor !== "undefined" && Visitor?.parseModuleArgs?.()) || {};
  let code = args.offer || "";
  try {
    if (!code) code = new URLSearchParams(location.search).get("offer") || "";
    if (!code) {
      const hash = String(location.hash || "");
      const q = hash.indexOf("?");
      if (q !== -1) code = new URLSearchParams(hash.slice(q + 1)).get("offer") || "";
    }
  } catch (e) { /* no URL API */ }
  code = String(code).trim();
  return SHAPE.test(code) ? code.toUpperCase() : "";
}

/**
 * Remember the offer of the current url, if it carries one. Safe on every load.
 * @returns {string} the code captured from the url, '' if none
 */
function captureOffer() {
  const code = readUrlOffer();
  if (code) {
    try { localStorage.setItem(KEY, code); } catch (e) { /* private mode */ }
  }
  return code;
}

/**
 * Hand the stored offer to the server for the signed-in account. The local
 * copy is dropped once the server has answered either way — kept (OK) or
 * refused (unknown / ended code) — and kept for a later try on a network error.
 *
 * @param {Function} post  (service, params) => Promise, e.g. a view's postService
 * @returns {Promise<string>} the code now held for the account, '' if none
 */
async function attachOffer(post) {
  let code = "";
  try { code = localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  if (!SHAPE.test(code)) return "";
  const svc = typeof SERVICE !== "undefined" && SERVICE.payment && SERVICE.payment.offer_attach;
  if (!svc) return "";
  let res;
  try {
    res = await post(svc, { hub_id: Visitor.id, code });
  } catch (e) {
    return "";
  }
  if (!res || !res.status) return "";
  try { localStorage.removeItem(KEY); } catch (e) { }
  return res.status === "OK" ? res.code || code : "";
}

module.exports = { captureOffer, attachOffer };
