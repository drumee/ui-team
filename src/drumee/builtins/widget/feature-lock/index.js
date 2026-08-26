/**
 * Feature-lock upsell — "your plan does not include this", as the BODY of a
 * shared confirm modal.
 *
 * This is a tier gate, not a quota: nothing has been used up, the entitlement
 * simply is not on this plan. That is a different message from
 * `widget/quota-exceeded` (which answers "you ran out of X") and the two are
 * deliberately kept apart — but the STRUCTURE is copied from it on purpose:
 * a map of features rather than a branch per caller, so adding the next gate
 * is one entry and not a new code path. quota-exceeded's own comment makes the
 * same argument about its LIMITS map.
 *
 * WHY A BODY BUILDER AND NOT A WIDGET KIND. quota-exceeded is a Kind because it
 * has two hosts (Wm's wrapper-modal, and inline inside a panel). This has one:
 * the confirm modal. Riding `Wm.confirm` rather than re-implementing on the
 * bare wrapper-modal inherits the Escape handler, the state guard that keeps a
 * modal on top, and the resolve/reject promise — all of which
 * `window/confirm/index.js` already got right, and none of which a second
 * implementation would get right for free.
 *
 * The close X is drawn HERE rather than coming from the confirm's own header
 * because `mode: "b"` drops that header (it carries a drumee logo this design
 * does not want), and the header is where the X normally lives. Without it the
 * only way out is Escape — which a touch device does not have, so a phone user
 * would be trapped in the modal (backdrop clicks do not dismiss it).
 *
 * Callers go through `Wm.openFeatureLock({ feature })` — see desk/wm/index.js.
 */
require("./skin");
const { canUpgradePlan } = require("libs/billing");

/**
 * Every gate the product has, and all of its copy.
 *
 * `ico` is a sprite name (icons/src/normalized). `title`/`desc` are functions
 * so LOCALE is read at RENDER time — read at module load they would freeze
 * whatever was in the safe object before locale/en.json landed, which for a
 * lazily-imported module is a real ordering, not a hypothetical one.
 */
const FEATURES = {
  /**
   * Admin Console — org-tier (yp.plan entity_type=org). Personal plans
   * (free / pro / legacy advanced) must upsell first; the caller decides that
   * with `libs/billing.needsAdminConsoleUpgrade()`.
   */
  admin_console: {
    ico: "cloud-pause",
    title: () => LOCALE.UNLOCK_ADMIN_CONSOLE,
    desc: () => LOCALE.UNLOCK_ADMIN_DESC,
  },

  /**
   * Task tracker — Board and List are on every plan; Calendar, Gantt and
   * Project Health are not. Named for the entitlement rather than for the
   * three views, so adding a fourth gated view does not need a fourth string.
   */
  task_views: {
    ico: "app-task-project-health",
    title: () => LOCALE.UNLOCK_TASK_VIEWS,
    desc: () => LOCALE.UNLOCK_TASK_VIEWS_DESC,
  },

  /**
   * Group meetings past the plan's cap. Shown when the room hits the deadline
   * the server stamped on it — see window/meeting.
   *
   * `args[0]` is the cap in minutes, and it comes from the SERVER's
   * `duration_limit` rather than from the local entitlement: the room is
   * governed by the workspace owner's plan, which for a guest — or for any
   * member on a different tier from the owner — is not the plan this client
   * could read for itself.
   */
  meeting_duration: {
    ico: "apps-clock-countdown",
    title: () => LOCALE.UNLOCK_MEETING_DURATION,
    desc: (args) => LOCALE.UNLOCK_MEETING_DURATION_DESC.format(args[0]),
  },

  /**
   * SCHEDULING a meeting longer than the plan's cap — the same limit as
   * `meeting_duration`, met before the meeting exists rather than while it is
   * running.
   *
   * Its own copy on purpose. "Meeting time limit reached" is a statement about
   * a call in progress, and it is the wrong sentence for someone still filling
   * in a form: nothing has been reached, and unlike the person whose call just
   * ended they have an obvious way out that does not involve paying — shorten
   * the meeting — which the words have to offer them, or the card reads as a
   * paywall on a field they can simply edit.
   *
   * `args[0]` is the cap in minutes, read here from the SCHEDULER's own
   * entitlement (`libs/billing.overMeetingCap`). Unlike meeting_duration there
   * is no server-stamped `duration_limit` to quote — the room has never been
   * opened, so no deadline exists yet.
   */
  meeting_schedule: {
    ico: "apps-clock-countdown",
    title: () => LOCALE.UNLOCK_MEETING_SCHEDULE,
    desc: (args) => LOCALE.UNLOCK_MEETING_SCHEDULE_DESC.format(args[0]),
  },
};

/**
 * The line under the description, for a reader who cannot act on the CTA.
 *
 * Lifted from quota-exceeded's `closingLine`, and for the same reason: without
 * it, someone who cannot buy gets a card that states a problem and offers
 * nothing at all, which reads as a broken button rather than a plan limit.
 *
 * Only two cases need words. In an org the reader has someone to escalate to;
 * on a personal account with no reachable checkout (a self-hosted pod) there
 * is no one, and no plan to buy, so the card just states the fact and stops —
 * inventing an action there would be worse than silence.
 */
