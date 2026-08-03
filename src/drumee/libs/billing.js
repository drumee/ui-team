/**
 * Billing availability — reads the deployment environment so an install that
 * cannot (or should not) sell plans never renders an upgrade CTA.
 *
 * Decided in this order:
 *
 *  1. `SERVICE.payment` — capability floor. The runtime signal that the
 *     payment BACKEND is actually loaded here: `SERVICE` is merged at
 *     bootstrap from `Platform.get('services')` (drumee.js `init_globals`)
 *     and the local `lex/services.json` fallback carries no `payment` entry,
 *     so the key exists only when the server really exposes the module. No
 *     backend, no CTA — nothing below can override this.
 *
 *  2. `Platform.billing_upgrade` — the operator's explicit on/off switch,
 *     set as `billing_upgrade` in /etc/drumee/conf.d/myDrumee.json. Wins over
 *     the arch rule so a pod that DOES have Stripe can turn billing on, and a
 *     cloud install can be switched off without touching anything else.
 *
 *  3. `Platform.arch` — the fallback when the switch is unset: the
 *     product-level discriminator already used across the app for cloud-only
 *     features (signin "forgot password", member password reset…). `cloud` =
 *     the hosted SaaS that sells plans; `pod` = self-hosted, no Stripe behind
 *     it. Defaults to 'cloud' when the payload is incomplete — the hosted
 *     install is the common case, and step 1 still gates the CTA.
 */
function billingAvailable() {
  // Capability floor: without the payment backend nothing can be bought here,
  // whatever the operator asked for. Checked first so an explicit ON can never
  // surface a CTA that is guaranteed to dead-end.
  const hasBackend = !!(
    typeof SERVICE !== "undefined" &&
    SERVICE &&
    SERVICE.payment &&
    SERVICE.payment.checkout
  );
  if (!hasBackend) return false;

  // Explicit operator switch — `billing_upgrade` in the deployment's
  // /etc/drumee/conf.d/myDrumee.json, forwarded by the server in the platform
  // payload. Unset (the default) means "decide from arch below", so existing
  // installs keep today's behaviour without setting anything.
  const flag = envFlag();
  if (flag !== null) return flag;

  const arch =
    (typeof Platform !== "undefined" && Platform && Platform.get
      ? Platform.get("arch")
      : null) || "cloud";
  return arch === "cloud";
}

/**
 * The `billing_upgrade` switch as a tri-state: true (force on), false (force
 * off), or null (unset — fall back to the arch rule).
 *
 * Tolerant on purpose: myDrumee.json is hand-edited, so 1 / "1" / true /
 * "true" / "on" / "yes" all mean on and 0 / "0" / false / "false" / "off" /
 * "no" all mean off. An unrecognised value is treated as unset rather than
 * silently disabling billing — a typo must not take the CTA away.
 */
