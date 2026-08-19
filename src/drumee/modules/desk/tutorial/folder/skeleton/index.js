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

/**
 * Screen 2 — the Chat tab with the hover toolbar on the file message.
 *
 * Figma 3202:3732. The thread panel is open on the right and the hover bar sits
 * on the message, so one screen shows both how a thread is started and what one
 * looks like. It replaced a second screen that showed the same view without the
 * bar and carried word-for-word the same copy.
 */
function threadHintScreen(ui) {
  return threadsView(ui, { hint: true });
}

/**
 * Screen 3 — same folder view, with a file's context menu open.
 *
 * The menu hangs off the file's kebab, the way the design opens it. The
 * sub-folder row is dropped here: the menu is 343px tall, and with the files
 * pushed to a second row it ran past the bottom of the panel.
 */
function menuScreen(ui) {
  return folder(ui, chatPanel, { menu: contextMenu, folders: false });
}

module.exports = { chatScreen, threadHintScreen, menuScreen };
