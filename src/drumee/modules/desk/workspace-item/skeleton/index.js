/**
 * Sidebar workpace item (refactored)
 */

// ---------- Export ----------
module.exports = function (ui) {
  const fig = ui.fig.family;

  return [
    Skeletons.Box.X({ className: `${fig}-status` }),
    Skeletons.Note({ className: `${fig}-name`, content: ui.mget(_a.filename) })
  ]
};
