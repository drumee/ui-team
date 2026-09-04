/**
 * Step body for the `migrate` tour.
 *
 * Two screens of the Files pane (Figma 142:34981, and 142:35805 with the
 * + New dropdown open), then the import dialog at three points in the form
 * (176:47527 / 180:49109 / 180:49990) over the same pane, which the dialog
 * frames hold back behind the card.
 *
 * So the pane is drawn on all five screens — as the SUBJECT on the first two
 * and as the ground on the last three — which is why this composes it here
 * rather than taking it as a backdrop from somewhere else.
 *
 * @param {Object} ui
 * @param {Object} [screen] the SCREENS entry — `menu` opens the + New
 *   dropdown, `dialog` lays the import card over the pane, and `live` makes
 *   the hero's two buttons real controls (screen 1, which has no callout to
 *   carry a Next)
 */

const { filesPane } = require('../../skeleton/toolkit/files');
const dialog = require('./dialog');

module.exports = function (ui, screen = {}) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__stage`,
    kids: [
      filesPane(ui, {
        menu: screen.menu,
        // Only where the screen asks for them. Everywhere else these two are
        // the drawing the frames show, and a stray click on the pane must not
        // move the tour.
        cta_service: screen.live ? 'mg-open-dialog' : null,
        new_service: screen.live ? 'mg-open-menu' : null,
        upload_service: screen.live ? 'mg-open-upload' : null,
      }),
      screen.dialog
        ? Skeletons.Box.Y({ active: 0,
            className: `${pfx}__overlay`,
            kids: [dialog(ui, { copied: screen.copied, linked: screen.linked })],
          })
        : null,
    ].filter(Boolean),
  });
};
