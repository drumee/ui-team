/**
 * Google tag (gtag.js) — the Google Ads tag AW-18350168481.
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

module.exports = { install, event, isEnabled, TAG_ID };
