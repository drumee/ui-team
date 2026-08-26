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
  // Free AND Pro sit below the console. Pro (2026-08-03 revival) is the
  // personal tier — no organisation, no admin panel, per the pricing table.
  // Legacy grandfathered rows are not affected: the 2026-07-24 patch rewrote
  // every old Pro/Drumee Plus quota row onto Team, so any row still reading
  // 'pro' is a NEW Pro subscription.
  return /^(free|advanced|pro)$/.test(name);
}

/**
 * Normalise whatever sits in `quota.plan` onto one of the four plan keys the
 * product actually has: free | pro | team | business | sovereign.
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
  // 'pro' is FIRST-CLASS again (2026-08-03 revival: $5 personal tier). The
  // legacy grandfathering that read pro as Team only exists for rows the
  // 2026-07-24 patch did not rewrite — and that patch rewrote ALL of them
  // ('Pro'/'Drumee Plus'/'advanced' → team, unfiltered), so mapping the
  // string here again would just mislabel every NEW Pro subscriber.
  if (name === "pro") return "pro";
  if (/^(team|drumee plus)$/.test(name)) return "team";
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
      pro: LOCALE.PRO,
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
 * Is this account solo-locked — no member invites at all?
 *
 * Read from the SEAT NUMBER, never from the plan name. It used to return true
 * for anything named "free", which made the block a property of the label
 * rather than of the entitlement: the 2026-08-14 pricing restructure gives
 * Free 3 seats, and a name-keyed test would have kept every Free account
 * blocked no matter what the catalog said.
 *
 * seat is a TOTAL that includes the owner, so "solo" is exactly seat 1 (the
 * owner and nobody else) or 0 (the old Free value, which doubled as "cannot
 * invite" before seats were a real number on this tier).
 *
 * Do NOT treat a missing / not-yet-loaded seat as solo — that would block Team
 * invites during bootstrap, before Visitor.quota() has been filled in. Unknown
 * fails OPEN here; the server refuses anything the client wrongly allows.
 */
function isFreeSoloPlan() {
  const quota =
    (typeof Visitor !== "undefined" && Visitor && Visitor.quota
      ? Visitor.quota()
      : null) || {};
  if (quota.seat == null || quota.seat === "") return false;
  const seat = parseInt(quota.seat, 10);
  return Number.isFinite(seat) && seat <= 1;
}

/**
 * Seats the org has spoken for, against the Team cap.
 *
 * Members already in PLUS invitations still outstanding. Pending has to
 * count: an invitation can be accepted at any moment, so the seat is
 * committed the day it is sent. Counting only accepted members meant a Team
 * org three seats from full could send fifteen invitations — none of them
 * refused — and land on eighteen members over a cap of ten as they were
 * redeemed. `member_list_stats` has always reported the two separately
 * (`total_members` counts privilege rows; `pending_invites` is its own
 * subquery) and this read nothing but the first.
 *
 * Seat budget = organisation members (`member_add` / Admin create), NOT
 * workspace invites (`hub.invite` / desk invite_popup). Callers must only
 * use this from Admin org-member flows.
 *
 * Shared with admin-console `toolkit/billing` (plugin cannot require host).
 *
 * @param {Object} view - members page (has `_membersTotal`/`_pendingInvites` and/or admin.member_stats)
 * @returns {Promise<number|null>} null when unknown (caller decides fail-open/closed)
 */
