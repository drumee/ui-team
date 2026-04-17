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
 * Tab bar with Files, Chat and Task buttons.
 * @param {Object} ui - The widget instance
 */
export function tabBar(ui) {
  const cnRoot = "window-body__tab-bar";
  return Skeletons.Box.X({
    className: `${cnRoot}-wrapper`,
    kids: [
      Skeletons.Button.Label({
        className: `${cnRoot}-item`,
        label: LOCALE.FILES,
        ico: "desktop_docfile",
        service: "tab-files",
        uiHandler: ui,
      }),
      Skeletons.Button.Label({
        className: `${cnRoot}-item`,
        label: LOCALE.CHAT,
        ico: "tchat",
        service: "tab-chat",
        uiHandler: ui,
      }),
      Skeletons.Button.Label({
        className: `${cnRoot}-item`,
        label: LOCALE.TASK,
        ico: "list",
        service: "tab-task",
        uiHandler: ui,
      }),
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
    kids: menuItems.map(({ service, ico, content }) =>
      Skeletons.Box.X({
        className: `${cnDropdown}__item`,
        uiHandler: ui,
        service,
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
  const name = ui.mget(_a.filename) || ui.mget(_a.name) || '';
  return name ? `${name} - ${LOCALE.CHAT}` : 'FOLDER-SCOPED CHAT';
}

/**
 * 
 * @param {Chat Panel} ui 
 * @returns 
 */
export function chatPanel(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.group}__chat-panel`,
    sys_pn: 'chat-panel',
    kids: [
      Skeletons.Note({
        className: `${ui.fig.group}__chat-label`,
        content: getChatLabel(ui),
      }),
      {
        kind: 'widget_chat',
        className: `${ui.fig.group}__chat-widget`,
        type: ui.mget(_a.area),
        area: ui.mget(_a.area),
        view: 'quickChat',
        hub_id: ui.mget(_a.hub_id),
        placeholder: LOCALE.TYPE_MESSAGE + '...',
        no_emoji: true,
        send_icon: 'raw-send-chat',
        sys_pn: 'folder-chat',
      },
    ],
  });

}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
export function filesContainer(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: _a.content,
    type: _a.type,
  });
}


/**
 * 
 * @param {*} ui 
 * @returns 
 */
export function splitBody(ui) {
  return Skeletons.Box.G({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    kids: [filesContainer(ui), chatPanel(ui)],
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
      uiHandler: ui,
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
export function newFileMenu(ui) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnWindowBody = `${ui.fig.group}-split-body`;
  return Skeletons.Box.X({
    className: `${cnWindowBody}__buttons-container`,
    kids: [
      dropdownMenuButton(ui, {
        className: cnWindowButton,

        trigger: Skeletons.Button.Label({
          className: `${cnWindowButton}__label-button secondary`,
          label: "Add new",
          ico: "editbox_list-plus",
          uiHandler: ui,
          partHandler: ui,
        }),

        menuItems: [
          { service: "meeting", ico: "dock-note", content: "Note" },
          {
            service: "webinar",
            ico: "raw-documents_word",
            content: "Document",
          },
          {
            service: "channel",
            ico: "raw-documents_excel",
            content: "Spreadsheet",
          },
          {
            service: "channel",
            ico: "raw-documents_powerpoint",
            content: "Presentation",
          },
          {
            service: "channel",
            ico: "dock-folder",
            content: "Folder",
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
export function visioMenu(ui) {
  const cnWindowButton = `${ui.fig.group}-button`;
  if (!Visitor.canUseVisio() || ui.mget(_a.area) == _a.personal) return '';
  return dropdownMenuButton(ui, {
    className: cnWindowButton,

    trigger: Skeletons.Button.Svg({
      className: `${cnWindowButton}__icon-bg-button primary`,
      ico: "desktop_confcalls",
      uiHandler: ui,
      partHandler: ui,
    }),

    menuItems: [
      {
        service: "meeting",
        ico: "logo-google",
        content: "Google Meet",
      },
      { service: "webinar", ico: "desktop_confcalls", content: "Zoom" },
      {
        service: "channel",
        ico: "desktop_confcalls",
        content: "Microsoft Teams",
      },
      {
        service: "channel",
        ico: "raw-logo-drumee-icon",
        content: "Drumee Call",
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