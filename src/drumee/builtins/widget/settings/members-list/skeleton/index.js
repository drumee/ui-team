const topbar = (ui) => {
  const figFamily = `${ui.fig.family}-topbar`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${figFamily}__container`,
    sys_pn: _a.topBar,
    kids: [
      Skeletons.Button.Svg({
        ico: "arrow-left",
        className: `${figFamily}__back`,
        service: _a.back,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${figFamily}__title`,
        sys_pn: "window-name",
        content: LOCALE.MEMBER_ACCESS,
        uiHandler: [ui],
      }),
      Skeletons.Button.Svg({
        ico: _a.cross,
        className: `${figFamily}__close`,
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });
};

function content(ui) {
  const list = Skeletons.List.Smart({
    flow: _a.vertical,
    sys_pn: "roll-content",
    className: `${ui.fig.family}__list`,
    debug: __filename,
    itemsOpt: {
      kind: "settings_member",
      uiHandler: [ui],
      visitor: this.mget('visitor')
    },
    spinner: true,
    placeholder: Skeletons.Note(LOCALE.NO_CONTACT, "placeholder--no-contact"),
    api: ui.mget(_a.api),
    vendorOpt: Preset.List.Orange_d,
    inspect: 1,
  });

  const kids = ui.mget(_a.members) || [];
  if (!ui.mget(_a.api) && kids.length) {
    list.kids = kids;
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__content`,
    kids: [list],
  });
}

export default function (ui) {
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__wrapper`,
    kids: [topbar(ui), content(ui)],
  });
}