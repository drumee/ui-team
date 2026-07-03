/**
 * rating-survey-popup — per-state skeleton dispatcher.
 * Figma 2144-128133 / 2144-173302 / 2144-173408: a bare centered card with
 * no title bar and no X — the rating state carries its own centered heading;
 * Cancel is the only dismiss there. Wizard/thanks states keep their own
 * footers for navigation/close.
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  let body;
  switch (ui.getState()) {
    case "thanks":
      body = require("./thanks")(ui);
      break;
    default:
      body = require("./rating")(ui);
  }
  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [body],
  });
};