async function _orgSeatsUsed(view) {
  // The local shortcut needs BOTH halves; with only a headcount it would
  // undercount by exactly the pending invitations this function exists to
  // include, so fall through to the service rather than answer half.
  const localMembers = view && view._membersTotal;
  const localPending = view && view._pendingInvites;
  if (localMembers != null && localMembers !== ""
    && localPending != null && localPending !== "") {
    return (parseInt(localMembers, 10) || 0) + (parseInt(localPending, 10) || 0);
  }
  if (!view || typeof view.fetchService !== "function") return null;
  try {
    const stats = await view.fetchService(SERVICE.admin.member_stats, {});
    const members = parseInt(
      (stats && (stats.total_members ?? stats.totalMembers)) || 0, 10,
    ) || 0;
    const pending = parseInt(
      (stats && (stats.pending_invites ?? stats.pendingInvites)) || 0, 10,
    ) || 0;
    return members + pending;
  } catch (e) {
    // Last resort when member_stats is unreachable: the rendered list. It
    // shows members only, so this can UNDER-count by the pending invitations
    // — it exists to avoid a hard block, not to be authoritative. The server
    // recomputes both halves on every create, so an org cannot slip past the
    // cap through this path.
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
 *  - Team (e.g. seat=10) → true once members + pending invites ≥ cap →
 *    Upgrade/Cancel card.
 *  - Business / unlimited (seat ≥ 100000) → false.
 *
 * When seat usage cannot be read on an Admin members page, fail CLOSED so the
 * user is not sent into a form that only dies on `member_add`. Server also
 * enforces via `_assertSeatAvailable`.
 *
 * The Upgrade card itself is owner-only — see `canShowSeatLimitPopup`.
 *
 * @param {Object} view - Admin members widget (`_membersTotal` / member_stats)
 * @returns {Promise<boolean>}
 */
async function isOrgSeatLimitReached(view) {
  return (await checkOrgSeatLimit(view)).blocked;
}

/**
 * Same question as `isOrgSeatLimitReached`, but says WHY it blocked.
 *
 * A boolean cannot distinguish "the plan is genuinely full" from "we could
 * not read seat usage", and the two deserve different words: the first is
 * an upsell, the second is a failure. Telling someone with free seats that
 * they must upgrade because `member_stats` timed out is simply wrong.
 *
 * @param {Object} view - Admin members widget
 * @returns {Promise<{blocked: boolean, reason: ('cap'|'unknown'|null)}>}
 */
async function checkOrgSeatLimit(view) {
  // Free: no Team seat-limit popup (org create is blocked separately).
  if (isFreeSoloPlan()) return { blocked: false, reason: null };

  const quota =
    (typeof Visitor !== "undefined" && Visitor && Visitor.quota
      ? Visitor.quota()
      : null) || {};
  const seat = parseInt(quota.seat, 10) || 0;
  // Quota not loaded yet, or no finite cap → do not block as Team-full.
  if (!seat) return { blocked: false, reason: null };
  // Business (and similar) use a huge sentinel = unlimited members.
  if (seat >= 100000) return { blocked: false, reason: null };

  const used = await _orgSeatsUsed(view);
  // Unknown seat usage on a finite Team cap → still fail closed (the server
  // would only reject at member_add anyway), but report it as 'unknown' so
  // the caller can say "could not check" instead of "you are out of seats".
  if (used == null) return { blocked: true, reason: 'unknown' };
  return used >= seat
    ? { blocked: true, reason: 'cap' }
    : { blocked: false, reason: null };
}

/**
 * Seat Upgrade/Cancel card is for the organisation OWNER only.
 *
 * Non-owners cannot change the plan — showing them the upsell popup is noise
 * (and a dead Upgrade). Callers still block create when the cap is reached;
 * they simply skip the card when this returns false.
 */
/**
 * Free is solo — say so, do not just swallow the click.
 *
 * Every Free guard used to `return` with nothing rendered, so Invite and Add
 * member were buttons that did nothing at all; the only reading available to
 * the user is "this is broken". The seat card already carries the sentence
 * for this case (QX_SEAT_BODY_FREE) and it was written for it — it just had
 * no caller.
 *
 * The card degrades on its own for someone who cannot buy: it drops the
 * Upgrade button and closes with "Ask your workspace owner…" (see
 * quota-exceeded/skeleton `closingLine`), so it is safe to show to anyone.
 *
 * @returns {*} whatever Wm.openQuotaExceeded returns, or undefined
 */
function showFreeSoloLimit() {
  if (typeof Wm === "undefined" || !Wm || !Wm.openQuotaExceeded) return;
  // `free` is how many seats are still spendable, and reaching here means
  // none — the caller only calls this when isFreeSoloPlan() said the account
  // is solo-locked. It was hard-coded to 1, which read as "you have one left"
  // on the very screen that refuses to let you spend it.
  return Wm.openQuotaExceeded({ limit: "seat", free: 0 });
}

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

/**
 * Is TIER GATING in force on this deployment at all?
 *
 * Separate from `canUpgradePlan` on purpose: that one asks whether a CTA
 * should be drawn, this one asks whether the feature should be taken away in
 * the first place. They are not the same question and conflating them is how
 * you ship crippled software.
 *
 * A self-hosted pod has no payment backend and no checkout — `SERVICE.payment`
 * simply is not merged into SERVICE there (drumee.js `init_globals`; the local
 * lex/services.json fallback carries no `payment` entry). Locking a feature on
 * such an install offers the operator no way whatsoever to unlock it: this is
 * AGPL software that people run on their own hardware, and a gate they cannot
 * pay to lift is not an upsell, it is a defect. The same is true when the
 * operator has explicitly switched billing off.
 *
 * So gating follows the same switch the CTA does, one step earlier. Cloud
 * installs gate and sell; pods do neither.
 */
function featureGatingActive() {
  return billingAvailable();
}

/**
 * Read a plan entitlement out of `Visitor.quota()`.
 *
 * Everything in the quota JSON arrives from yp.plan.quota, copied wholesale by
 * payment_apply_entitlement and returned by the get_quota proc — so a new
 * entitlement is a new key in that JSON and needs no plumbing on this side.
 * (Note for anyone adding one: it goes in yp.plan.QUOTA, not yp.plan.FEATURES.
 * `features` is read only by payment_get_catalog for the pricing page and
 * never reaches the client.)
 *
 * @returns {*} undefined when quota has not loaded or has no such key
 */
function entitlement(key) {
  const quota =
    (typeof Visitor !== "undefined" && Visitor && Visitor.quota
      ? Visitor.quota()
      : null) || {};
  const v = quota[key];
  return v === "" ? undefined : v;
}

/**
 * Which task-tracker views this plan may open.
 *
 * Entitlement: `quota.task_views` — a comma-separated whitelist ("board,list"),
 * or "*" for every view.
 *
 * UNKNOWN MEANS EVERYTHING, and that is the whole safety story for this
 * feature. The key does not exist in any deployed plan row until the schemas
 * patch lands, so a missing value has to read as "no restriction" — fail it
 * closed instead and the day this ships every user on every tier, Business
 * included, silently loses Calendar, Gantt and Project Health. Same rule
 * `isFreeSoloPlan` documents for a not-yet-loaded seat count, and for the same
 * reason: this also runs during bootstrap, before quota is filled in.
 *
 * The consequence is that the UI change is INERT until the entitlement is
 * deployed, which is exactly the rollout order you want — ship the client,
 * watch nothing change, then turn it on from the database.
 *
 * @returns {String[]|null} allowed view keys, or null for "no restriction"
 */
function taskViewsAllowed() {
  if (!featureGatingActive()) return null;
  const raw = entitlement("task_views");
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === "*" || s === "all") return null;
  const list = s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  // A present-but-unparseable value ("[]", ",,,") must not lock the panel down
  // to nothing. Unknown fails open, and an empty list is unknown.
  return list.length ? list : null;
}

/**
 * May this plan open a given task-tracker view?
 *
 * @param {String} view "board" | "list" | "calendar" | "gantt" | "summary"
 * @returns {Boolean}
 */
function isTaskViewAllowed(view) {
  const allowed = taskViewsAllowed();
  if (!allowed) return true;
  return allowed.includes(String(view || "").trim().toLowerCase());
}

/**
 * How long a single meeting may run on this plan, in minutes.
 *
 * Entitlement: `quota.meeting_minutes`. Read with exactly the convention the
 * SERVER uses in `service/lib/meeting-limit.js capMinutes()` — a positive
 * integer is the cap, and 0 (or absent, or unparseable) means no cap at all.
 * The two readings have to agree: the server's decides what actually happens
 * to a live room, this one only decides what the UI says beforehand, so any
 * drift shows up as the UI refusing a meeting the server would happily run, or
 * promising one it is going to cut off mid-sentence.
 *
 * Unknown fails OPEN for the reason `taskViewsAllowed` sets out at length: the
 * key does not exist in any deployed plan row until the schemas patch lands,
 * and this also runs during bootstrap, before Visitor.quota() is filled in.
 *
 * @returns {Number|null} cap in minutes, or null for "no limit / not known"
 */
function meetingMinutesCap() {
  if (!featureGatingActive()) return null;
  const raw = entitlement("meeting_minutes");
  if (raw == null) return null;
  const m = parseInt(raw, 10);
  return Number.isFinite(m) && m > 0 ? m : null;
}

/**
 * Is a meeting of `seconds` longer than this plan allows?
 *
 * Answers with the CAP rather than with a boolean, so the caller can name the
 * number in the upsell without reading the entitlement a second time (and
 * without the two reads disagreeing should quota land in between).
 *
 * Compares whole minutes, rounded DOWN. A 45-minute cap must not reject a
 * meeting the organiser entered as 45 minutes because the epochs came out a
 * few seconds over; the server measures elapsed wall-clock from the first
 * join, so nothing here needs to be stricter than the minute that was typed.
 *
 * @param {Number} seconds meeting duration
 * @returns {Number} the cap in minutes when it is exceeded, else 0
 */
function overMeetingCap(seconds) {
  const cap = meetingMinutesCap();
  if (!cap) return 0;
  const mins = Math.floor(Number(seconds) / 60);
  if (!Number.isFinite(mins) || mins <= cap) return 0;
  return cap;
}

module.exports = {
  billingAvailable,
  canUpgradePlan,
  featureGatingActive,
  entitlement,
  taskViewsAllowed,
  isTaskViewAllowed,
  meetingMinutesCap,
  overMeetingCap,
  needsAdminConsoleUpgrade,
  planKey,
  planLabel,
  isPaidPlan,
  isFreeSoloPlan,
  isOrgSeatLimitReached,
  checkOrgSeatLimit,
  canShowSeatLimitPopup,
  showFreeSoloLimit,
};
