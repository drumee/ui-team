/**
 * Google tag (gtag.js) — the Google Ads tag AW-18350168481 and the GA4
 * stream G-9123HGZ86W.
 *
 * The document itself is not ours to edit: the app boots into a shell served
 * by the backend, and this repo builds bundles, not HTML (there is no
 * html-webpack-plugin and no index.html here). So the head snippet Google
 * hands out is reproduced from JS, at the earliest point a bundle runs —
 * module scope of `index.web.js`, alongside the billing deep-link capture.
 *
 * The two halves of that snippet do different jobs and only one of them is
 * urgent:
 *
 *   the inline part  declares `window.dataLayer` and the `gtag()` shim. It is
 *                    a QUEUE. Everything pushed before the library arrives is
 *                    replayed by it on load, which is why the snippet can call
 *                    `config` on a script that has not downloaded yet.
 *   the loader part  `async` — it lands whenever it lands.
 *
 * We install the queue FIRST and append the loader after, which is the reverse
 * of the order Google prints. The published order works only because the
 * loader is async and the inline block is synchronous; doing it this way the
 * queue provably exists before the library can run, whatever the network does.
 *
 * WHERE IT RUNS — Drumee-operated hosts only, see `TRACKED_HOST`. This is AGPL
 * software that other people deploy on their own domains, and an ad tag
 * compiled into the bundle would otherwise report every one of those
 * deployments to Google under OUR conversion ID: their visitors' traffic
 * leaves their instance, and our Ads reporting fills with conversions no
 * campaign of ours produced. Stage (drumee.in) is excluded by the same rule,
 * which is the point — test signups are not conversions.
 */

const TAG_ID = "AW-18350168481";

