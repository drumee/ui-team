// ── Static data ───────────────────────────────────────────────────────────────
const SUB_FOLDERS = [
  "Sub-folder v1",
  "Sub-folder v2",
  "Sub-folder v3",
  "Sub-folder v4",
];

// Three tiles. bg_concept.png earns its place: the team-chat panel next to
// the grid keeps referring to it.
const FILES = [
  { name: "spec_v2.docx", date: "Oct 12, 2023", ico: "app-doc-file" },
  { name: "spec_v2.pdf", date: "Oct 12, 2023", ico: "app-pdf-file" },
  { name: "bg_concept.png", date: "Oct 12, 2023", ico: "image" },
];

const MESSAGES = [
  { sender: null, text: "/bg_concept.png", time: null },
  {
    sender: "me",
    text: "Did everyone see /bg_concept.png? I've updated the core requirements.",
    time: "11:42 AM",
  },
  {
    sender: "Sarah K.",
    text: "Please check the /bg_concept.png for the latest revisions.",
    time: "11:53 AM",
  },
  { sender: "me", text: "/bg_concept.png @Sarah hello", time: "11:42 AM" },
];

const WORKSPACES = [
  { name: "Personal Workspace", area: _a.personal, variant: "purple", state: 1 },
  {
    name: "Internal Workspace",
    area: _a.private,
    variant: "salmon",
    state: 0,
  },
  { name: "External Workspace", area: _a.share, variant: "pink", state: 0 },
];

/**
 *
 */
export function workspaceIcon(ui, area = _a.share) {
  const pfx = `${ui.fig.family}__folder`;
  return {
    kind: "media_grid",
    className: `${pfx}-item-icon`,
    filetype: _a.hub,
    role: "desk",
    area,
    active: 0,
    service: "nop",
    mode: _a.vignette,
  };
}

export function workspaceItem(ui, ws, index) {
  const fig = ui.fig.family;
  const p = `${fig}__wg`;
  const { name, variant, area, state } = ws;
  let opt = {
    className: `${p}-card ${ui.fig.group}__grid-folder`,
    sys_pn: `workspace-item-${index}`,
    partHandler: [ui],
    radio: `${ui._id}-workspace`,
    state,
    active: 0,
    name,
    variant,
    area,
    state,
  };
  return folderItem(ui, name, opt);
  // return Skeletons.Box.Y({
  //   className: `${p}-card ${ui.fig.group}__grid-folder`,
  //   sys_pn: `workspace-card-${index}`,
  //   partHandler: [ui],
  //   radio: `${ui._id}-badge`,
  //   state,
  //   active: 0,
  //   kids: [
  //     workspaceIcon(ui, area),
  //     Skeletons.Note({ className: `${p}-label`, content: name }),
  //   ],
  // });
}

export function workspaceContent(ui, opt = {}) {
  const fig = ui.fig.family;
  const p = `${fig}__wg`;
  const { aspect = "normal" } = opt;
  return Skeletons.Box.Y({
    className: `${p}-content`,
    dataset: { aspect },
    kids: [
      Skeletons.Box.X({
        className: `${p}-grid`,
        sys_pn: `workspace-container`,
        kids: WORKSPACES.map((ws, i) => workspaceItem(ui, ws, i)),
      }),
    ],
  });
}

// ── Folder header bar ─────────────────────────────────────────────────────────
/**
 * @param {Object} ui
 * @param {String} pfx
 * @param {Object} [opt]
 * @param {String} [opt.badge] access badge next to the name. Defaults to
 *   INTERNAL; the tracker step passes EXTERNAL, since its folder is a shared
 *   one (see the pink treatment in task/skin).
 */
