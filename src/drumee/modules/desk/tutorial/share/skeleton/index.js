/**
 * Step body for the `share` tour — Figma 148:41197 → 148:44198.
 *
 * The populated Files grid on the left (shared scenery) with the Secure Share
 * panel docked on the right. The six screens differ only in which block of the
 * panel carries the focus ring, so this takes `lit` and hands it straight down.
 */

const { filesGrid } = require('../../skeleton/toolkit/files-grid');
const panel = require('./panel');

module.exports = function (ui, screen = {}) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({ active: 0,
    className: `${pfx}__pane`,
    kids: [
      // The frames share from an external workspace, so its folders are pink.
      filesGrid(ui, { area: _a.share }),
      panel(ui, { lit: screen.lit, subject: screen.subject }),
    ],
  });
};

module.exports.BLOCKS = panel.BLOCKS;
