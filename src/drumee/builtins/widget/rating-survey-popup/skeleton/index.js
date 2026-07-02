/**
 * rating-survey-popup — per-state skeleton dispatcher.
 * Reads ui.getState() to render the right card body.
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  let body;
  switch (ui.getState()) {
    case "survey":
      body = require("./survey")(ui);
      break;
    case "thanks":
      body = require("./thanks")(ui);
      break;
    default:
      body = require("./rating")(ui);
  }
  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.RATING_SURVEY_TITLE || "Enjoying Drumee?",
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: "cross",
            service: "close-rating-popup",
            uiHandler: [ui],
          }),
        ],
      }),
      body,
    ],
  });
};
