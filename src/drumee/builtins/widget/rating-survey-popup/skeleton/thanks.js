/**
 * Thanks state: submission confirmed; closing from here is final
 * (the server-side done flag is already set).
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__body ${pfx}__body--thanks`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__thanks-ico`,
        kids: [Skeletons.Image.Svg({ ico: "apps-check-circle" })],
      }),
      Skeletons.Note({
        className: `${pfx}__thanks-title`,
        content: LOCALE.RATING_SURVEY_THANKS_TITLE || "Thank you!",
      }),
      Skeletons.Note({
        className: `${pfx}__thanks-sub`,
        content: LOCALE.RATING_SURVEY_THANKS_SUB || "Your feedback directly shapes what we build next.",
      }),
      Skeletons.Box.X({
        className: `${pfx}__footer ${pfx}__footer--center`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__primary-btn`,
            content: LOCALE.CLOSE || "Close",
            service: "close-rating-popup",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
