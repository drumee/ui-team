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
  // Per-instance radio channel so multiple folder windows don't share state.
  const radio = `tab-bar-${ui.cid}`;
  const kids = [
    Skeletons.Button.Label({
      className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
      label: LOCALE.FILES,
      ico: "desktop_docfile",
      service: "tab-files",
      state: 1,
      dataset: { tab: "files" },
      uiHandler: [ui],
    }),
    Skeletons.Button.Label({
      className: `${cnRoot}-item ${ui.fig.family}__tab-bar-item`,
      label: LOCALE.CHAT,
      ico: "tchat",
      service: "tab-chat",
      state: 0,
      dataset: { tab: _a.chat },
      uiHandler: [ui],
    }),
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
      })
    );
  }

  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper ${ui.fig.family}__tab-bar-wrapper`,
    kids,
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
 * @typedef {{ service: string, ico: string, content: string }} MenuItem
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
    kids: menuItems.map(({ service, ico, content, ...extra }) =>
      Skeletons.Box.X({
        className: `${cnDropdown}__item`,
        uiHandler: [ui],
        service,
        ...extra,
        kids: [
          Skeletons.Button.Svg({
            ico,
            className: `${cnDropdown}__icon`,
          }),
          Skeletons.Note({
            content,
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
  const name = ui.mget(_a.filename) || ui.mget(_a.name) || '';
  return name ? `${name} - ${LOCALE.CHAT}` : LOCALE.CHAT;
}

/**
 *
 * @param {Chat Panel} ui
 * @returns
 */
export function chatPanel(ui) {
  const chat = {
    kind: 'widget_chat',
    className: `${ui.fig.group}__chat-widget`,
    type: ui.mget(_a.area),
    area: ui.mget(_a.area),
    view: 'quickChat',
    hub_id: ui.mget(_a.hub_id),
    nid: ui.mget(_a.nid),
    placeholder: LOCALE.TYPE_MESSAGE + '...',
    no_emoji: true,
    send_icon: 'raw-send-chat',
    sys_pn: 'folder-chat',
  };

  if (ui.fig.family === "window-folder") {
    chat.scope = _a.folder;
    chat.hub_id = ui.mget(_a.actual_hub_id) || ui.mget(_a.hub_id);
    chat.nid = ui.mget(_a.actual_home_id) || ui.mget(_a.nid);
  }

  return Skeletons.Box.Y({
    className: `${ui.fig.group}__chat-panel`,
    sys_pn: 'chat-panel',
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
export function filesContainer(ui) {
  const opt = {
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
  };
  if (ui.fig.family === "window-folder") {
    opt.kids = [gridFilesBrowser(ui)];
  }
  return Skeletons.Box.Y(opt);
}

export function folderFilesView(ui) {
  return [filesContainer(ui), chatPanel(ui)];
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
    kids: [
      topbar
    ],
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

        menuItems: [
          {
            service: "add-folder",
            ico: "dock-folder",
            content: LOCALE.FOLDER,
            area: ui.mget(_a.area) || _a.personal,
            filename: LOCALE.NEW_FOLDER,
          },
          {
            service: "add-note",
            ico: "raw-note",
            content: LOCALE.NOTE,
          },
          {
            service: "new-document",
            name: "document.docx",
            ico: "raw-documents_word",
            content: LOCALE.DOCUMENT,
          },
          {
            service: "new-document",
            name: "spreadsheet.xlsx",
            ico: "raw-documents_excel",
            content: LOCALE.SPREADSHEET,
          },
          {
            service: "new-document",
            name: "presentation.pptx",
            ico: "raw-documents_powerpoint",
            content: LOCALE.PRESENTATION,
          },
        ],
      }),
    ]
  })
}

/**
 *
 * @param {*} ui
 */
export function visioMenu(ui, opt = {}) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const triggerIco = opt.triggerIco || "desktop_confcalls";
  if (!Visitor.canUseVisio() || ui.mget(_a.area) == _a.personal) return '';
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
  })
}

/**
 *
 * @param {*} ui
 * @returns
 */
export function getAreaLabel(area) {
  return AREA_LABELS[area] || ''
}
