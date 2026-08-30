const { workspaceDialog, BLOCKS } = require('../../skeleton/toolkit/workspace-dialog');
const { orgHome } = require('../../skeleton/toolkit/home');

/**
 * Step body for the `workspace` tour.
 *
 * Screen 1 is the home canvas the flow opens on (Figma 140:22684) — the state
 * BEFORE the dialog, with the `+ New` button that opens it. Every screen after
 * it is the dialog with one block at full strength.
 *
 * @param {Object} ui
 * @param {Object} screen an entry from the step's SCREENS table
 */
module.exports = function (ui, screen) {
  if (screen.home) return orgHome(ui);
  return workspaceDialog(ui, { lit: screen.lit, ready: !!screen.ready });
};

module.exports.BLOCKS = BLOCKS;
