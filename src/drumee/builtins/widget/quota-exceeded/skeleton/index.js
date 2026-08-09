const { canUpgradePlan } = require("libs/billing");
const { filesize } = require("@drumee/ui-essentials");

/**
 * Quota-exceeded block: what the user hit, and the one thing they can do next.
 *
 * Before this, every limit in the product dead-ended. The upload paths raised a
 * bare "Your quota has been exceeded" alert, the members panels rendered the
 * same sentence as a plain note, and the workspace limit's reason string
 * (_private_hub_limit_reached) had no translation in any locale file at all —
 * so the user was told THAT they were blocked and never what to do, while the
 * billing screen that would fix it sat three clicks away in the sidebar.
 *
 * ONE SKELETON, TWO HOSTS. The caller feeds it into Wm's shared wrapper-modal
 * (the upload paths, where the action has already failed and there is nothing
 * to interrupt) or inline into its own panel (the create-workspace form, the
 * members lists, where a modal over a half-filled form is an interruption and
 * an inline message is precise). Only `inline` differs; copy, CTA and the
 * can-upgrade rule are identical either way.
 */

/**
 * The three things a user can run out of. A map rather than three branches so
 * adding a fourth limit is one entry, not a new code path.
 *
 * Each limit owns ALL of its copy, including `makeRoom` — the thing to do when
 * upgrading is not available. That last one has to be per-limit: the first
 * draft shared one sentence for all three and told a user who had hit the
 * WORKSPACE cap to "free up space to continue", which does nothing whatsoever
 * for a workspace count. Caught by rendering the matrix.
 *
 * `body` states the fact only. The action lives in the button, or in
 * `makeRoom` when there is no button — never in both, so the card cannot
 * advise an upgrade and then explain that the reader cannot upgrade.
 */
const LIMITS = {
  /* A real ladder — 5 GB -> 100 GB -> 1 TB — so the button is true advice. */
  storage: {
    title: () => LOCALE.QX_STORAGE_TITLE || "Storage limit reached",
    body: (o) =>
      o.used != null && o.cap != null
        ? (LOCALE.QX_STORAGE_BODY_USED || "You are using %s of your %s.")
            .replace("%s", filesize(o.used))
            .replace("%s", filesize(o.cap))
        : LOCALE.QX_STORAGE_BODY ||
          "You have used all the storage your plan includes.",
    makeRoom: () => LOCALE.QX_ROOM_STORAGE || "Free up space to continue.",
  },
  /* UNREACHABLE since 2026-08-08 — no plan limits how many workspaces you may
     create, and the server no longer refuses one (server-team removed the
     create_hub preproc). Kept only so an endpoint still running the old
     service renders this card instead of a raw "QUOTA_EXCEEDED" in the name
     field; delete once every deployment is past that point.

     The note that used to sit here — "Team sells the same private_hub: 1 as
     Free" — was the misreading that caused the outage: $.private_hub /
     $.share_hub / $.public_hub are per-area capability flags (free 1/0/0,
     pro 1/1/0, team 1/1/0, business unset), not workspace counts. Read as
     counts they say a $29 Team may hold exactly one internal workspace.
     Don't restore a count from them. */
  workspace: {
    title: () => LOCALE.QX_WORKSPACE_TITLE || "Workspace limit reached",
    body: () =>
      LOCALE.QX_WORKSPACE_BODY ||
      "You have created all the workspaces your plan allows.",
    makeRoom: () =>
      LOCALE.QX_ROOM_WORKSPACE ||
      "Delete a workspace you no longer need to create another.",
  },
  seat: {
    title: () => LOCALE.QX_SEAT_TITLE || "Member limit reached",
    // Two different refusals share this card. Free has no seats at all, so
    // "you reached the limit of the team plan" would name a plan the caller
    // is not on; opt.free selects the sentence written for that case.
    body: (opt = {}) =>
      opt.free
        ? (LOCALE.QX_SEAT_BODY_FREE
          || "The Free plan is for one person only. Upgrade to invite other members.")
        : (LOCALE.QX_SEAT_BODY
          || "You can not invite more members because you have reached limit of team plan. Upgrade to business plan now to invite more members."),
    // Freeing a seat is only a move when seats exist — on Free there is
    // nothing to remove, the plan itself is the limit.
    makeRoom: (opt = {}) =>
      opt.free
        ? (LOCALE.QX_SEAT_BODY_FREE
          || "The Free plan is for one person only. Upgrade to invite other members.")
        : (LOCALE.QX_ROOM_SEAT || "Remove a member to free a place."),
  },
};

