/**
 * `#/desk?window_tutorial=<id>&step=<n>&screen=<n>` — force a tour into a
 * folder window, for checking the UI.
 *
 *   #/desk?window_tutorial=share              the share tour, from screen 1
 *   #/desk?window_tutorial=share&screen=3     straight to its third screen
 *   #/desk?window_tutorial=chat               a tour with no in-window trigger
 *
 * WHY IT EXISTS. Only `share` is fired from inside a folder window. Without a
 * URL the other five could not be looked at in this host at all, and the one
 * that can would need a fresh account and a real click to see twice.
 *
 * `full` is deliberately excluded: it is 23 screens of desk chrome, and the
 * host that draws desk chrome is the desk's.
 *
 * These runs are PREVIEWS. `preview: 1` exempts them from the seen-set in both
 * directions, so the same URL works twice and the real trigger stays armed.
 *
 * Relative require rather than the `desk/` alias: this module is also loaded by
 * a node test, where webpack's alias table does not exist.
 */
const { TOURS } = require('../../../modules/desk/tutorial/tours');

// The one tour that has no business running inside a window.
const EXCLUDED = new Set(['full']);

/**
 * @param {Object} args from Visitor.parseModuleArgs()
 * @returns {{tour: String, opt: Object}|null}
 */
function previewRequest(args = {}) {
  const id = args && args.window_tutorial;
  if (typeof id !== 'string') return null;
  if (EXCLUDED.has(id)) return null;
  // Bare TOURS[id] is truthy for inherited Object.prototype members
  // ('constructor', 'toString', etc) reachable from the URL hash.
  if (!Object.prototype.hasOwnProperty.call(TOURS, id)) return null;

  const opt = { preview: 1 };
  // 1-based in the URL, matching what the badge shows; the host and the step
  // clamp them, so a nonsense value lands somewhere real.
  if (args.step) opt.enter_at_step = args.step;
  if (args.screen) opt.enter_at_screen = args.screen;
  // What the tour is about, when only a trigger would normally know — the share
  // panel's header is the case that needs it.
  if (args.subject) opt.subject = args.subject;
  return { tour: id, opt };
}

module.exports = { previewRequest };
