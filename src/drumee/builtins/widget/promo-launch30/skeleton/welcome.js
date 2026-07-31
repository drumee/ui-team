// Modal B — welcome, shown right after a successful claim. The doc's own
// recommended addition: name the end date and promise no card, right under
// the headline — "removing the fear of a surprise charge is what makes
// people invite colleagues."
const BENEFITS = [
  {
    title: () => LOCALE.PROMO_BENEFIT_STORAGE_TITLE || "100 GB storage",
    sub: () => LOCALE.PROMO_WELCOME_STORAGE_SUB || "Upload your files and organize your workspace.",
  },
  {
    title: () => LOCALE.PROMO_BENEFIT_MEMBERS_TITLE || "Up to 10 members",
    sub: () => LOCALE.PROMO_WELCOME_MEMBERS_SUB || "Invite your teammates and collaborate together.",
  },
  {
    title: () => LOCALE.PROMO_BENEFIT_ADMIN_TITLE || "Admin Console",
    sub: () => LOCALE.PROMO_WELCOME_ADMIN_SUB
      || "Manage members, permissions, and workspace settings from one place.",
  },
];

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const trialEndsAt = ui.getTrialEndsAt();
  const endDate = trialEndsAt ? Dayjs.unix(trialEndsAt).format("MMM D, YYYY") : "";

  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    kids: [
      Skeletons.Note({ className: `${pfx}__confetti`, content: "🎉" }),
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.PROMO_WELCOME_TITLE || "Welcome to Team!",
      }),
      Skeletons.Note({
        className: `${pfx}__lead`,
        content: endDate
          ? (LOCALE.PROMO_WELCOME_LEAD_DATED
            || "You've unlocked 1 month of Team — completely free. Your trial runs until {0}. We won't ask for a card.").format(endDate)
          : (LOCALE.PROMO_WELCOME_LEAD
            || "You've unlocked 1 month of Team — completely free. We won't ask for a card."),
      }),
      Skeletons.Box.Y({
        className: `${pfx}__benefits`,
        kids: BENEFITS.map((b, i) =>
          Skeletons.Box.X({
            className: `${pfx}__benefit-row`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__benefit-num`,
                content: String(i + 1),
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
      Skeletons.Box.Y({
        className: `${pfx}__cta-stack`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__cta`,
            service: "promo-explore",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__cta-label`,
                active: 0,
                content: LOCALE.PROMO_EXPLORE_CTA || "Start exploring now",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__cta ${pfx}__cta--ghost`,
            service: "promo-later",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__cta-label`,
                active: 0,
                content: LOCALE.PROMO_LATER_CTA || "Maybe later",
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
