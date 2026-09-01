const { workspaceDialog, BLOCKS } = require('../../skeleton/toolkit/workspace-dialog');
const { orgHome } = require('../../skeleton/toolkit/home');
const { inviteScreen } = require('../../skeleton/toolkit/invite');

/**
 * Step body for the `workspace` tour.
 *
 * Screen 1 is the home canvas the flow opens on (Figma 140:22684) — the state
 * BEFORE the dialog, with the `+ New` button that opens it. The five after it
 * are the dialog with one block at full strength.
 *
 * The last two exist only on the post-signup run (see _screensFor in
 * ../../index.js) and are not a mock: the same dialog with every section in
 * use, and then the invite card for whatever type was created. The tour ends on
 * that card: however it is left — sent, skipped, or closed — the host opens the
 * new workspace and throws the confetti over it as the tour comes down.
 *
 * @param {Object} ui
 * @param {Object} screen an entry from the step's SCREENS table
 * @param {Object} [state] what the live screens need that the table cannot
 *   know: the selected type, whether a submit is in flight, and — once one has
 *   been — the workspace that came back
 */
module.exports = function (ui, screen, state = {}) {
  if (screen.home) return orgHome(ui);
  if (screen.invite) return inviteScreen(ui, state.created || {});
  return workspaceDialog(ui, {
    lit: screen.lit,
    ready: !!screen.ready,
    live: !!screen.live,
    selected: state.selected,
    pending: !!state.pending,
    name: state.name,
  });
};

module.exports.BLOCKS = BLOCKS;
