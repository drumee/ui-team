/**
 * Put the Open-File Switcher on the left of a player's root skeleton.
 *
 * `root` is the player's `${group}__main` Box.Y; its kids (topbar, content,
 * progress…) move into a column next to the panel, so every part keeps its
 * sys_pn and the player's own code is unchanged. Where the panel has no
 * meaning the root is returned as is: mobile (no room), the DMZ (a share
 * page has no desk to browse), or a node without a parent folder.
 */
// The frame's own layout (frame width, the stage's flex:1) lives in the
// switcher skin. The panel is a lazy kind, so loaded only from index.js the
// skin arrived with the panel's chunk — until then the stage shrank to its
// content and the player's header (title, Share, icons) piled up at the
// left. Load it with the frame, which renders in the player's first paint.
require("./skin");

function enabled(ui) {
  if (Visitor.isMobile && Visitor.isMobile()) return false;
  if (Visitor.inDmz) return false;
  return !!(ui.mget(_a.pid) && ui.mget(_a.hub_id));
}

function withFileSwitcher(ui, root) {
  if (!root || !enabled(ui)) return root;
  const pfx = "file-switcher";
  const kids = root.kids || [];
  root.kids = [
    Skeletons.Box.X({
      className: `${pfx}__frame`,
      kids: [
        { kind: "player_file_switcher", player: ui },
        Skeletons.Box.Y({ className: `${pfx}__stage`, kids }),
      ],
    }),
  ];
  return root;
}

module.exports = withFileSwitcher;
module.exports.enabled = enabled;
