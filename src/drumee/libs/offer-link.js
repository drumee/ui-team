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
const { stripUrlParams } = require("libs/campaign");

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
    // Taken off the URL once stored: every later route re-reads the URL, and a
    // param left there would re-arm the offer after it has been attached — for
    // whoever signs in next on this browser too.
    stripUrlParams(new Set(["offer"]));
  }
  return code;
}

/**
 * For the router's switch to another host (changeHost): localStorage is per
 * origin, so the stored offer has to travel on the URL, where captureOffer
 * picks it up again on the other side. This origin's copy is dropped.
 * @returns {string} "offer=CODE" to add to the query string, or ""
 */
function offerHandoff() {
  let code = "";
  try { code = localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  if (!SHAPE.test(code)) return "";
  try { localStorage.removeItem(KEY); } catch (e) { }
  return `offer=${encodeURIComponent(code)}`;
}

/**
 * Hand the stored offer to the server for the signed-in account. The local
 * copy is dropped once the server has answered either way — kept (OK) or
 * refused (unknown / ended code) — and kept for a later try on a network error.
 *
 * @param {Function} post  (service, params) => Promise, e.g. a view's postService
 * @returns {Promise<string>} the code now held for the account, '' if none
 */
// The attach in flight, so the billing checkout can wait for it before asking
// for the pending offer — opened right after sign-in it would otherwise ask
// first and find nothing.
let attaching = Promise.resolve("");

function attachOffer(post) {
  attaching = doAttach(post).catch(() => "");
  return attaching;
}

function offerAttached() {
  return attaching;
}

async function doAttach(post) {
  let code = "";
  try { code = localStorage.getItem(KEY) || ""; } catch (e) { return ""; }
  if (!SHAPE.test(code)) return "";
  const svc = typeof SERVICE !== "undefined" && SERVICE.payment?.offer_attach;
  if (!svc) return "";
  let res;
  try {
    res = await post(svc, { hub_id: Visitor.id, code });
  } catch (e) {
    return "";
  }
  if (!res?.status) return "";
  try { localStorage.removeItem(KEY); } catch (e) { }
  return res.status === "OK" ? res.code || code : "";
}

module.exports = { captureOffer, attachOffer, offerAttached, offerHandoff };
