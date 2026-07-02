/**
 * Rating state: 5 stars; the picked star count reveals a matching message
 * (RATING_SURVEY_MSG_1..5) and enables the "Take the survey" CTA.
 * Star row mirrors window/meeting/skeleton/feedback.js.
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  const score = ui.getScore();

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      Skeletons.Button.Svg({
        className: `${pfx}__star`,
        ico: "app-rating-star",
        service: "rate-star",
        uiHandler: [ui],
        dataset: { rating: i, on: i <= score ? "1" : "0" },
        rating: i,
      }),
    );
  }

  const msg = score
    ? (LOCALE[`RATING_SURVEY_MSG_${score}`] || "")
    : (LOCALE.RATING_SURVEY_SUBTITLE || "How would you rate your experience so far?");

  return Skeletons.Box.Y({
    className: `${pfx}__body ${pfx}__body--rating`,
    kids: [
      Skeletons.Box.X({ className: `${pfx}__stars`, kids: stars }),
      Skeletons.Note({
        className: `${pfx}__star-msg`,
        dataset: { picked: score ? 1 : 0 },
        content: msg,
      }),
      Skeletons.Box.X({
        className: `${pfx}__footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__cancel`,
            content: LOCALE.RATING_SURVEY_LATER || "Maybe later",
            service: "survey-later",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__primary-btn`,
            dataset: { disabled: score ? 0 : 1 },
            content: LOCALE.RATING_SURVEY_TAKE || "Take the survey",
            service: score ? "survey-take" : null,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
