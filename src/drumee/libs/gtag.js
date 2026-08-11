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

/**
 * Conversion labels, per conversion action.
 *
 * A Google Ads conversion is addressed as `AW-18350168481/<label>`, and the
 * label is minted by the Ads console — Goals > Conversions > the action > Tag
 * setup > "Install the tag yourself". It is NOT derivable from anything in this
 * repo, which is why it sits here as data rather than being built at the call
 * site: one place to fill in, and `conversion()` refuses to guess.
 *
 * An empty label means "this action has not been created in Ads yet". That is a
 * supported state, not a broken one: `conversion()` no-ops and says so in the
 * console, so this ships and does nothing until the label exists. Nothing
 * downstream branches on it.
 */
const CONVERSION_LABEL = {
  // Paid Stripe Checkout completed — see billing/result.
  purchase: "",
};

// Transactions already reported, so a reload cannot report them twice.
//
// The Checkout return URL carries ?checkout=success&session_id=… , and it is an
// ordinary URL: refresh it, or restore the tab, and the success modal renders
// again from the same session. Ads dedupes on transaction_id server-side, but
// only within its own window and only once the hit arrives -- cheaper and more
// certain to not send the second hit at all.
//
// sessionStorage, matching billing-deep-link: the lifetime that matters is the
// tab that did the checkout. A different tab re-opening the same URL still
// dedupes on transaction_id at Google's end.
const SENT_KEY = "drumee_gtagConversions";

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

/**
 * Has this transaction already been reported from this tab?
 *
 * Storage itself is the thing most likely to fail here — private mode and
 * blocked storage both throw on access — and the honest answer to a storage we
 * cannot read is "not sent". Reporting a conversion twice is a smaller harm
 * than dropping one, so the failure leans towards sending.
 *
 * @param {String} key transaction identity
 * @returns {Boolean}
 */
function alreadySent(key) {
  try {
    const raw = window.sessionStorage.getItem(SENT_KEY);
    return !!raw && JSON.parse(raw).includes(key);
  } catch (e) {
    return false;
  }
}

/**
 * Record a transaction as reported. Best effort, by the same reasoning.
 *
 * @param {String} key transaction identity
 */
function markSent(key) {
  try {
    const raw = window.sessionStorage.getItem(SENT_KEY);
    const seen = raw ? JSON.parse(raw) : [];
    if (!seen.includes(key)) {
      seen.push(key);
      window.sessionStorage.setItem(SENT_KEY, JSON.stringify(seen));
    }
  } catch (e) {
    // Nothing to do: the next reload may re-report, and Ads dedupes on
    // transaction_id. Never let bookkeeping break the flow being measured.
  }
}

/**
 * Report a Google Ads conversion.
 *
 * @param {String} name key into CONVERSION_LABEL, e.g. "purchase"
 * @param {Object} [params]
 * @param {Number} [params.value] amount in MAJOR units (dollars, not cents)
 * @param {String} [params.currency] ISO 4217, upper case
 * @param {String} [params.transaction_id] unique per transaction; enables the
 *   dedupe above and Google's own
 * @returns {Boolean} true when a hit was sent
 */
function conversion(name, params = {}) {
  // Absence of the tag is checked FIRST, and answered in silence. Off a
  // drumee.com host there is deliberately no tag at all, and someone running
  // this AGPL software on their own domain should not be told about the state
  // of our Ads account on every purchase they take.
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;

  const label = CONVERSION_LABEL[name];
  if (!label) {
    // Loud here, because reaching this line means the tag IS in force and a
    // real conversion just went unreported -- a configuration gap someone has
    // to close, not an expected runtime state.
    console.warn(`[gtag] no Ads label for "${name}" — conversion not reported`);
    return false;
  }

  const { transaction_id } = params;
  const dedupeKey = transaction_id && `${name}:${transaction_id}`;
  if (dedupeKey && alreadySent(dedupeKey)) return false;

  event("conversion", { send_to: `${TAG_ID}/${label}`, ...params });
  if (dedupeKey) markSent(dedupeKey);
  return true;
}

module.exports = { install, event, conversion, isEnabled, TAG_ID };
