function item(ui, service, ico, content) {
  const btn = `${ui.fig.group}`;
  const fig = `${btn}__dropdown-menu`;
  return Skeletons.Box.X({
    className: `${fig}__item`,
    uiHandler: ui,
    service,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${fig}__icon`,
      }),
      Skeletons.Note({
        className: `${fig}__name`,
        content,
      }),
    ],
  });
}

module.exports = function (ui) {
  const btn = `${ui.fig.group}`;
  const fig = `${btn}__dropdown-menu`;
  const menuTrigger = Skeletons.Button.Label({
    className: `${btn}__label-button`,
    label: LOCALE.NOTE,
    ico: "carret-down",
    uiHandler: ui,
    partHandler: ui,
  });

  let save = "";
  const print = item(ui, "print", "print", LOCALE.PRINT);
  if (ui.canUpload()) {
    save = item(ui, "save", "floppy", LOCALE.SAVE_CHANGES);
  }
  const separator = Skeletons.Box.X({
    className: `${fig}__separator`,
  });

  const menuItems = Skeletons.Box.X({
    className: `${fig}__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__items`,
        kids: [save, separator, print],
      }),
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${btn}__buttons-wrapper`,
    kids: [
      {
        kind: KIND.menu.topic,
        sys_pn: "text-menu",
        className: `${fig}__wrapper`,
        flow: _a.y,
        opening: _e.click,
        persistence: _a.none,
        trigger: menuTrigger,
        items: menuItems,
      },
    ],
  });
};
