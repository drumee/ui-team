const cnWidowTopbarActions = "window-topbar-actions";

function item(ui, service, ico, content) {
  return Skeletons.Box.X({
    className: `dropdown-menu__item`,
    uiHandler: ui,
    service,
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `dropdown-menu__icon`,
      }),
      Skeletons.Note({
        content,
        className: `dropdown-menu__name`,
      }),
    ],
  });
}

module.exports = function (ui) {
  const trigger = Skeletons.Button.Svg({
    className: `${cnWidowTopbarActions}__dropdown-button`,
    ico: "desktop_confcalls",
    uiHandler: ui,
    partHandler: ui,
  });

  const menuItems = Skeletons.Box.Y({
    className: `dropdown-menu__items`,
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

    className: ` dropdown-menu__wrapper`,

    flow: _a.y,
    opening: _e.click,
    persistence: _a.none,

    trigger,
    items: menuItems,
  };
};