// GA4 web stream — the app's OWN property ("app.drumee.com"), separate from
// the drumee.com marketing-site property (G-JWRXMF6HDP) by a deliberate
// product decision: app usage is product analytics, the landing page is
// marketing, and each team reads its own property. The cost is a split
// funnel — a visitor crossing from the landing page into the app starts a
// new session here — so campaign attribution is measured in Google Ads
// (the AW tag + gclid) and in the backend's profile.utm, not in GA4.
// Analytics only; TAG_ID above remains the Ads/conversion tag. The gtag.js
// loader below is shared — one script serves every configured tag.
//
// The app routes by location.hash, so the automatic page_view — which fires
// once per DOCUMENT — would have counted the screen someone landed on and
// nothing they did afterwards, with the hash counting or not depending on
// the property's Enhanced measurement toggle for history-based page changes.
// That is a setting this file cannot see, let alone guarantee, and an app
// property that cannot see in-app navigation has very little to report. So
// the automatic hit is off (send_page_view:false below) and the screens are
// sent explicitly instead — see pageView().
const GA4_ID = "G-9123HGZ86W";
const SRC = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`;

// drumee.com and every subdomain of it (workspaces are `<ident>.drumee.com`).
// Anchored both ends: a lookalike host such as `drumee.com.evil.net` must not
// match, and neither must `notdrumee.com`.
const TRACKED_HOST = /(^|\.)drumee\.com$/i;

// Marks the injected <script> so a second bundle loading into the same
// document (the plugin arch dispatches its own boot) cannot install a second
// copy. Module-level state is not enough on its own — each bundle gets its own
// module instance, but they share one `document`.
const MARKER = "data-drumee-gtag";

let installed = false;

/**
 * Should this document carry the tag?
 *
 * Top frame only. An embedded desk would count a page the host page has
 * already counted, and a cross-origin embed is not a context we want to report
 * from at all. Note `window.top !== window.self` is a safe comparison across
 * origins — reading `top` is allowed, it is reaching INTO it that throws.
 *
 * @returns {Boolean}
 */
function isEnabled() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    if (window.top !== window.self) return false;
    return TRACKED_HOST.test(window.location.hostname);
  } catch (e) {
    // A sandboxed frame can refuse even these reads. "No tag" is the right
    // answer to an environment we cannot inspect.
    return false;
  }
}

/**
 * Install the tag, once.
 *
 * Safe to call from anywhere and at any time: on a host that is not ours, or
 * on a second call, it does nothing and says so.
 *
 * @returns {Boolean} true when this call installed the tag
 */
function install() {
  if (installed || !isEnabled()) return false;
  installed = true;

  if (document.querySelector(`script[${MARKER}]`)) return false;

  const dataLayer = (window.dataLayer = window.dataLayer || []);
  if (typeof window.gtag !== "function") {
    // `dataLayer.push(arguments)` — the Arguments object, deliberately, exactly
    // as Google publishes it. gtag.js reads the pushed value as an
    // array-LIKE whose [0] is the command name; a rest-parameter rewrite
    // (`(...args) => dataLayer.push(args)`) pushes a real Array and every
    // queued command is silently dropped. Hence a function declaration and not
    // an arrow: this needs `arguments`.
    window.gtag = function gtag() {
      dataLayer.push(arguments);
    };
  }

  // A real Date — gtag stamps the load time from it; Dayjs is not a substitute.
  window.gtag("js", new Date());
  window.gtag("config", TAG_ID);
  window.gtag("config", GA4_ID, { send_page_view: false });
  // send_page_view:false suppresses the automatic hit, so the FIRST screen has
  // to be sent by hand or the property never sees a session at all. Everything
  // after it comes from the router; this is the one the router cannot emit,
  // because install() runs from module scope of index.web.js, long before a
  // router exists.
  pageView();

  const el = document.createElement("script");
  el.async = true;
  el.src = SRC;
  el.setAttribute(MARKER, TAG_ID);
  // `document.head` exists from the moment <head> is parsed, and the bundle
  // that runs this is inside the document — but fall back rather than throw if
  // that ever stops being true.
  (document.head || document.documentElement).appendChild(el);
  return true;
}

/**
 * Send an event, if the tag is in force.
 *
 * The reason to route through here rather than calling `window.gtag` directly:
 * on a self-hosted instance there IS no `window.gtag`, so an unguarded call
 * site throws — and it throws inside whatever flow just succeeded, e.g. a
 * completed signup. A no-op is the correct behaviour there.
 *
 * A Google Ads conversion is reported as
 * `event("conversion", { send_to: "AW-18350168481/<label>" })`, with the label
 * coming from the conversion action in the Ads console. No conversion is wired
 * up yet — this is the door for the first one.
 *
 * @param {String} name event name
 * @param {Object} [params] event parameters
 */
function event(name, params = {}) {
  if (!name || typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", name, params);
  } catch (e) {
    // Blocked by an extension, or the library failed to load. Never let
    // measurement break the flow being measured.
    console.warn("[gtag] event not sent", name, e);
  }
}

// The last screen reported, so the same one is not counted twice.
let lastPath = null;

/**
 * Report a screen to GA4.
 *
 * `send_page_view: false` on its own measures NOTHING — no page views, no
 * sessions, no users — so the two belong together and this is the other half.
 * `router/route()` calls it. drumee.com does the same thing for the same
 * reason: its config carries send_page_view:false and its router emits a
 * page_view per route (drumee-landingpage src/lib/analytics.ts). Same param
 * shape here, so the two implementations read alike even though they now
 * report to different properties.
 *
 * What this buys the app property: "welcome/signin", "welcome/signup", "desk"
 * and "desk/billing" arrive as distinct screens however the property is
 * configured, instead of one hit per document plus whatever an Enhanced
 * measurement toggle happens to be set to.
 *
 * @param {String} [path] defaults to the current pathname + hash
 * @param {String} [title] defaults to document.title
 * @returns {Boolean} true when a hit was sent
 */
function pageView(path, title) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;
  const p = path || `${window.location.pathname}${window.location.hash}`;
  // route() runs on boot AND on every hashchange, and a few flows call it again
  // for a URL that has not moved.
  if (p === lastPath) return false;
  lastPath = p;
  event("page_view", { page_path: p, page_title: title || document.title });
  return true;
}

module.exports = { install, event, pageView, isEnabled, TAG_ID, GA4_ID };
