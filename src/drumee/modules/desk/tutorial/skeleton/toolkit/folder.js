const { tooltip } = require("./tooltip");

// ── Static data ───────────────────────────────────────────────────────────────
const SUB_FOLDERS = [
  "Sub-folder v1",
  "Sub-folder v2",
  "Sub-folder v3",
  "Sub-folder v4",
];

const FILES = [
  { name: "spec_v2.docx", date: "Oct 12, 2023", ico: "addmenu-document" },
  { name: "spec_v2.pdf", date: "Oct 12, 2023", ico: "file-pdf" },
  { name: "note", date: "Oct 12, 2023", ico: "addmenu-note" },
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
  { name: "Private Folder", area: _a.personal, variant: "purple", state: 1 },
  { name: "Restricted Folder", area: _a.private, variant: "salmon", state: 0 },
  { name: "Shared Folder", area: _a.share, variant: "pink", state: 0 },
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
export function folderHeader(ui, pfx) {
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
            content: LOCALE.RESTRICTED || "RESTRICTED",
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
export function tabBar(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__tabs`,
    kids: [
      Skeletons.Button.Label({
        ico: "apps-folder-card",
        className: `${pfx}__tab active`,
        label: LOCALE.FILES || "Files",
      }),
      Skeletons.Button.Label({
        ico: "apps-chat",
        className: `${pfx}__tab`,
        label: LOCALE.CHAT || "Chat",
      }),
      Skeletons.Button.Label({
        ico: "checkbox",
        className: `${pfx}__tab`,
        label: LOCALE.TASKS || "Tasks",
      }),
    ],
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
export function folderItem(ui, name, opt = {}) {
  let pfx = ui.fig.group;
  return Skeletons.Box.Y({
    className: `${pfx}__grid-folder`,
    ...opt,
    kids: [
      workspaceIcon(ui, opt.area),
      Skeletons.Note({ className: `${pfx}__grid-folder-name`, content: name }),
    ],
  });
}

export function fileItem(ui, pfx, { name, date, ico }) {
  return Skeletons.Box.Y({
    className: `${pfx}__grid-file`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__grid-file-icon-wrap`,
        kids: [
          Skeletons.Image.Svg({ ico, className: `${pfx}__grid-file-icon` }),
        ],
      }),
      Skeletons.Note({ className: `${pfx}__grid-file-name`, content: name }),
      Skeletons.Note({ className: `${pfx}__grid-file-date`, content: date }),
    ],
  });
}

export function filesPanel(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__files`,
    kids: [
      typeFilter(ui, pfx),
      Skeletons.Box.G({
        className: `${pfx}__grid`,
        kids: [
          ...SUB_FOLDERS.map((name) => folderItem(ui, name)),
          ...FILES.map((f) => fileItem(ui, pfx, f)),
        ],
      }),
    ],
  });
}

// ── Chat panel ────────────────────────────────────────────────────────────────
export function chatMessage(pfx, msg) {
  if (!msg.sender) {
    return Skeletons.Note({
      className: `${pfx}__chat-link`,
      content: msg.text,
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
  let tt = null;
  if (ui.mget(_a.service)) {
    const opt = {
      badge_text: "STEP 2/5",
      title: "Chat lives in folder",
      desc: `Chat lives here. Every folder has its own persistent context. Discuss files and tag teammates without leaving your workspace.`,
      direction: "east",
    };
    tt = tooltip(ui, opt);
    // tooltip = Skeletons.Box.Y({
    //   className: `${pfx}__tooltip-anchor`,
    //   partHandler: ui,
    //   kids: [tooltipBadge(ui, opt)],
    // });
  }

  return Skeletons.Box.Y({
    className: `${pfx}__chat-panel`,
    sys_pn: "chat-panel",
    kids: [
      Skeletons.Note({
        className: `${pfx}__chat-header`,
        content: "TEAM CHAT",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__chat-messages`,
        kids: MESSAGES.map((msg) => chatMessage(pfx, msg)),
      }),
      tt,
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
export function folder(ui, rightPanel) {
  const pfx = ui.fig.family;
  const aspect = ui.mget("aspect") || "normal";
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    dataset: { aspect },
    kids: [
      folderHeader(ui, pfx),
      tabBar(ui, pfx),
      Skeletons.Box.X({
        className: `${pfx}__content`,
        kids: [filesPanel(ui, pfx), rightPanel ? rightPanel(ui, pfx) : null],
      }),
    ],
  });
}
