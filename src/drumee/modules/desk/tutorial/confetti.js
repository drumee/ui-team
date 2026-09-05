/**
 * The tour's celebration, in one place.
 *
 * Thrown over the FIRST SCREEN OF THE MIGRATE TOUR, which is where the
 * post-signup walkthrough now lands after a workspace has been made: the
 * workspace tour opens the new workspace, comes down, and hands straight over
 * to `migrate`. The confetti belongs to that arrival rather than to the tour
 * that ended, so it is raised by the tour that is on screen when it plays.
 *
 * It used to be `_celebrate()` on tutorial_main, fired as that widget tore
 * itself down — which is why the notes below are about surviving a destroy.
 * They still hold: the module-level entry point owns its own canvas either
 * way, and keeping the interop lesson in one file is the reason this is a
 * module rather than three lines at the call site.
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

// Over the tour, not behind it. The overlay a tour lives in sits at 10010, so
// canvas-confetti's default of 100 would spend the whole animation underneath
// the screen it is celebrating.
const Z_INDEX = 10020;

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

module.exports = { celebrate };