export function folderHeader(ui, pfx, opt = {}) {
  const badge = opt.badge || LOCALE.INTERNAL || "INTERNAL";
  return Skeletons.Box.X({
    className: `${pfx}__header`,
    sys_pn: "folder-header",
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header-left`,
        kids: [
          Skeletons.Image.Svg({
            ico: "addmenu-folder",
            className: `${pfx}__header-icon`,
          }),
          Skeletons.Note({
            className: `${pfx}__header-name`,
            content: LOCALE.FOLDER || "Folder",
          }),
          Skeletons.Note({
            className: `${pfx}__header-restricted`,
            content: badge,
            sys_pn: "restricted-badge",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__header-actions`,
        kids: [
          Skeletons.Button.Label({
            ico: "desktop_upload",
            className: `${pfx}__header-upload`,
            label: LOCALE.UPLOAD,
          }),
          Skeletons.Button.Label({
            ico: "topbar-add",
            className: `${pfx}__header-add`,
            label: LOCALE.ADD_NEW || "Add new",
          }),
          Skeletons.Button.Svg({
            ico: "apps-gear",
            className: `${pfx}__header-settings`,
          }),
          Skeletons.Button.Svg({
            ico: "cross",
            className: `${pfx}__header-close`,
          }),
        ],
      }),
    ],
  });
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
/**
 * @param {Object} ui
 * @param {String} pfx
 * @param {Object} [opt]
 * @param {String} [opt.active='files'] which tab reads as selected
 * @param {Boolean} [opt.meeting] append the Meeting tab (Step 2 screens 2-3;
 *   the Figma for screen 1 predates it, so it stays off by default and the
 *   other steps keep the exact three-tab bar they render today)
 */
export function tabBar(ui, pfx, opt = {}) {
  const { active = "files", meeting = false } = opt;
  const tabs = [
    { key: "files", ico: "app-file", label: LOCALE.FILES || "Files" },
    { key: "chat", ico: "apps-chat", label: LOCALE.CHAT || "Chat" },
    { key: "tasks", ico: "app-task", label: LOCALE.TASKS || "Tasks" },
  ];
  if (meeting) {
    tabs.push({
      key: "meeting",
      ico: "folder-meeting",
      label: LOCALE.MEETING || "Meeting",
    });
  }
  return Skeletons.Box.X({
    className: `${pfx}__tabs`,
    kids: tabs.map((t) =>
      Skeletons.Button.Label({
        ico: t.ico,
        className: `${pfx}__tab${t.key === active ? " active" : ""}`,
        label: t.label,
      }),
    ),
  });
}

// ── Type filter ───────────────────────────────────────────────────────────────
export function typeFilter(ui, pfx) {
  const filters = [
    LOCALE.ALL || "All",
    LOCALE.DOCS || "Docs",
    "PDF",
    LOCALE.IMAGES || "Images",
    LOCALE.OTHER || "Other",
  ];
  return Skeletons.Box.X({
    className: `${pfx}__filter`,
    kids: filters.map((label, i) =>
      Skeletons.Note({
        className: `${pfx}__filter-item${i === 0 ? " active" : ""}`,
        content: label,
      }),
    ),
  });
}

// ── File grid ─────────────────────────────────────────────────────────────────
/**
 * The kebab every tile carries next to its name, as in the design. It is also
 * the anchor a tile menu hangs from, so it stays positioned even though the
 * tiles are laid out by a wrapping grid.
 *
 * Always keyed on ui.fig.group so folder tiles (group prefix) and file tiles
 * (family prefix) share one rule — see skin/media.scss.
 *
 * @param {Object} ui
 * @param {Array} [kids] extra children, e.g. a context menu
 */
export function moreButton(ui, kids = []) {
  const p = ui.fig.group;
  return Skeletons.Box.Y({
    className: `${p}__grid-more`,
    kids: [
      Skeletons.Image.Svg({ ico: "apps-dots-vertical", className: `${p}__grid-more-icon` }),
      ...kids,
    ],
  });
}

/**
 * @param {Object} opt
 * @param {Boolean} [opt.more] render the kebab next to the name. Off by
 *   default: the Step 1 workspace cards reuse this and have no kebab.
 * @param {Object} [opt.menu] menu skeleton to hang under the kebab
 */
export function folderItem(ui, name, opt = {}) {
  let pfx = ui.fig.group;
  const { more, menu, ...rest } = opt;
  const label = Skeletons.Note({
    className: `${pfx}__grid-folder-name`,
    content: name,
  });
  return Skeletons.Box.Y({
    className: `${pfx}__grid-folder`,
    ...rest,
    kids: [
      workspaceIcon(ui, opt.area),
      more
        ? Skeletons.Box.X({
          className: `${pfx}__grid-name-row`,
          kids: [label, moreButton(ui, menu ? [menu] : [])],
        })
        : label,
    ],
  });
}

export function fileItem(ui, pfx, { name, date, ico }, opt = {}) {
  return Skeletons.Box.Y({
    className: `${pfx}__grid-file`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__grid-file-icon-wrap`,
        kids: [
          Skeletons.Image.Svg({ ico, className: `${pfx}__grid-file-icon` }),
        ],
      }),
      Skeletons.Box.X({
        className: `${ui.fig.group}__grid-name-row`,
        kids: [
          Skeletons.Note({ className: `${pfx}__grid-file-name`, content: name }),
          moreButton(ui, opt.menu ? [opt.menu] : []),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__grid-file-date`, content: date }),
    ],
  });
}

