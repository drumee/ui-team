/**
 * Put the Open-File Switcher on the left of a player's root skeleton.
 *
 * `root` is the player's `${group}__main` Box.Y; its kids (topbar, content,
 * progress…) move into a column next to the panel, so every part keeps its
 * sys_pn and the player's own code is unchanged. Where the panel has no
 * meaning the root is returned as is: mobile (no room), the DMZ (a share
 * page has no desk to browse), a node without a parent folder, or one that
 * is not a file yet (a maiden text note has a pid but no nid).
 */

const COLLAPSED_KEY = "player-file-switcher:collapsed";

// Panel width plus the 8px frame gap (skin: __ui 240px / 60px collapsed).
const PANEL_WIDTH = 248;
const COLLAPSED_WIDTH = 68;

// Root wrappers that must stay full-window: the stage clips (overflow:
// hidden), so a modal or tooltip layer moved into it would be cut off.
const ROOT_WRAPPERS = ["dialog", "tooltips"];

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function writeCollapsed(v) {
  try {
    localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
  } catch (e) {
    // The toggle still works for this window.
  }
}

function enabled(ui) {
  if (Visitor.isMobile && Visitor.isMobile()) return false;
  if (Visitor.inDmz) return false;
  return !!(ui.mget(_a.nid) && ui.mget(_a.pid) && ui.mget(_a.hub_id));
}

/** Width a player must add to its own so the panel takes none of it. */
function reservedWidth(ui) {
  if (!enabled(ui)) return 0;
  return readCollapsed() ? COLLAPSED_WIDTH : PANEL_WIDTH;
}

function withFileSwitcher(ui, root) {
  if (!root || !enabled(ui)) return root;
  const pfx = "file-switcher";
  const kids = root.kids || [];
  const stay = kids.filter((k) => k && ROOT_WRAPPERS.includes(k.name));
  const moved = kids.filter((k) => !stay.includes(k));
  root.className = `${root.className || ""} ${pfx}__host`.trim();
  root.kids = [
    Skeletons.Box.X({
      className: `${pfx}__frame`,
      kids: [
        { kind: "player_file_switcher", player: ui },
        Skeletons.Box.Y({ className: `${pfx}__stage`, kids: moved }),
      ],
    }),
    ...stay,
  ];
  return root;
}

Object.assign(withFileSwitcher, {
  enabled,
  reservedWidth,
  readCollapsed,
  writeCollapsed,
  PANEL_WIDTH,
  COLLAPSED_WIDTH,
});

module.exports = withFileSwitcher;
