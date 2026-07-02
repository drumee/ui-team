/**
 * Rating state — Figma 2144-128133 (no star picked), 2144-173302 (<5 stars),
 * 2144-173408 (5 stars):
 *   centered title → 5-star row → per-rating message block (hidden until a
 *   star is picked; <5 = "So sorry…", 5 = "Thankfully…" + shared subline) →
 *   full-width "Take the survey" gray button → equal Cancel / Confirm footer.
 * Confirm submits the rating; Cancel dismisses (7-day snooze); Take the
 * survey opens the PMF wizard (works with or without a star picked).
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

  return Skeletons.Box.Y({
    className: `${pfx}__body ${pfx}__body--rating`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__rating-title`,
        content: LOCALE.RATING_SURVEY_TITLE || "Rate your experience with Drumee",
      }),
      Skeletons.Box.X({ className: `${pfx}__stars`, kids: stars }),
      // Message block appears only once a star is picked (2 design variants).
      score ? Skeletons.Box.Y({
        className: `${pfx}__star-msg`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__star-msg-head`,
            content: score === 5
              ? (LOCALE.RATING_SURVEY_MSG_HIGH || "Thankfully, you enjoyed Drumee")
              : (LOCALE.RATING_SURVEY_MSG_LOW || "So sorry for your experience"),
          }),
          Skeletons.Note({
            className: `${pfx}__star-msg-sub`,
            content: LOCALE.RATING_SURVEY_MSG_SUB
              || "Please fill out this survey so that Drumee improve your experience better",
          }),
        ],
      }) : null,
      Skeletons.Button.Label({
        className: `${pfx}__take-btn`,
        ico: "list",
        label: LOCALE.RATING_SURVEY_TAKE || "Take the survey",
        service: "survey-take",
        uiHandler: [ui],
      }),
      Skeletons.Box.X({
        className: `${pfx}__footer ${pfx}__footer--rating`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__cancel`,
            content: LOCALE.CANCEL || "Cancel",
            service: "survey-later",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__primary-btn`,
            dataset: { disabled: score ? 0 : 1 },
            content: LOCALE.CONFIRM || "Confirm",
            service: score ? "survey-confirm" : null,
            uiHandler: [ui],
          }),
        ],
      }),
    ].filter(Boolean),
  });
};
