function content(ui, tit) {
  const list = Skeletons.List.Smart({
    flow: _a.vertical,
    sys_pn: "roll-content",
    className: `${ui.fig.family}__list`,
    debug: __filename,
    itemsOpt: {
      kind: "settings_member"
    },
    spinner: true,
    placeholder: Skeletons.Note(LOCALE.NO_CONTACT, "placeholder--no-contact"),
    api: ui.mget(_a.api),
    vendorOpt: Preset.List.Orange_d,
    inspect: 1
  });

  let kids = ui.mget(_a.members) || [];
  if (!ui.mget(_a.api) && kids.length) {
    list.kids = kids;
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group} ${ui.fig.family}__container`,
    kids: [list]
  });
};

export default function (ui) {
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      require('../../skeleton/header').default(ui, LOCALE.MEMBER_ACCESS),
      content(ui)
    ]
  });

}