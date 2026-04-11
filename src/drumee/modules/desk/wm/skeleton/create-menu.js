/**
 * @param {any} ui
 * @param {MenuOptions} opt
 */
export function createMenu(ui, opt = {}) {
  const cnRoot = opt.className ?? "window-manager-actions";
  const cnDropdown = `${cnRoot}__dropdown-menu`;

  const items = opt.items ?? [];
  const triggerIco = opt.triggerIco ?? "desktop_confcalls";
  const sys_pn = opt.sys_pn ?? "meeting-menu";

  // const trigger = Skeletons.Button.Svg({
  //   className: `${cnRoot}__dropdown-button`,
  //   ico: triggerIco,
  //   uiHandler: ui,
  //   partHandler: ui,
  // });

  const trigger = Skeletons.Button.Label({
    className: `${cnRoot}__label-button`,
    label: "Add new",
    ico: triggerIco,
    uiHandler: ui,
    partHandler: ui,
  });

  const menuItems = Skeletons.Box.Y({
    className: `${cnDropdown}__items`,
    kids: items.map(({ service, ico, content }) =>
      Skeletons.Box.X({
        className: `${cnDropdown}__item`,
        uiHandler: [ui],
        service,
        kidsOpt: {
          active: 0
        },
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
