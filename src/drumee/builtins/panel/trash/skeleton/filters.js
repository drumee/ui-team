const { TRASH_FILTERS, FILTER_LABELS } = require("../filters");

// Filter dropdown in the header, next to the close button: the trigger names
// the current order, the panel lists Latest / Earliest / Expiring soon. The
// lit row is not stamped here: the panel root carries data-filter and the
// skin lights the matching __filter--<value>. A pick re-feeds the whole panel
// (index.js _setFilter), which rebuilds this trigger with the new label.
function trigger(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__filter-trigger`,
    // The trigger must RAISE an event or the menu never opens; a `service` is
    // what makes the Box emit. Nothing handles the name itself.
    service: "open-trash-filter",
    attribute: { title: LOCALE.FILTER },
    // Every kid inert: a live child stops the click before the menu sees it.
    kids: [
      Skeletons.Note({
        active: 0,
        className: `${pfx}__filter-label`,
        content: LOCALE[FILTER_LABELS[ui._filter] || FILTER_LABELS.latest],
      }),
      Skeletons.Image.Svg({ active: 0, ico: "ph-caret-down", className: `${pfx}__filter-caret` }),
    ],
  });
}

function row(ui, pfx, filter) {
  return Skeletons.Box.X({
    className: `${pfx}__filter ${pfx}__filter--${filter}`,
    service: "trash-filter",
    name: filter,
    uiHandler: [ui],
    // On the ROW, so its label and tick don't swallow the tap meant for it.
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({ className: `${pfx}__filter-name`, content: LOCALE[FILTER_LABELS[filter]] }),
      Skeletons.Image.Svg({ ico: "app-check", className: `${pfx}__filter-check` }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Menu({
    className: `${pfx}__filter-menu`,
    debug: __filename,
    direction: _a.down,
    // MUST be set: without it ui-core uses Visitor.timeout() (2000, ms) as a
    // gsap duration (seconds), and the panel sits frozen mid-open.
    duration: 0.01,
    opening: _e.click,
    // Close once a row is picked.
    persistence: _a.once,
    trigger: trigger(ui, pfx),
    items: Skeletons.Box.Y({
      className: `${pfx}__filter-items`,
      kids: TRASH_FILTERS.map((f) => row(ui, pfx, f)),
    }),
  });
};