/**
 * The closing line, which depends on what the reader can actually DO.
 *
 * `canUpgradePlan()` is asked here rather than passed in, and it is the same
 * call the sidebar entry and the desk's `upgrade-plan` handler make — one
 * source, so the button and the action behind it can never disagree. It is
 * false for a self-hosted pod, for an install with no payment backend, and —
 * the common case — for any org member who is not the owner.
 *
 * Those last two need different sentences: a member has someone to ask, a pod
 * user does not. The org case is recognised the same way libs/billing does it,
 * by domain_id, so the two stay in step.
 */
function closingLine(canUpgrade, spec, opt = {}) {
  // The button already says what to do; a second sentence repeating it is
  // noise, and the two could disagree.
  if (canUpgrade) return null;
  const quota = (typeof Visitor !== "undefined" && Visitor.quota && Visitor.quota()) || {};
  if (~~quota.domain_id > 1) {
    return LOCALE.QX_ASK_OWNER ||
      "Ask your workspace owner to review the organisation's plan.";
  }
  // No org to escalate to and no plan to buy — so the only remaining move is
  // making room, which is different for each limit.
  return spec.makeRoom(opt);
}

/**
 * @param {LetcBox} ui
 * @param {Object} opt
 * @param {String} opt.limit  "storage" | "workspace" | "seat"
 * @param {Number} [opt.used] bytes, storage only
 * @param {Number} [opt.cap]  bytes, storage only
 * @param {Boolean} [opt.inline] render in place rather than as a modal card
 */
module.exports = function (ui, opt = {}) {
  const fig = ui.fig.family;
  // Unknown limit falls back to storage rather than rendering an empty card:
  // this is an error path already, and a blank box would be a second failure
  // on top of the first.
  const spec = LIMITS[opt.limit] || LIMITS.storage;
  const canUpgrade = canUpgradePlan();
  const closing = closingLine(canUpgrade, spec, opt);

  const kids = [];

  // Brand lockup — the same logo-and-wordmark pair the reward-flow modals use
  // (see reward-flow/skeleton/modal.js brandHeader), so the two modals read as
  // the same product rather than two designs.
  //
  // Modal only. Inline this sits inside a panel the user opened from within
  // the app, already surrounded by Drumee chrome, where a second wordmark is
  // just noise.
  if (!opt.inline) {
    kids.push(
      Skeletons.Box.X({
        className: `${fig}__brand`,
        kids: [
          Skeletons.Image.Svg({ className: `${fig}__brand-logo`, ico: "logo-upload" }),
          Skeletons.Note({ className: `${fig}__brand-name`, content: "drumee" }),
        ],
      })
    );
  }

  kids.push(
    Skeletons.Box.Y({
      className: `${fig}__chip`,
      kids: [Skeletons.Image.Svg({ className: `${fig}__chip-ico`, ico: "app-storage" })],
    }),
    Skeletons.Note({ className: `${fig}__title`, content: spec.title() }),
    Skeletons.Note({ className: `${fig}__desc`, content: spec.body(opt) })
  );

  if (closing) {
    kids.push(Skeletons.Note({ className: `${fig}__desc ${fig}__desc--muted`, content: closing }));
  }

  // The button exists only when it leads somewhere. `upgrade-plan` is the
  // route every other billing entry point already uses (sidebar, settings,
  // storage card) — it bubbles to the desk, which opens the full billing page.
  // Reusing it means no new navigation, and it stays behind the same guard.
  const footer = [];
  // Seat-limit popups ask for Upgrade / Cancel (product copy). Other limits
  // keep the older See plans / Close pair.
  const isSeat = opt.limit === "seat";
  if (canUpgrade) {
    footer.push(
      Skeletons.Note({
        className: `${fig}__btn ${fig}__btn--primary`,
        content: isSeat
          ? (LOCALE.UPGRADE || "Upgrade")
          : (LOCALE.QX_SEE_PLANS || LOCALE.UPGRADE_PLAN_MENU || "See plans"),
        service: "upgrade-plan",
        uiHandler: [ui],
      })
    );
  }
  // Dismiss only in the modal. Inline the block IS the message — there is
  // nothing to close, and a Close that emptied the panel would leave the user
  // staring at a form with no explanation of why it refused.
  if (!opt.inline) {
    footer.push(
      Skeletons.Note({
        className: `${fig}__btn`,
        content: isSeat
          ? (LOCALE.CANCEL || "Cancel")
          : (LOCALE.CLOSE || "Close"),
        service: "quota-exceeded-close",
        uiHandler: [ui],
      })
    );
  }
  if (footer.length) {
    kids.push(Skeletons.Box.X({ className: `${fig}__footer`, kids: footer }));
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__card${opt.inline ? ` ${fig}__card--inline` : ""}`,
    kids,
  });
};

module.exports.LIMITS = LIMITS;
