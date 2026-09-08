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

module.exports = function (ui, screen = {}, state = {}) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__stage`,
    kids: [
      filesPane(ui, {
        // Open only while the user has opened it — the + New buttons toggle it
        // now rather than the tour drawing it open on a screen of its own.
        //
        // The KEY of the button it hangs off ("toolbar" or "hero"), because the
        // pane draws that button twice and the menu is a child of whichever one
        // was pressed.
        menu: screen.menu ? state.menuOpen : null,
        // `live_menu` is what turns the dropdown's rows from a drawing into
        // controls that really create. Without it they stay inert, which is
        // what every other tour drawing this pane wants.
        live_menu: screen.live_menu,
        // Only where the screen asks for them. Everywhere else these are the
        // drawing the frames show, and a stray click on the pane must not move
        // the tour.
        cta_service: screen.live ? 'mg-open-dialog' : null,
        // Makes BOTH + New buttons controls — the toolbar's and the hero's.
        new_service: screen.live ? 'mg-toggle-menu' : null,
        upload_service: screen.live ? 'mg-do-upload' : null,
      }),
      screen.dialog
        ? Skeletons.Box.Y({ active: 0,
            className: `${pfx}__overlay`,
            kids: [dialog(ui, {
            copied: screen.copied,
            linked: screen.linked,
            // Set only on the screen where the card ARRIVES — see _transition
            // and the `enter` note in ../index.js.
            enter: state.enter,
          })],
          })
        : null,
    ].filter(Boolean),
  });
};
