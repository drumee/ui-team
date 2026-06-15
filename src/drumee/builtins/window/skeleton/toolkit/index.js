const { button } = require("../../../skeleton/toolkit/buttons");

const AREA_LABELS = {
  personal: LOCALE.PRIVATE,
  private: LOCALE.RESTRICTED,
  share: LOCALE.SHARED,
  dmz: LOCALE.RESTRICTED,
  restricted: LOCALE.RESTRICTED,
  public: LOCALE.PUBLIC,
};

export function breadcrumbs(ui, opt) {
  return Skeletons.Wrapper.X({
    debug: __filename,
    className: `${ui.fig.group}-breadcrumbs__container`,
    partHandler: ui,
    state: 0,
  });
}

/**
 * Tab bar with Files, Chat, Task buttons (and optional Meeting).
 *
 * Meeting tab opt-in via `opt.meeting`: shared by folder/team/sharebox windows,
 * but only window_folder handles `tab-meeting` (lifecycle via showFolderTab).
 * @param {Object} ui - The widget instance
 * @param {Object} [opt] - { meeting?: boolean } extra tab toggles
 */
export function tabBar(ui, opt = {}) {
  const cnRoot = "window-body__tab-bar";
  const isFolder = ui.fig.family === "window-folder";
  // The folder window and the DMZ share grid use the same emoji tab icons
  // (📄 / 💬 / 📋) — see the reference design. Other non-folder windows keep
  // their monochrome SVG glyphs.
  const useEmojiTabs = isFolder || ui.fig.family === "dmz-sharebox";
  const folderTab = ({ icon, label, service, state, tab }) =>
    Skeletons.Box.X({
      className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
      service,
      state,
      dataset: { tab },
      uiHandler: [ui],
      kids: [
        Skeletons.Note({
          className: `${ui.fig.family}__tab-bar-icon`,
          content: icon,
        }),
        Skeletons.Note({
          className: `${ui.fig.family}__tab-bar-label`,
          content: label,
        }),
      ],
    });

  let chat_tab = folderTab({
    icon: "💬",
    label: LOCALE.CHAT,
    service: "tab-chat",
    state: 0,
    tab: _a.chat,
  });
  let chat_label = Skeletons.Button.Label({
    className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
    label: LOCALE.CHAT,
    ico: "tchat",
    service: "tab-chat",
    state: 0,
    dataset: { tab: _a.chat },
    uiHandler: [ui],
  });

  // Hide the Chat tab for personal areas, and (DMZ) when the share doesn't grant
  // chat. opt.chat is only passed by the DMZ sharebox; undefined for every other
  // caller, so their behaviour is unchanged.
  if (ui.mget(_a.area) === _a.personal || opt.chat === false) {
    chat_label = "";
    chat_tab = "";
  }

  const kids = useEmojiTabs
    ? [
        folderTab({
          icon: "📄",
          label: LOCALE.FILES,
          service: "tab-files",
          state: 1,
          tab: "files",
        }),
        chat_tab,
        folderTab({
          icon: "📋",
          label: LOCALE.TASK || "Tasks",
          service: "tab-task",
          state: 0,
          tab: _a.task,
        }),
      ]
    : [
        Skeletons.Button.Label({
          className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
          label: LOCALE.FILES,
          ico: "desktop_docfile",
          service: "tab-files",
          state: 1,
          dataset: { tab: "files" },
          uiHandler: [ui],
        }),
        chat_label,
        Skeletons.Button.Label({
          className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
          label: LOCALE.TASK,
          ico: "list",
          service: "tab-task",
          state: 0,
          dataset: { tab: _a.task },
          uiHandler: [ui],
        }),
      ];

  if (opt.meeting) {
    kids.push(
      Skeletons.Button.Label({
        className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
        label: LOCALE.MEETING,
        ico: "folder-meeting",
        service: "tab-meeting",
        state: 0,
        dataset: { tab: "meeting" },
        uiHandler: [ui],
      }),
    );
  }

  // Member-filter trigger for the Task tab — lives on the same line as the
  // tabs (right-aligned). Hidden until the Task tab is active; the folder
  // window toggles `data-visible` in showFolderTab and reflects the active
  // filter via `data-active` (task-filter-state event from the task panel).
  if (isFolder) {
    kids.push(
      Skeletons.Box.X({
        className: `${ui.fig.family}__tab-filter`,
        sys_pn: "task-filter-btn",
        partHandler: ui,
        dataset: { visible: 0, active: 0 },
        bubble: 0,
        service: "toggle-task-filter",
        uiHandler: [ui],
        kids: [
          Skeletons.Image.Svg({
            ico: "desktop_filter",
            className: `${ui.fig.family}__tab-filter-ico`,
          }),
          Skeletons.Note({
            className: `${ui.fig.family}__tab-filter-label`,
            content: LOCALE.FILTER,
          }),
        ],
      }),
    );
  }

  // File view toggle — a segmented pill with two halves: list (row) and grid.
  // Both halves always render; the half matching the wrapper's data-state is
  // the active view (light-blue fill + a checkmark next to its glyph). Grid is
  // the default (data-state "0"/unset); list is active at data-state "1" (row
  // view). Clicks bubble (kidsOpt active:0) to the wrapper's
  // "toggle-files-layout" service, which flips the state via cmd.changeState().
  // Folder-only: the styling lives in the folder skin, keyed on the
  // `window-folder-topbar` class prefix.
  //
  // Shown only on the Files tab (data-visible toggled by showFolderTab); Files
  // is the default tab, so it renders visible. The layout toggle is irrelevant
  // on the Chat/Task/Meeting tabs.
  const cnTopbar = `${ui.fig.family}-topbar`;
  const viewSegment = (mode, ico) =>
    Skeletons.Box.X({
      className: `${cnTopbar}__view-toggle-seg ${cnTopbar}__view-toggle-seg--${mode}`,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({
          ico: "account_check",
          className: `${cnTopbar}__view-toggle-check`,
        }),
        Skeletons.Image.Svg({
          ico,
          className: `${cnTopbar}__view-toggle-glyph`,
        }),
      ],
    });
  // The view toggle is shown for the folder window and the DMZ share grid
  // (both render a media grid that supports a grid ↔ row layout).
  const showViewToggle = isFolder || ui.fig.family === "dmz-sharebox";
  const splitBtn = showViewToggle
    ? Skeletons.Box.X({
        className: `${cnTopbar}__view-toggle`,
        service: "toggle-files-layout",
        sys_pn: "view-ctrl",
        // Explicit data-state (not the `state` prop) guarantees the attribute
        // is present on first render so the correct half is highlighted
        // immediately; grid is the CSS default, so only row/list (state 1)
        // needs it.
        dataset: {
          state: ui.getViewMode && ui.getViewMode() === _a.row ? 1 : 0,
          // Files is the default active tab, so the toggle starts visible.
          visible: 1,
        },
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          viewSegment("list", "view-list"),
          viewSegment("grid", "view-grid"),
        ],
      })
    : "";

  // Tab bar lays out as flex space-between: the tab items group on the left,
  // the view-toggle splitBtn on the right.
  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper ${ui.fig.family}__tab-bar-wrapper`,
    dataset: isFolder ? { area: ui.mget(_a.area) } : {},
    kids: [
      Skeletons.Box.X({
        className: `${cnRoot}-tabs ${ui.fig.family}__tab-bar-tabs`,
        kids,
      }),
      splitBtn,
    ],
  });
}

export function gridFilesBrowser(ui) {
  const pfx = ui.fig.group;
  const type = ui.mget(_a.type);

  let opt = {
    kind: _a.media,
    type,
    logicalParent: ui,
    role: ui.mget(_a.role) || "",
    uiHandler: null,
  };

  if (ui.mget(_a.itemsOpt)) {
    opt = { ...opt, ...ui.mget(_a.itemsOpt) };
  }
  const list = Skeletons.List.Smart({
    className: `${pfx}__icons-list`,
    innerClass: `${pfx}__icons-scroll`,
    sys_pn: _a.list,
    flow: _a.none,
    timer: 2000,
    dataset: {
      role: _a.container,
    },
    spinnerWait: 1500,
    spinner: true,
    itemsOpt: opt,
    skip: {
      filename: /^\./,
    },
    vendorOpt: Preset.List.Orange_e,
    api: function (x) {
      return ui.getCurrentApi();
    },
  });
  if (localStorage.getItem("showHidden")) {
    delete list.skip;
  }

  return list;
}

export function tooltips(ui) {
  return Skeletons.Wrapper.Y({
    className: `${ui.fig.group}__wrapper-tooltips`,
    name: "tooltips",
  });
}

export function dialog(ui) {
  return Skeletons.Wrapper.Y({
    className: `${ui.fig.group}__wrapper-modal`,
    name: "dialog",
    partHandler: ui,
  });
}

/**
 * @typedef {{ service: string, ico: string, content: string, className?: string }} MenuItem
 * @typedef {{
 *   menuItems?: MenuItem[],
 *   triggerIco?: string,
 *   trigger?: any,
 *   sys_pn?: string,
 *   className?: string
 * }} MenuOptions
 */

/**
 * @param {any} ui
 * @param {MenuOptions} opt
 */
export function dropdownMenuButton(ui, opt = {}) {
  const cnRoot = opt.className ?? "window-button";
  const cnDropdown = `${cnRoot}__dropdown-menu`;

  const menuItems = opt.menuItems ?? [];
  const triggerIco = opt.triggerIco ?? "desktop_questionmark";
  const sys_pn = opt.sys_pn ?? "empty_sys_pn";

  const trigger =
    opt.trigger ??
    Skeletons.Button.Svg({
      className: `${cnRoot}__dropdown-button`,
      ico: triggerIco,
      uiHandler: ui,
      partHandler: ui,
    });

  const itemsNode = Skeletons.Box.Y({
    className: `${cnDropdown}__items`,
    kids: menuItems.map(
      ({ service, ico, content, area, className, ...extra }) =>
        Skeletons.Box.X({
          className: className
            ? `${cnDropdown}__item ${className}`
            : `${cnDropdown}__item`,
          uiHandler: [ui],
          service,
          // active:0 on every child so a click on the icon/label passes
          // through to this row (which carries `service`) instead of being
          // swallowed by the interactive Button.Svg / Note.
          kidsOpt: { active: 0 },
          ...extra,
          kids: [
            Skeletons.Button.Svg({
              ico,
              active: 0,
              className: `${cnDropdown}__icon`,
              dataset: area ? { area } : undefined,
            }),
            Skeletons.Note({
              content,
              active: 0,
              className: `${cnDropdown}__name`,
            }),
          ],
        }),
    ),
  });

  return {
    kind: KIND.menu.topic,
    sys_pn,

    className: `${cnDropdown}__wrapper`,

    flow: _a.y,
    opening: _e.click,
    persistence: _a.none,

    trigger,
    items: itemsNode,
  };
}

function getChatLabel(ui) {
  if (ui.fig.family === "window-folder") {
    return LOCALE.FOLDER_SCOPED_CHAT || LOCALE.CHAT;
  }
  // DMZ recipient view: the docked panel is labelled "CONVERSATION" (Figma 3.1),
  // not "<file> - Chat".
  if (ui.fig.family === "dmz-sharebox") {
    return LOCALE.SECURE_SHARE_CONVERSATION || LOCALE.CHAT;
  }
  const name = ui.mget(_a.filename) || ui.mget(_a.name) || "";
  return name ? `${name} - ${LOCALE.CHAT}` : LOCALE.CHAT;
}

/**
 *
 * @param {Chat Panel} ui
 * @returns
 */
export function chatPanel(ui) {
  const chat = {
    kind: "widget_chat",
    className: `${ui.fig.group}__chat-widget`,
    type: ui.mget(_a.area),
    area: ui.mget(_a.area),
    view: "quickChat",
    hub_id: ui.mget(_a.hub_id),
    nid: ui.mget(_a.nid),
    privilege: ui.mget(_a.privilege) || ui.mget(_a.permission),
    placeholder: LOCALE.TYPE_MESSAGE + "...",
    // Show the emoji picker icon (lib-messenger__icon emoji) in the panel.
    no_emoji: false,
    send_icon: "raw-send-chat",
    attach_icon: "chat-link-simple",
    sys_pn: "folder-chat",
  };

  if (ui.fig.family === "window-folder") {
    chat.scope = _a.folder;
    chat.type = _a.share;
    chat.area = _a.share;
    chat.hub_id = ui.mget(_a.actual_hub_id) || ui.mget(_a.hub_id);
    chat.nid = ui.mget(_a.nid);
    chat.home_id = ui.mget(_a.home_id);
    chat.ownpath = ui.mget(_a.ownpath);
  }

  // DMZ shared-link recipient (Figma "user chat → sign in required", screen 57):
  // anyone viewing a share via the DMZ sharebox may READ the conversation but
  // must sign up / log in to POST — a send attempt opens the sign-up overlay
  // instead of posting (intercepted in the chat widget's sendMessage). Keyed off
  // the DMZ sharebox identity — NOT `is_guest`, which the server does not
  // reliably set for public shares (it returns is_guest=false, so that gate
  // silently failed). The authenticated window-folder chat has a different
  // fig.family, so it is unaffected and members can still post normally.
  if (ui.fig.family === "dmz-sharebox") {
    chat.guest_chat = 1;
    chat.desk = ui;
  }

  return Skeletons.Box.Y({
    className: `${ui.fig.group}__chat-panel`,
    sys_pn: "chat-panel",
    dataset:
      ui.fig.family === "window-folder" ? { area: ui.mget(_a.area) } : {},
    kids: [
      Skeletons.Note({
        className: `${ui.fig.group}__chat-label`,
        content: getChatLabel(ui),
      }),
      chat,
    ],
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function fileTypeFilterBar(ui) {
  const tabs = [
    { label: "All", value: "all" },
    { label: "Docs", value: "docs" },
    { label: "PDF", value: "pdf" },
    { label: "Images", value: "image" },
    { label: "Other", value: "other" },
  ];
  let dataset = ui.mget(_a.area);
  return Skeletons.Box.X({
    className: `${ui.fig.family}__filter-bar`,
    sys_pn: "file-type-filter",
    partHandler: ui,
    dataset: { area: ui.mget(_a.area) },
    kids: tabs.map((tab, index) =>
      button(ui, {
        label: tab.label,
        className: `${ui.fig.family}__filter-tab`,
        service: "filter-by-type",
        state: index === 0 ? 1 : 0,
        radiotoggle: `media-filter-${ui._id}`,
        value: tab.value,
        dataset: { area: ui.mget(_a.area) },
      }),
    ),
  });
}

export function filesContainer(ui) {
  const opt = {
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
  };
  if (ui.fig.family === "window-folder") {
    opt.kids = [fileTypeFilterBar(ui), gridFilesBrowser(ui)];
  }
  return Skeletons.Box.Y(opt);
}

export function folderFilesRowContainer(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
    kids: [require("../content/row")(ui)],
  });
}

export function folderFilesView(ui) {
  const files =
    ui.getViewMode && ui.getViewMode() === _a.row
      ? folderFilesRowContainer(ui)
      : filesContainer(ui);
  if (ui.mget(_a.area) === _a.personal) return [files];
  return [files, chatPanel(ui)];
}

export function folderChatView(ui) {
  const panel = chatPanel(ui);
  panel.className = `${panel.className} ${ui.fig.family}__chat-panel-full`;
  return panel;
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function splitBody(ui) {
  return Skeletons.Box.G({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    sys_pn: "folder-view",
    partHandler: ui,
    dataset: { view: "files" },
    kids: folderFilesView(ui),
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function windowHeader(ui, topbar) {
  return Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: [ui],
    },
    service: _e.raise,
    kids: [topbar],
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function newFileMenu(ui, opt = {}) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnWindowBody = `${ui.fig.group}-split-body`;
  const triggerIco = opt.triggerIco || "editbox_list-plus";
  const cnItem = `${cnWindowButton}__menu-item`;
  const allItems = [
    {
      service: "add-folder",
      ico: "folder-header",
      content: LOCALE.FOLDER,
      area: ui.mget(_a.area) || _a.personal,
      filename: LOCALE.NEW_FOLDER,
      className: `${cnItem} ${cnItem}--add-folder`,
    },
    {
      service: "add-note",
      ico: "raw-note",
      content: LOCALE.NOTE,
      className: `${cnItem} ${cnItem}--add-note white`,
    },
    {
      service: "new-document",
      name: "document.docx",
      ico: "raw-documents_word",
      content: LOCALE.DOCUMENT,
      className: `${cnItem} ${cnItem}--document white`,
    },
    {
      service: "new-document",
      name: "spreadsheet.xlsx",
      ico: "raw-documents_excel",
      content: LOCALE.SPREADSHEET,
      className: `${cnItem} ${cnItem}--spreadsheet white`,
    },
    {
      service: "new-document",
      name: "presentation.pptx",
      ico: "raw-documents_powerpoint",
      content: LOCALE.PRESENTATION,
      className: `${cnItem} ${cnItem}--presentation white`,
    },
  ];
  // opt.items — optional whitelist of service names. When set, only those
  // menu items render (e.g. DMZ share passes ["add-folder"]).
  const menuItems = opt.items
    ? allItems.filter((it) => opt.items.includes(it.service))
    : allItems;
  return Skeletons.Box.X({
    className: `${cnWindowBody}__buttons-container`,
    kids: [
      dropdownMenuButton(ui, {
        className: cnWindowButton,

        trigger: Skeletons.Button.Label({
          className: `${cnWindowButton}__label-button secondary`,
          label: LOCALE.ADD_NEW || "Add new",
          ico: triggerIco,
          uiHandler: ui,
          partHandler: ui,
        }),

        menuItems,
      }),
    ],
  });
}

/**
 *
 * @param {*} ui
 */
export function visioMenu(ui, opt = {}) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const triggerIco = opt.triggerIco || "desktop_confcalls";
  if (!Visitor.canUseVisio() || ui.mget(_a.area) == _a.personal) return "";
  return dropdownMenuButton(ui, {
    className: cnWindowButton,

    trigger: Skeletons.Button.Svg({
      className: `${cnWindowButton}__icon-bg-button primary`,
      ico: triggerIco,
      uiHandler: ui,
      partHandler: ui,
    }),

    menuItems: [
      {
        service: "meeting",
        ico: "logo-google",
        content: LOCALE.GOOGLE_MEET,
      },
      { service: "webinar", ico: "desktop_confcalls", content: LOCALE.ZOOM },
      {
        service: "channel",
        ico: "desktop_confcalls",
        content: LOCALE.MICROSOFT_TEAMS,
      },
      {
        service: "channel",
        ico: "raw-logo-drumee-icon",
        content: LOCALE.DRUMEE_CALL,
      },
    ],
  });
}

/**
 * macOS-style zoom menu — icon trigger with a CSS-hover dropdown offering
 * Enter/Exit Full Screen, Zoom, Tile Left/Right, Reframe. Clicking the
 * trigger toggles Zoom directly.
 *
 * @param {*} ui
 */
export function zoomMenu(ui) {
  const cnRoot = `${ui.fig.family}-topbar__zoom`;

  const items = [
    {
      service: "window-zoom",
      ico: "desktop_fullview",
      // Dedicated key (not LOCALE.ZOOM, which labels the Zoom video app) so
      // this "maximize window" action can be translated independently.
      content: LOCALE.WINDOW_ZOOM,
      modifier: "zoom",
    },
    {
      service: "window-tile-left",
      ico: "square-split-horizontal",
      content: LOCALE.TILE_LEFT,
      modifier: "tile-left",
    },
    {
      service: "window-tile-right",
      ico: "square-split-horizontal",
      content: LOCALE.TILE_RIGHT,
      modifier: "tile-right",
    },
    {
      service: "window-reframe",
      ico: "desktop_reduce",
      content: LOCALE.REFRAME,
      modifier: "reframe",
    },
  ];

  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: "desktop_fullview",
        className: `${cnRoot}-trigger`,
        sys_pn: "ctrl-fullscreen",
        service: "window-zoom",
        uiHandler: [ui],
        partHandler: ui,
      }),
      Skeletons.Box.Y({
        className: `${cnRoot}-menu`,
        kids: items.map(({ service, ico, content, modifier }) =>
          Skeletons.Box.X({
            className: `${cnRoot}-item ${cnRoot}-item--${modifier}`,
            uiHandler: [ui],
            service,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Button.Svg({
                ico,
                active: 0,
                className: `${cnRoot}-item-icon`,
              }),
              Skeletons.Note({
                content,
                active: 0,
                className: `${cnRoot}-item-label`,
              }),
            ],
          }),
        ),
      }),
    ],
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function getAreaLabel(area) {
  return AREA_LABELS[area] || "";
}
