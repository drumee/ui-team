/**
 * The tour's celebration, in one place.
 *
 * Thrown over the FIRST STEP OF THE MIGRATE TOUR as it runs in the in-window
 * host (builtins/window/tutorial), which is where the post-signup walkthrough
 * lands once a workspace has been made: the workspace tour opens the new
 * workspace, comes down, and hands straight over. The confetti belongs to that
 * arrival rather than to the tour that ended, so it is raised by the host that
 * is on screen when it plays.
 *
 * RAISED ONLY BY THE HAND-OFF. `celebrate` is set on showTutorial's opt by
 * _chainMigrateTour and by nothing else, so this fires when a workspace has
 * just been made, opened and confirmed on screen — and not when the same tour
 * is raised from the rail's Files button, which is an ordinary Tuesday.
 *
 * That flag was briefly removed, on the reasoning that the in-window host was
 * itself the condition because nothing else mounted this tour there. True when
 * it was written; the rail trigger made it false.
 *
 * The MODULE-LEVEL confetti(), not create(). create() binds to a canvas the
 * caller owns; the global one appends its own fixed, pointer-events:none
 * canvas to <body> and removes it again when the animation finishes
 * (canvas-confetti src/confetti.js `done`), so there is nothing to clean up,
 * nothing left behind, and nothing that dies with the widget that asked.
 *
 * `.default || mod` is NOT defensive noise. canvas-confetti ships two builds
 * and declares both — "main" is CommonJS (module.exports = fn) and "module" is
 * ESM (export default fn). Webpack targets the web, where mainFields defaults
 * to ['browser', 'module', 'main'], so it bundles the ESM build and hands this
 * require a module NAMESPACE OBJECT: { create, default }. Calling that throws.
 * Node's require() reads "main" and hands back a function, so the bare call
 * worked in every test and in nothing the user could see — `confetti is not a
 * function`, caught below, warned, and the tour played no confetti and gave no
 * explanation.
 */

// Over the tour, not behind it — and the number that does that is much larger
// than it looks like it needs to be.
//
// The tour lives in `.desk-module__overlay`, whose own rule says z-index 10010.
// That is not what it computes to: skin/lib/utils.scss carries a BARE
// `[data-state="open"] { z-index: var(--z-index-context) !important }`, which
// matches any element with that attribute — the overlay included — and lifts it
// to 50000. canvas-confetti appends its canvas to <body>, so it competes at the
// root against that 50000, not against 10010.
//
// So the old constant here (10020) put the whole animation BEHIND the screen it
// was celebrating. Measured with elementFromPoint against the real cascade: at
// 10020 the tour is on top, at this value the canvas is.
//
// Above 100001 too, which is where the desk topbar sits after it was lifted
// clear of the same overlay. Confetti over the whole window is the intent, and
// canvas-confetti's canvas is pointer-events: none, so nothing is blocked.
const Z_INDEX = 100002;

/**
 * Two bursts from the lower corners, the way the frame scatters them across
 * the whole pane rather than out of one point.
 *
 * Never throws: a celebration is not load-bearing for the thing it celebrates.
 *
 * @param {Object} [host] a widget, for `warn` when the module will not load
 * @returns {Boolean} whether the confetti actually went up
 */
function celebrate(host) {
  try {
    const mod = require('canvas-confetti');
    const confetti = mod.default || mod;
    const burst = (x, angle) => confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 55,
      origin: { x, y: 0.9 },
      angle,
      scalar: 0.9,
      zIndex: Z_INDEX,
    });
    burst(0.15, 60);
    burst(0.85, 120);
    return true;
  } catch (e) {
    if (host && host.warn) host.warn('[tutorial] confetti failed', e);
    return false;
  }
}

// Z_INDEX is exported for tests/harness/confetti-stacking.js, which measures
// it against the real cascade — the whole point of the number is a comparison
// with something declared in another file, so a harness that hardcoded it
// would pass while the code was wrong.
module.exports = { celebrate, Z_INDEX };