function envFlag() {
  const raw =
    typeof Platform !== "undefined" && Platform && Platform.get
      ? Platform.get("billing_upgrade")
      : undefined;
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  const s = String(raw).trim().replace(/^"|"$/g, "").toLowerCase();
  if (["1", "true", "on", "yes", "enabled"].includes(s)) return true;
  if (["0", "false", "off", "no", "disabled"].includes(s)) return false;
  return null;
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

/**
 * Admin Console is an org-tier feature (yp.plan entity_type=org → `team`).
 * Personal plans must upsell first.
 *
 * Gate by plan NAME, not `quota.organization`: Pro seeds organization:1 /
 * seat:5 too (live Pro accounts show organization=1), so that flag cannot
 * separate personal from org. Blacklist personal codes so future org tiers
 * (business / company / …) keep access without a FE whitelist update.
 * Legacy `advanced` maps to free in billing UI.
 */
function needsAdminConsoleUpgrade(plan) {
  const fromVisitor =
    typeof Visitor !== "undefined" && Visitor && Visitor.quota
      ? (Visitor.quota() || {}).plan
      : null;
  const raw =
    plan != null && String(plan).trim() !== "" ? plan : fromVisitor;
  const name = String(raw || "free").toLowerCase();
  // Only Free is below the console now. `pro` was the B2C tier; the 2026-07
  // pricing rebuild retired it and moved every legacy Pro / Drumee Plus row
  // onto the Team entitlement, so those users DO get the console — keeping
  // 'pro' here would upsell people who are already entitled.
  return /^(free|advanced)$/.test(name);
}

/**
 * Normalise whatever sits in `quota.plan` onto one of the four plan keys the
 * product actually has: free | team | business | sovereign.
 *
 * Needed because quota.plan is NOT a closed set. Alongside the current codes
 * it still carries the retired B2C tier ('pro') and hand-granted free-text
 * names from before the Stripe catalog ('Pro', 'Drumee Plus', 'advanced').
 * The 2026-07 pricing rebuild moves those onto the Team entitlement, so they
 * must READ as Team everywhere too — otherwise the sidebar badge and the
 * settings card would name a plan that no longer exists.
 *
 * Defaults to 'free': an unknown name must never imply a paid tier.
 */
function planKey(plan) {
  const raw =
    plan != null && String(plan).trim() !== ""
      ? plan
      : (typeof Visitor !== "undefined" && Visitor && Visitor.quota
          ? (Visitor.quota() || {}).plan
          : null);
  const name = String(raw || "free").trim().toLowerCase();
  if (/^(team|pro|drumee plus)$/.test(name)) return "team";
  if (name === "business") return "business";
  if (name === "sovereign" || name === "enterprise") return "sovereign";
  return "free";
}

/**
 * Display name for a plan, localised. Single source of truth for every badge
 * and card, so they can't drift apart or capitalise a raw DB value.
 */
function planLabel(plan) {
  const key = planKey(plan);
  return (
    {
      free: LOCALE.FREE,
      team: LOCALE.TEAM,
      business: LOCALE.BUSINESS,
      sovereign: LOCALE.SOVEREIGN,
    }[key] || LOCALE.FREE
  );
}

/** Does this plan sit on a paid tier? */
function isPaidPlan(plan) {
  return planKey(plan) !== "free";
}

/**
 * Free plan: solo only — no Admin Console, no member invites.
 *
 * Do NOT treat a missing/unloaded `quota.seat` as Free (that would block Team
 * invites during bootstrap). Require an explicit Free plan name or seat===0.
 */
function isFreeSoloPlan() {
  const quota =
    (typeof Visitor !== "undefined" && Visitor && Visitor.quota
      ? Visitor.quota()
      : null) || {};
  const plan = quota.plan;
  if (plan != null && String(plan).trim() !== "" && planKey(plan) === "free") {
    return true;
  }
  return quota.seat === 0 || quota.seat === "0";
}

/**
 * Org-member headcount for the Team seat cap.
 *
 * Seat budget = organisation members (`member_add` / Admin create), NOT
 * workspace invites (`hub.invite` / desk invite_popup). Callers must only
 * use this from Admin org-member flows.
 *
 * Shared with admin-console `toolkit/billing` (plugin cannot require host).
 *
 * @param {Object} view - members page (has `_membersTotal` and/or admin.member_stats)
 * @returns {Promise<number|null>} null when unknown (caller decides fail-open/closed)
 */
async function _orgMemberUsed(view) {
  const local = view && view._membersTotal;
  if (local != null && local !== "") {
    return parseInt(local, 10) || 0;
  }
  if (!view || typeof view.fetchService !== "function") return null;
  try {
    const stats = await view.fetchService(SERVICE.admin.member_stats, {});
    return (
      parseInt(
        (stats && (stats.total_members ?? stats.totalMembers)) || 0,
        10,
      ) || 0
    );
  } catch (e) {
    try {
      const list =
        view.getItemsByKind && view.getItemsByKind("widget_members_list")[0];
      if (list) {
        const items =
          (typeof list.getItems === "function" && (await list.getItems())) ||
          (list.collection && list.collection.models) ||
          [];
        const used = Array.isArray(items) ? items.length : 0;
        if (used > 0) return used;
      }
    } catch (e2) {}
    return null;
  }
}

/**
 * Team (finite) org-member seat cap reached?
 *
 * Use ONLY before Admin org-member create (`loadCreateMember` / member_form).
 * Do NOT call from desk / media / hub invite_popup — those use hub.invite and
 * are outside the org seat budget.
 *
 * Product:
 *  - Free → false here. Free still must not create org members; callers use
 *    `isFreeSoloPlan()` and must NOT show this seat-limit popup.
 *  - Team (e.g. seat=10) → true once org headcount ≥ cap → Upgrade/Cancel card.
 *  - Business / unlimited (seat ≥ 100000) → false.
 *
 * When headcount cannot be read on an Admin members page, fail CLOSED so the
 * user is not sent into a form that only dies on `member_add`. Server also
 * enforces via `_assertSeatAvailable`.
 *
 * The Upgrade card itself is owner-only — see `canShowSeatLimitPopup`.
 *
 * @param {Object} view - Admin members widget (`_membersTotal` / member_stats)
 * @returns {Promise<boolean>}
 */
async function isOrgSeatLimitReached(view) {
  // Free: no Team seat-limit popup (org create is blocked separately).
  if (isFreeSoloPlan()) return false;

  const quota =
    (typeof Visitor !== "undefined" && Visitor && Visitor.quota
      ? Visitor.quota()
      : null) || {};
  const seat = parseInt(quota.seat, 10) || 0;
  // Quota not loaded yet, or no finite cap → do not block as Team-full.
  if (!seat) return false;
  // Business (and similar) use a huge sentinel = unlimited members.
  if (seat >= 100000) return false;

  const used = await _orgMemberUsed(view);
  // Unknown headcount on a finite Team cap → fail closed (Admin create only).
  if (used == null) return true;
  return used >= seat;
}

/**
 * Seat Upgrade/Cancel card is for the organisation OWNER only.
 *
 * Non-owners cannot change the plan — showing them the upsell popup is noise
 * (and a dead Upgrade). Callers still block create when the cap is reached;
 * they simply skip the card when this returns false.
 */
function canShowSeatLimitPopup() {
  return !!(
    typeof Visitor !== "undefined" &&
    Visitor &&
    Visitor.domainCan &&
    typeof _K !== "undefined" &&
    _K.permission &&
    Visitor.domainCan(_K.permission.owner)
  );
}

module.exports = {
  billingAvailable,
  canUpgradePlan,
  needsAdminConsoleUpgrade,
  planKey,
  planLabel,
  isPaidPlan,
  isFreeSoloPlan,
  isOrgSeatLimitReached,
  canShowSeatLimitPopup,
};
