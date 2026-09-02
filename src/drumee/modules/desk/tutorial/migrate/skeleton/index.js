/**
 * Step body for the `migrate` tour.
 *
 * Figma 176:47527 / 180:49109 / 180:49990 — the import dialog at three points
 * in the form, over the Files pane the frames hold back behind it.
 *
 * The pane used to be the step's own subject: two screens ahead of the dialog
 * were ABOUT it (the Migrate CTA and the + New menu open), which is why this
 * draws the pane itself rather than taking it as a backdrop. Those screens are
 * gone, so the pane is now only the ground — but it is still drawn here, since
 * nothing else in the tour draws it. `filesPane`'s `menu` option is no longer
 * passed: no screen opens that dropdown any more.
 */

const { filesPane } = require('../../skeleton/toolkit/files');
const dialog = require('./dialog');

module.exports = function (ui, screen = {}) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__stage`,
    kids: [
      filesPane(ui),
      screen.dialog
        ? Skeletons.Box.Y({ active: 0,
            className: `${pfx}__overlay`,
            kids: [dialog(ui, { copied: screen.copied, linked: screen.linked })],
          })
        : null,
    ].filter(Boolean),
  });
};
