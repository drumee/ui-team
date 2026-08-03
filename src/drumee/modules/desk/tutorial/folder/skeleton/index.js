/**
 * Step 2 bodies — one builder per internal screen.
 *
 * Screen 1 and 3 share the folder view; screen 3 lays a context menu over the
 * file grid. Screen 2 swaps in the Chat tab with a file thread open.
 */

const { folder, chatPanel, threadsView, contextMenu } = require('../../skeleton/toolkit');

/** Screen 1 — folder + team chat, the view Step 2 has always shown. */
function chatScreen(ui) {
  return folder(ui, chatPanel);
}

/** Screen 2 — the Chat tab, file thread open on the right. */
function threadsScreen(ui) {
  return threadsView(ui);
}

/**
 * Screen 3 — same folder view, with a tile's context menu open.
 *
 * The menu hangs off the kebab on a tile, the way the design opens it. It goes
 * on a tile in the FIRST grid row: the menu is 343px tall, and opening it from
 * the second row would run it past the bottom of the folder window.
 */
function menuScreen(ui) {
  return folder(ui, chatPanel, { menu: contextMenu });
}

module.exports = { chatScreen, threadsScreen, menuScreen };
