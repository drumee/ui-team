/**
 * Step 5 bodies — the folder window with the secure-share panel slid in from
 * the right, one builder per internal screen.
 *
 * The window chrome and the file grid come from the shared toolkit, so the
 * folder looks the same as it does in Step 2; the panel overlays the chat rail,
 * which is where the design puts it (Permission Panel at x=894, exactly where
 * the chat panel starts).
 */

const { folder, chatPanel } = require('../../skeleton/toolkit');
const panel = require('./panel');

function window(ui, state) {
  const pfx = ui.fig.family;
  const aspect = ui.mget('aspect') || 'normal';
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    // The share step's folder is a shared one — pink folder, EXTERNAL badge.
    dataset: { aspect, access: 'shared' },
    kids: [
      folder(ui, chatPanel, {
        badge: LOCALE.EXTERNAL || 'EXTERNAL',
        // Shared folder, so the sub-folder tiles take the share fill rather
        // than Step 2's private red.
        area: _a.share,
      }),
      panel(ui, pfx, state),
    ],
  });
}

/** Screen 1 — recipient mode; neither access mode expanded yet. */
const modeScreen = (ui) => window(ui, {});

/** Screen 2 — Secure Share picked, its email and password controls open. */
const secureScreen = (ui) => window(ui, { secure: true });

/** Screen 3 — the link has been issued and can be copied or revoked. */
const linkScreen = (ui) => window(ui, { secure: true, link: true });

module.exports = { modeScreen, secureScreen, linkScreen };
