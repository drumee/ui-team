const { TRASH_FILTERS, FILTER_LABELS } = require("../filters");

// Latest / Earliest / Expiring soon. The active chip is not stamped here: the
// panel root carries data-filter and the skin lights the matching
// __filter--<value>, so a switch needs no per-chip state.
module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__filters`,
    debug: __filename,
    kids: TRASH_FILTERS.map((f) => Skeletons.Note({
      className: `${pfx}__filter ${pfx}__filter--${f}`,
      content: LOCALE[FILTER_LABELS[f]],
      service: "trash-filter",
      name: f,
      uiHandler: ui,
    })),
  });
};
