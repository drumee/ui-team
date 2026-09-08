// Modal C — the trial-ended decision gate (prototype 2026-08-14).
//
// Two screens behind one state. The first asks the question; the second
// explains the consequence when the answer is "Free" and the workspace no
// longer fits.
//
//   ended       "Your 1-month trial has ended" + Team pitch + two choices
//   ended-free  what "over the Free limits" actually means for them
//
// The gate has no close control on purpose: it returns on every home mount
// until the owner picks. That is why the second screen is INFORMATIONAL and
// not a confirmation — by the time anyone reads any of this,
// promoExpiryWorker has already cleared the entitlement and dropped the org
// to Free. There is nothing left to confirm; pretending otherwise would sell
// the user a decision they never actually made.

// Team's monthly price. A constant rather than a catalog read: this modal is
// a gate, so an extra round-trip is an extra way for it to fail open, and the
// number here only has to match what the Billing page will charge on the very
// next screen. Matches the live catalog (team/month = $29) as of 2026-08-14 —
// move it with the catalog, not on its own.
const TEAM_PRICE = 29;

const FEATURES = [
  () => LOCALE.PROMO_END_FEAT_MEMBERS || "Up to 10 members",
  () => LOCALE.PROMO_END_FEAT_STORAGE || "100 GB storage",
  () => LOCALE.PROMO_END_FEAT_CHAT || "Folder chat on every workspace",
  () => LOCALE.PROMO_END_FEAT_PERMS || "Granular permissions",
  () => LOCALE.PROMO_END_FEAT_HISTORY || "30-day version history",
  () => LOCALE.PROMO_END_FEAT_SUPPORT || "Email support",
];

/** A pill button in the house style: Box.X wrapper carries the service. */
function cta(pfx, ui, service, label, modifier) {
  return Skeletons.Box.X({
    className: modifier ? `${pfx}__cta ${pfx}__cta--${modifier}` : `${pfx}__cta`,
    service,
    uiHandler: [ui],
    kids: [
      Skeletons.Note({ className: `${pfx}__cta-label`, active: 0, content: label }),
    ],
  });
}

/** Screen 1 — the question. */
function askScreen(pfx, ui) {
  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__badge`,
        content: LOCALE.PROMO_END_BADGE || "TRIAL ENDED",
      }),
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.PROMO_END_TITLE || "Your 1-month trial has ended.",
      }),
      Skeletons.Note({
        className: `${pfx}__lead`,
        content: LOCALE.PROMO_END_LEAD
          || "Upgrade to Team to keep everything running for your workspace and collaborators.",
      }),
      Skeletons.Box.X({
        className: `${pfx}__price-row`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__price-amount`,
            content: ui.formatMoney(TEAM_PRICE),
          }),
          Skeletons.Note({
            className: `${pfx}__price-period`,
            content: LOCALE.PER_MONTH || "/ month",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__feature-list`,
        kids: FEATURES.map((f) =>
          Skeletons.Box.X({
            className: `${pfx}__feature-row`,
            kids: [
              Skeletons.Image.Svg({ ico: "apps-check-circle", className: `${pfx}__feature-tick` }),
              Skeletons.Note({ className: `${pfx}__feature-text`, content: f() }),
            ],
          }),
        ),
      }),
      Skeletons.Box.Y({
        className: `${pfx}__cta-stack`,
        kids: [
          cta(pfx, ui, "promo-end-upgrade",
            LOCALE.PROMO_END_UPGRADE_CTA || "Upgrade to Team plan"),
          cta(pfx, ui, "promo-end-continue-free",
            LOCALE.PROMO_END_FREE_CTA || "Continue on Free plan", "ghost"),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__footnote`,
        content: LOCALE.PROMO_END_FOOTNOTE || "Your data stays put — nothing gets deleted.",
      }),
    ],
  });
}

/**
 * Screen 2 — what Free actually means for this workspace, shown only when it
 * no longer fits. States a fact; it does not ask for a decision, because the
 * plan already changed on a timer before anyone saw this.
 */
function overLimitScreen(pfx, ui) {
  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__lock-tag`,
        content: LOCALE.PROMO_END_OVER_TAG || "Over Free plan limits",
      }),
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.PROMO_END_OVER_TITLE || "You're on the Free plan now",
      }),
      Skeletons.Note({
        className: `${pfx}__lead`,
        content: LOCALE.PROMO_END_OVER_LEAD
          || "Your workspace has more members or storage than the Free plan allows. Nothing has been deleted — over-limit items are locked, and you have 7 days to free up room or upgrade again.",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__cta-stack`,
        kids: [
          cta(pfx, ui, "promo-end-resolve",
            LOCALE.PROMO_END_RESOLVE_CTA || "See what's locked", "danger"),
          cta(pfx, ui, "promo-end-upgrade",
            LOCALE.PROMO_END_UPGRADE_CTA || "Upgrade to Team plan", "ghost"),
        ],
      }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  return ui.isOverLimitScreen() ? overLimitScreen(pfx, ui) : askScreen(pfx, ui);
};
