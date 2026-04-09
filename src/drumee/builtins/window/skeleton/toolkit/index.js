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
  const pfx = ui.fig.group;
  return Skeletons.Box.X({
    className: `${pfx}__tab-bar`,
    kids: [
      Skeletons.Button.Svg({
        ico: "folder",
        tooltips: LOCALE.FILES,
        service: "tab-files",
        uiHandler: ui,
      }),
      Skeletons.Button.Svg({
        ico: "chat",
        tooltips: LOCALE.CHAT,
        service: "tab-chat",
        uiHandler: ui,
      }),
      Skeletons.Button.Svg({
        ico: "task",
        tooltips: LOCALE.TASK,
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
  console.log("AAAA:42", ui);
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
      console.log("AAAA:60", x, ui);
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
    className: `${ui.fig.group}__wrapper-container`,
    name: "tooltips",
  });
}

export function dialog(ui) {
  return Skeletons.Wrapper.Y({
    className: `${ui.fig.group}__wrapper-container`,
    name: "tooltips",
  });
}

/**
 * @typedef {{ service: string, ico: string, content: string }} MenuItem
 * @typedef {{
 *   items?: MenuItem[],
 *   triggerIco?: string,
 *   sys_pn?: string,
 *   className?: string
 * }} MenuOptions
 */

/**
 * @param {any} ui
 * @param {MenuOptions} opt
 */
export function createMenu(ui, opt = {}) {
  const cnWindowCreateMenu = opt.className ?? "window-create-menu";
  const cnDropdown = `${cnWindowCreateMenu}__dropdown-menu`;

  const items = opt.items ?? [];
  const triggerIco = opt.triggerIco ?? "editbox_list-plus";
  const sys_pn = opt.sys_pn ?? "meeting-menu";

  const trigger = Skeletons.Button.Svg({
    className: `${cnWindowCreateMenu}__dropdown-button`,
    ico: triggerIco,
    uiHandler: ui,
    partHandler: ui,
  });

  const menuItems = Skeletons.Box.Y({
    className: `${cnDropdown}__items`,
    kids: items.map(({ service, ico, content }) =>
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
    items: menuItems,
  };
}

/**
 * @typedef {{ service: string, ico: string, content: string }} MenuItem
 * @typedef {{
 *   items?: MenuItem[],
 *   triggerIco?: string,
 *   sys_pn?: string,
 *   className?: string
 * }} MenuOptions
 */

/**
 * @param {any} ui
 * @param {MenuOptions} opt
 */
export function meetingMenu(ui, opt = {}) {
  const cnRoot = opt.className ?? "window-topbar-actions";
  const cnDropdown = `${cnRoot}__dropdown-menu`;

  const items = opt.items ?? [];
  const triggerIco = opt.triggerIco ?? "desktop_confcalls";
  const sys_pn = opt.sys_pn ?? "meeting-menu";

  const trigger = Skeletons.Button.Svg({
    className: `${cnRoot}__dropdown-button`,
    ico: triggerIco,
    uiHandler: ui,
    partHandler: ui,
  });

  const menuItems = Skeletons.Box.Y({
    className: `${cnDropdown}__items`,
    kids: items.map(({ service, ico, content }) =>
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
    items: menuItems,
  };
}