function closingLine() {
  const quota =
    (typeof Visitor !== "undefined" && Visitor.quota && Visitor.quota()) || {};
  if (~~quota.domain_id > 1) {
    return LOCALE.QX_ASK_OWNER;
  }
  return null;
}

/**
 * Build the modal body for a feature.
 *
 * Returns the FUNCTION form of confirm's `body` — `window/confirm/skeleton`
 * calls it with the confirm widget itself, which is the handler the close X
 * and the CTA must signal (`_e.cancel` → onCancel → reject, `_e.confirm` →
 * onConfirm → resolve). Passing a built tree instead would leave both with no
 * handler to talk to.
 *
 * @param {String} feature key into FEATURES
 * @param {Array} [args] positional substitutions for the copy (`.format()`)
 * @returns {Function} (confirmUi) => skeleton
 */
function featureLockBody(feature, args) {
  // An unknown key must not render an empty card on top of whatever already
  // went wrong. Admin console is the oldest gate and its copy is generic
  // enough to stand in.
  const spec = FEATURES[feature] || FEATURES.admin_console;
  // Normalised here rather than in each spec, so a caller that passes nothing
  // to a feature whose copy takes a placeholder gets an empty substitution
  // instead of a TypeError inside the render.
  const a = Array.isArray(args) ? args : args == null ? [] : [args];

  return (confirmUi) => {
    /**
     * CTA visibility follows `canUpgradePlan()`, not `billingAvailable()`.
     *
     * BEHAVIOUR CHANGE, deliberate: the admin-console card used to ask
     * billingAvailable(), which answers "can this DEPLOYMENT sell" and says
     * nothing about whether THIS READER may buy. In an org, billing is
     * owner-managed — so a member saw an Upgrade button that walked them to a
     * billing page they cannot act on. canUpgradePlan() is the rule the
     * sidebar entry, the desk's `upgrade-plan` handler and quota-exceeded all
     * already use, and its own docstring calls itself the single source of
     * truth for "any other upgrade affordance". This card was the one holdout.
     *
     * Reachable only when an ORG sits on a personal-tier plan (a lapsed
     * subscription drops it back to free), which is exactly the case the old
     * behaviour handled worst.
     */
    const canBuy = canUpgradePlan();
    const closing = canBuy ? null : closingLine();

    return Skeletons.Box.Y({
      className: "feature-lock",
      // Do NOT hoist `active: 0` into kidsOpt — it would zero out the CTA's
      // click handler along with the decorative kids.
      kids: [
        Skeletons.Box.X({
          className: "feature-lock__close",
          signal: _e.cancel,
          uiHandler: [confirmUi],
          bubble: 0,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Image.Svg({
              ico: "cross",
              className: "feature-lock__close-ico",
            }),
          ],
        }),
        Skeletons.Image.Svg({
          ico: spec.ico,
          className: "feature-lock__icon",
          active: 0,
        }),
        Skeletons.Note({
          className: "feature-lock__title",
          content: spec.title(),
          active: 0,
        }),
        Skeletons.Note({
          className: "feature-lock__desc",
          content: spec.desc(a),
          active: 0,
        }),
        closing
          ? Skeletons.Note({
              className: "feature-lock__desc feature-lock__desc--muted",
              content: closing,
              active: 0,
            })
          : null,
        canBuy
          ? Skeletons.Note({
              className: "feature-lock__cta",
              content: LOCALE.UPGRADE_PLAN_MENU,
              signal: _e.confirm,
              uiHandler: [confirmUi],
            })
          : null,
      ].filter(Boolean),
    });
  };
}

/**
 * Raise a feature-lock card and route its CTA to the billing page.
 *
 * Every caller wants the same three things wrapped around `Wm.openFeatureLock`
 * and none of them are interesting: don't explode on a host that has no such
 * method (DMZ ran into this — see window/meeting), walk a confirming reader to
 * checkout only when they may actually buy, and swallow the rejection, because
 * `confirm` rejects on dismiss and an unhandled rejection for a modal somebody
 * simply closed is nothing but console noise.
 *
 * Always resolves. The gate has already been decided by the time this is
 * called; what the reader does with the card cannot un-gate anything, so there
 * is no outcome here for a caller to branch on.
 *
 * @param {String} feature key into FEATURES
 * @param {Array} [args] copy substitutions (`.format()`)
 * @returns {Promise}
 */
function promptFeatureLock(feature, args) {
  const a = Array.isArray(args) ? args : args == null ? [] : [args];
  try {
    if (typeof Wm === "undefined" || !Wm) return Promise.resolve();
    // No card available on this host — still say what happened. Silence would
    // read as a broken button on the very click that was refused.
    if (!Wm.openFeatureLock) {
      const spec = FEATURES[feature];
      if (spec && Wm.alert) Wm.alert(spec.desc(a));
      return Promise.resolve();
    }
    return Wm.openFeatureLock({ feature, args: a })
      .then(() => {
        if (!canUpgradePlan()) return;
        RADIO_BROADCAST.trigger("desk:open-billing-page");
      })
      .catch(() => {});
  } catch (e) {
    return Promise.resolve();
  }
}

module.exports = { FEATURES, featureLockBody, promptFeatureLock, closingLine };
