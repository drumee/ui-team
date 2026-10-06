/**
 * Empty state of the WORKSPACE TEAM CHAT — Figma 920:122905 (Files-tab side
 * column, text only) and 922:124283 (full Chat tab, with the 80px icon). One
 * skeleton; the folder skin (window/folder/skin/chat-empty-state.scss) sizes
 * it per view off the split body's data-view.
 *
 * Every other conversation keeps the plain "No discussions yet": a DMZ share
 * (scope folder), a personal / p2p room, and a file thread — including the
 * Files tab's in-place file scope, which reuses this widget's list
 * (index.js setScopedFileNid re-sets the placeholder on each switch, because
 * ui-core re-reads mget("placeholder") on every empty answer).
 *
 * The icon assets are required inside chatEmptyState, not at module load:
 * widget/chat/index.js requires this module, and loading the chat widget must
 * not depend on the `assets/` webpack alias resolving (its node tests load it
 * bare). webpack still bundles a literal require() inside a function.
 */

/**
 * The workspace team chat (skeleton/toolkit chatPanel sets scope "workspace"
 * for a window-folder without a share token), not narrowed to a file.
 * @param {*} ui chat widget
 */
function isTeamChat(ui) {
  return ui.mget("scope") === "workspace" && !ui.scopedFileNid;
}

/**
 * @param {*} ui chat widget
 * @returns Skeleton
 */
function chatEmptyState(ui) {
  if (!isTeamChat(ui)) return Skeletons.Note(LOCALE.NO_DISCUSSIONS_YET, "no-content");
  const p = `${ui.fig.family}__team-empty`;
  const img = (src) =>
    Skeletons.Element({ active: 0, tagName: "img", className: `${p}-img`, attribute: { src, alt: "" } });
  const back = require("assets/empty-states/chat-empty-back.svg");
  const front = require("assets/empty-states/chat-empty-front.svg");
  return Skeletons.Box.Y({
    className: `${p} no-content`,
    kids: [
      // Back bubble first, front bubble painted over it (Figma 922:124660).
      Skeletons.Box.X({ active: 0, className: `${p}-ico`, kids: [img(back), img(front)] }),
      Skeletons.Note({ active: 0, className: `${p}-title`, content: LOCALE.CHAT_EMPTY_TITLE }),
      Skeletons.Note({ active: 0, className: `${p}-text`, content: LOCALE.CHAT_EMPTY_TEXT }),
    ],
  });
}

module.exports = { isTeamChat, chatEmptyState };
