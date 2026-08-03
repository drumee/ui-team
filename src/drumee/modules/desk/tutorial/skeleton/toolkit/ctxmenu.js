/**
 * Step 2 / screen 3 — the file context menu with the Chat thread submenu open.
 *
 * Figma: node 3202:76934. Measured off the 1:1 render — menu 176px, rows 32px,
 * group separators, selected row filled #F2F2F7 with an 8px inset, submenu
 * 200px opening 8px past the menu's right edge and aligned to its parent row.
 * Item labels, order and icons mirror the real menu
 * (builtins/contextmenu/skeleton/items.js + icons.js) so the tour teaches the
 * menu the user will actually meet.
 *
 * Visual only — no services. `ctx-menu` is the spotlight target.
 */

// Groups render in order, separated by a hairline — same grouping as the design.
const GROUPS = [
  [
    { ico: "ctxmenu-copy", label: LOCALE.MAKE_A_COPY || "Make a copy" },
    { ico: "download", label: LOCALE.DOWNLOAD || "Download" },
  ],
  [
    { ico: "file-organize", label: LOCALE.ORGANIZE || "Organize" },
    { ico: "ctxmenu-share", label: LOCALE.SHARE || "Share" },
  ],
  [
    { ico: "ctxmenu-rename", label: LOCALE.RENAME || "Rename" },
    {
      ico: "file-thread",
      label: LOCALE.CHAT_THREADS || "Chat thread",
      selected: true,
      submenu: [
        { ico: "apps-eye", label: LOCALE.VIEW_CHAT_THREADS || "View chat threads", selected: true },
        { ico: "app-download", label: LOCALE.DOWNLOAD_CHAT_THREADS || "Download chat threads" },
      ],
    },
  ],
  [
    { ico: "ctxmenu-info", label: LOCALE.GET_INFO || "Get info" },
    { ico: "shield", label: LOCALE.PROHIBIT_CHANGE || "Prohibit any change" },
    { ico: "ctxmenu-delete", label: LOCALE.MOVE_TO_TRASH || "Move to trash" },
  ],
];

function menuItem(pfx, item, extra = {}) {
  return Skeletons.Box.X({
    className: `${pfx}__ctx-item${item.selected ? " selected" : ""}`,
    ...extra,
    kids: [
      Skeletons.Image.Svg({ ico: item.ico, className: `${pfx}__ctx-icon` }),
      Skeletons.Note({ className: `${pfx}__ctx-label`, content: item.label }),
    ],
  });
}

function submenu(pfx, items) {
  return Skeletons.Box.Y({
    className: `${pfx}__ctx-submenu`,
    kids: items.map((it) => menuItem(pfx, it)),
  });
}

/**
 * @param {Object} ui
 * @param {String} pfx
 * @returns {Object} absolutely-positioned menu. It is rendered inside a tile's
 *   kebab (`tutorial__grid-more`), which is what positions it — see
 *   folder/skin `__ctx-menu` and toolkit/folder.js `moreButton`.
 */
export function contextMenu(ui, pfx) {
  const kids = [];
  GROUPS.forEach((group, g) => {
    if (g) kids.push(Skeletons.Box.Y({ className: `${pfx}__ctx-separator` }));
    group.forEach((item) => {
      if (!item.submenu) return kids.push(menuItem(pfx, item));
      // The parent row and its submenu share a relative wrapper so the submenu
      // can hang off the row's own top edge, as in the design.
      //
      // That wrapper is also the spotlight's target: it spans the full menu
      // width but only the row's height, so the connector meets the menu's
      // left edge level with "Chat thread" — where the design points it —
      // instead of at the middle of the menu. The submenu is absolute and so
      // does not stretch it. The hole is sized by an explicit radius (see
      // folder/index.js) because the row alone would not reveal the menu.
      kids.push(
        Skeletons.Box.Y({
          className: `${pfx}__ctx-item-wrap`,
          sys_pn: "ctx-focus",
          partHandler: ui,
          kids: [menuItem(pfx, item), submenu(pfx, item.submenu)],
        }),
      );
    });
  });

  return Skeletons.Box.Y({
    className: `${pfx}__ctx-menu`,
    sys_pn: "ctx-menu",
    partHandler: ui,
    kids,
  });
}
