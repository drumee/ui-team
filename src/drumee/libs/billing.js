/**
 * Billing availability — reads the deployment environment so an install that
 * cannot sell plans never renders an upgrade CTA.
 *
 * Two independent signals, both required:
 *
 *  1. `Platform.arch` — the product-level discriminator already used across the
 *     app for cloud-only features (signin "forgot password", member password
 *     reset…). `cloud` = the hosted SaaS that sells plans; `pod` = a
 *     self-hosted install, which has no Stripe account behind it.
 *
 *  2. `SERVICE.payment` — the runtime signal that the payment BACKEND is
 *     actually loaded here. `SERVICE` is merged at bootstrap from
 *     `Platform.get('services')` (drumee.js `init_globals`) and the local
 *     `lex/services.json` fallback carries no `payment` entry, so this key
 *     exists only when the server really exposes the module. It is what
 *     decides whether `payment.checkout` can succeed at all.
 *
 * Signal 2 alone would be enough to avoid a hard dead-end, but 1 keeps the
 * product decision explicit and consistent with the rest of the codebase.
 *
 * `arch` defaults to 'cloud' when the platform payload is incomplete: the
 * hosted install is the common case, and signal 2 still gates the CTA, so the
 * default cannot surface a button that has no backend behind it.
 */
function billingAvailable() {
  const arch =
    (typeof Platform !== "undefined" && Platform && Platform.get
      ? Platform.get("arch")
      : null) || "cloud";
  if (arch !== "cloud") return false;
  return !!(
    typeof SERVICE !== "undefined" &&
    SERVICE &&
    SERVICE.payment &&
    SERVICE.payment.checkout
  );
}

/**
 * May the CALLER open the plans page? Environment (above) plus the ownership
 * rule: billing is owner-managed, so inside an organization (domain_id > 1)
 * only the org OWNER may change the plan — a member or workspace admin would
 * dead-end, or worse bootstrap a stray second org through the TEAM checkout
 * (`payment.checkout` resolves the org by owner_id). Personal accounts
 * (domain 1) always qualify: they upgrade themselves.
 *
 * Single source of truth for the sidebar entry, its service handler, and any
 * other upgrade affordance — they must never disagree.
 */
function canUpgradePlan() {
  if (!billingAvailable()) return false;
  const quota =
    (typeof Visitor !== "undefined" && Visitor && Visitor.quota
      ? Visitor.quota()
      : null) || {};
  if (~~quota.domain_id <= 1) return true;
  return !!(Visitor && Visitor.domainCan && Visitor.domainCan(_K.permission.owner));
}

module.exports = { billingAvailable, canUpgradePlan };
