const cnWindowTopbarActions = "window-topbar-actions";
const cnWindowTopbarDropdownMenu = `${cnWindowTopbarActions}__dropdown-menu`;

function item(ui, service, ico, content) {
  return Skeletons.Box.X({
    className: `${cnWindowTopbarDropdownMenu}__item`,
    uiHandler: ui,
    service,
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${cnWindowTopbarDropdownMenu}__icon`,
      }),
      Skeletons.Note({
        content,
        className: `${cnWindowTopbarDropdownMenu}__name`,
      }),
    ],
  });
}

module.exports = function (ui) {
  const trigger = Skeletons.Button.Svg({
    className: `${cnWindowTopbarActions}__dropdown-button`,
    ico: "desktop_confcalls",
    uiHandler: ui,
    partHandler: ui,
  });

  const menuItems = Skeletons.Box.Y({
    className: `${cnWindowTopbarDropdownMenu}__items`,
    kids: [
      item(ui, "meeting", "desktop_confcalls", "Google Meet"),
      item(ui, "webinar", "desktop_confcalls", "Zoom"),
      item(ui, "channel", "desktop_confcalls", "Microsoft Teams"),
      item(ui, "channel", "desktop_confcalls", "Drumee Call"),
    ],
  });

  return {
    kind: KIND.menu.topic,
    sys_pn: "meeting-menu",

    className: `${cnWindowTopbarDropdownMenu}__wrapper`,

    flow: _a.y,
    opening: _e.click,
    persistence: _a.none,

    trigger,
    items: menuItems,
  };
};
