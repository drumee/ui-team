// Modal A — the offer. Design doc 2026-07-30 copy deck, minus the scarcity
// chip / position line / campaign end date: those need a business decision
// (real vs seeded inventory, campaign cap + end date) this build does not
// have, and showing an invented number would be worse than not showing one.
const BENEFITS = [
  {
    title: () => LOCALE.PROMO_BENEFIT_STORAGE_TITLE || "100 GB storage",
    sub: () => LOCALE.PROMO_BENEFIT_STORAGE_SUB || "20× your Free plan",
  },
  {
    title: () => LOCALE.PROMO_BENEFIT_MEMBERS_TITLE || "Up to 10 members",
    sub: () => LOCALE.PROMO_BENEFIT_MEMBERS_SUB || "Bring the whole team in",
  },
  {
    title: () => LOCALE.PROMO_BENEFIT_ADMIN_TITLE || "Admin Console",
    sub: () => LOCALE.PROMO_BENEFIT_ADMIN_SUB || "Members, roles, audit logs, storage",
  },
  {
    title: () => LOCALE.PROMO_BENEFIT_PERMISSIONS_TITLE || "Granular permissions & guest access",
    sub: () => LOCALE.PROMO_BENEFIT_PERMISSIONS_SUB || "Share without giving anything away",
  },
];

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const claiming = ui.isClaiming();

  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: "promo-dismiss",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.PROMO_OFFER_TITLE || "Start your 1-month Team Plan today",
      }),
      Skeletons.Note({
        className: `${pfx}__lead`,
        content: LOCALE.PROMO_OFFER_LEAD || "Everything a real team needs, free for 30 days.",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__benefits`,
        kids: BENEFITS.map((b) =>
          Skeletons.Box.X({
            className: `${pfx}__benefit-row`,
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-check-circle",
                className: `${pfx}__benefit-tick`,
              }),
              Skeletons.Box.Y({
                className: `${pfx}__benefit-text`,
                kids: [
                  Skeletons.Note({ className: `${pfx}__benefit-title`, content: b.title() }),
                  Skeletons.Note({ className: `${pfx}__benefit-sub`, content: b.sub() }),
                ],
              }),
            ],
          }),
        ),
      }),
      Skeletons.Box.X({
        className: `${pfx}__cta${claiming ? ` ${pfx}__cta--busy` : ""}`,
        service: claiming ? null : "promo-claim",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__cta-label`,
            content: claiming
              ? (LOCALE.PROMO_CLAIMING || "Setting up your workspace…")
              : (LOCALE.PROMO_CLAIM_CTA || "Unlock My Free Month"),
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__fineprint`,
        content: LOCALE.PROMO_NO_CARD || "No credit card required.",
      }),
    ],
  });
};
