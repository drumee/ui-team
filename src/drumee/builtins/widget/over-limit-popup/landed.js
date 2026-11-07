/**
 * Has the popup's "Resolve now" arrived? It opens one of two full-canvas
 * screens in the desk's settings-main slot, neither of which reports back:
 *
 *   apps_main      the Admin Console (Team / Business) — a lazy chunk
 *   desk_org_view  the organisation screen (Free / Pro)
 *
 * Either one live (not parked with data-anim="out") means the card can go.
 *
 * @param {Document|null} doc
 * @returns {Boolean}
 */
const SLOT = ".desk-module__settings-main-slot";
const TARGETS = ["apps_main", "desk_org_view"].map(
  (k) => `${SLOT} > [data-kind="${k}"]:not([data-anim="out"])`,
);

function resolveLanded(doc) {
  if (!doc || typeof doc.querySelector !== "function") return false;
  try {
    return TARGETS.some((sel) => !!doc.querySelector(sel));
  } catch (e) {
    return false;
  }
}

module.exports = { resolveLanded, TARGETS };
