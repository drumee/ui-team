const { button } = require("../../../../skeleton/toolkit");

/**
 *
 * @param {*} ui
 * @param {*} opt
 */
function nav_item(ui, ico, label, page) {
  let fig = ui.fig.family;
  let state = 0;
  if (ui._page == page) state = 1;
  return Skeletons.Box.X({
    className: `${fig}__item`,
    uiHandler: [ui],
    radio: `nav-${ui._id}`,
    state,
    page,
    service: `load-page`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${fig}__item-icon`,
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${fig}__item-text`,
        content: label,
      }),
    ],
  });
}

/**
 *
 * @param {*} ui
 */
function nav(ui) {
  let fig = ui.fig.family;
  const items = [
    Skeletons.Note({
      className: `${ui.fig.family}__title`,
      content: LOCALE.SETTINGS,
    }),
    nav_item(ui, "profile", LOCALE.PROFILE, 0),
    nav_item(ui, "billing", LOCALE.BILLING_INFORMATION, 1),
    nav_item(ui, "storage", LOCALE.STORAGE, 2),
    nav_item(ui, "shield", LOCALE.SECURITY, 3),
    nav_item(ui, "calendar", LOCALE.DATE_AND_TIME, 4),
  ];

  if (ui.canAdmin()) {
    items.push(nav_item(ui, "two-users", "My seats", 5));
  }

  const topics = Skeletons.Box.Y({
    className: `${fig}__topics`,
    kids: items,
  });

  return [topics];
}
/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function settings_body(ui) {
  const fig = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${fig}__header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        sys_pn: "tab-name",
        content: ui.tab_name[ui._page],
      }),
      Skeletons.Button.Svg({
        ico: _a.cross,
        className: `${ui.fig.group}__icon close`,
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });

  const content = Skeletons.Box.Y({
    className: `${fig}__content`,
    uiHandler: [ui],
    sys_pn: _a.content,
  });

  const group = ui.fig.group;
  const buttons = Skeletons.Box.X({
    className: `${group}__buttons ${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids: [
      button(ui, {
        label: LOCALE.APPLY_ALL_AND_SAVE,
        type: _a.toggle,
        className: `${group}__button`,
        service: _e.save,
        priority: "primary",
      }),
    ],
  });

  return [
    Skeletons.Box.G({
      className: `${fig}__main`,
      debug: __filename,
      kids: [
        Skeletons.Box.Y({
          className: `${fig}__nav`,
          kids: nav(ui),
        }),
        Skeletons.Box.Y({
          className: `${fig}__container`,
          kids: [header, content, buttons],
        }),
      ],
    }),
    Skeletons.Wrapper.Y({
      className: `${fig}__overlay`,
      sys_pn: "overlay",
    }),
  ];
}

export default settings_body;
