/**
 * Step body for the `migrate` tour.
 *
 * Figma, in order: 142:34981 (the Files empty state), 142:35805 (its + New
 * menu open), then 176:47527 / 180:49109 / 180:49990 (the import dialog at
 * three points in the form).
 *
 * The step draws the Files pane ITSELF rather than taking it as a backdrop:
 * two of the five screens are about the pane — the Migrate CTA and the + New
 * menu — so the pane's state is the step's business, not inert scenery.
 */

const { filesPane } = require('../../skeleton/toolkit/files');
const dialog = require('./dialog');

module.exports = function (ui, screen = {}) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__stage`,
    kids: [
      filesPane(ui, { menu: !!screen.menu }),
      screen.dialog
        ? Skeletons.Box.Y({ active: 0,
            className: `${pfx}__overlay`,
            kids: [dialog(ui, { copied: screen.copied, linked: screen.linked })],
          })
        : null,
    ].filter(Boolean),
  });
};
