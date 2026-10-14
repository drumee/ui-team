/**
 * Tell a mounted step that the layout under it changed (phone ⇄ desk).
 *
 * The step keeps `_screenIndex`, so re-running its own _showScreen() redraws the
 * SAME screen in the other layout — a rotation mid-tour lands where the user
 * was rather than back at the start.
 *
 * @param {Object} step a step widget (tutorial_*), or anything falsy
 * @param {'phone'|'desk'} layout
 * @returns {Boolean} whether the step re-rendered
 */
function relayoutStep(step, layout) {
  if (!step || typeof step.mget !== 'function') return false;
  if (step.isDestroyed && step.isDestroyed()) return false;
  if (step.mget('layout') === layout) return false;
  if (typeof step.mset === 'function') step.mset('layout', layout);
  if (typeof step._showScreen === 'function') step._showScreen();
  return true;
}

module.exports = { relayoutStep };
