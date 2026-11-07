/**
 * Has "Resolve now" arrived? The banner's CTA opens one of two things, neither
 * of which reports back:
 *
 *   Team / Business  the Admin Console — `apps_main` in the desk's full-canvas
 *                    slot, live (not parked with data-anim="out")
 *   Free / Pro       the over-limit popup — its card, portalled to <body>
 *
 * Either one on screen means the click landed and the CTA can stop spinning.
 *
 * @param {Document|null} doc
 * @returns {Boolean}
 */
const CONSOLE = '.desk-module__settings-main-slot > [data-kind="apps_main"]:not([data-anim="out"])';
const POPUP = ".over-limit-popup__card";

function landed(doc) {
  if (!doc || typeof doc.querySelector !== "function") return false;
  try {
    return !!(doc.querySelector(CONSOLE) || doc.querySelector(POPUP));
  } catch (e) {
    return false;
  }
}

module.exports = { landed, CONSOLE, POPUP };