/**
 * @param {Object} [opt]
 * @param {Function} [opt.menu] builder for a tile menu — receives (ui, pfx)
 * @param {Number} [opt.menuAt] which FILE tile owns it (default 1 =
 *   spec_v2.pdf, the one the design opens it from)
 * @param {Boolean} [opt.folders=true] render the sub-folder row. Screen 3
 *   turns it off so the files sit on the first row and the 343px menu opens
 *   with room to spare.
 * @param {String} [opt.area=_a.private] area the sub-folder art is filled from.
 *   Step 5 passes _a.share, its folder being a shared one.
 */
export function filesPanel(ui, pfx, opt = {}) {
  const { menu = null, menuAt = 1, folders = true, area = _a.private } = opt;
  return Skeletons.Box.Y({
    className: `${pfx}__files`,
    // Step 2 / screen 3 lights the whole panel.
    sys_pn: "files-panel",
    partHandler: ui,
    kids: [
      typeFilter(ui, pfx),
      Skeletons.Box.X({
        className: `${pfx}__grid`,
        kids: [
          // The folder art is filled per area: private gives the red that goes
          // with the INTERNAL folder these tiles live in, share resolves to
          // --area-share (pink). Step 2 keeps the default; Step 5 overrides it.
          ...(folders
            ? SUB_FOLDERS.map((name) =>
              folderItem(ui, name, { more: true, area }),
            )
            : []),
          ...FILES.map((f, i) =>
            fileItem(ui, pfx, f, {
              menu: menu && i === menuAt ? menu(ui, pfx) : null,
            }),
          ),
        ],
      }),
    ],
  });
}

// ── Chat panel ────────────────────────────────────────────────────────────────
export function chatMessage(pfx, msg, ui) {
  if (!msg.sender) {
    // The file chip is Step 2 / screen 1's spotlight target — the design points
    // the callout at it rather than at the panel as a whole.
    return Skeletons.Note({
      className: `${pfx}__chat-link`,
      content: msg.text,
      ...(ui ? { sys_pn: "chat-link", partHandler: ui } : {}),
    });
  }
  if (msg.sender === "me") {
    return Skeletons.Box.Y({
      className: `${pfx}__chat-msg sent`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__chat-bubble sent`,
          content: msg.text,
        }),
        Skeletons.Note({ className: `${pfx}__chat-time`, content: msg.time }),
      ],
    });
  }
  return Skeletons.Box.Y({
    className: `${pfx}__chat-msg received`,
    kids: [
      Skeletons.Note({ className: `${pfx}__chat-sender`, content: msg.sender }),
      Skeletons.Note({
        className: `${pfx}__chat-bubble received`,
        content: msg.text,
      }),
      Skeletons.Note({ className: `${pfx}__chat-time`, content: msg.time }),
    ],
  });
}

export function chatPanel(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__chat-panel`,
    sys_pn: "chat-panel",
    partHandler: ui,
    kids: [
      Skeletons.Note({
        className: `${pfx}__chat-header`,
        content: "TEAM CHAT",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__chat-messages`,
        kids: MESSAGES.map((msg) => chatMessage(pfx, msg, ui)),
      }),
      Skeletons.Box.X({
        className: `${pfx}__chat-input-bar`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__chat-input-placeholder`,
            content: LOCALE.WRITE_A_MESSAGE || "Write a message...",
          }),
          Skeletons.Button.Svg({ ico: "send", className: `${pfx}__chat-send` }),
        ],
      }),
    ],
  });
}

// ── Folder root view ──────────────────────────────────────────────────────────
/**
 * @param {Object} ui
 * @param {Function} [rightPanel]
 * @param {Object} [opt] forwarded to filesPanel (e.g. `{menu}`)
 * @param {String} [opt.badge] access badge for the header (default INTERNAL)
 */
export function folder(ui, rightPanel, opt = {}) {
  const pfx = ui.fig.family;
  const aspect = ui.mget("aspect") || "normal";
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    dataset: { aspect },
    kids: [
      folderHeader(ui, pfx, { badge: opt.badge }),
      tabBar(ui, pfx),
      Skeletons.Box.X({
        className: `${pfx}__content`,
        kids: [filesPanel(ui, pfx, opt), rightPanel ? rightPanel(ui, pfx) : null],
      }),
    ],
  });
}
