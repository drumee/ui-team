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
 * Screen 3 — same folder view, with the file context menu open.
 *
 * The menu is a sibling of the folder body inside a positioned anchor rather
 * than a child of a file tile: the tile is laid out by a wrapping grid, and
 * hanging an absolute panel off it would either clip against the grid's
 * overflow or shift the tiles.
 */
function menuScreen(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__ctx-anchor`,
    kids: [folder(ui, chatPanel), contextMenu(ui, pfx)],
  });
}

module.exports = { chatScreen, threadsScreen, menuScreen };
