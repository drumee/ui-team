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

export function chatPanel(ui){
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
        type: _a.share,
        view: 'quickChat',
        hub_id: ui.mget(_a.hub_id),
        placeholder: 'Type a message...',
        no_emoji: true,
        send_icon: 'raw-send-chat',
        sys_pn: 'folder-chat',
      },
    ],
  });

}
