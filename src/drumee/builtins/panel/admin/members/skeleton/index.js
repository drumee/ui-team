module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./topbar')(ui),
      require('./stats')(ui),
      Skeletons.Box.Y({
        className: `${pfx}__directory`,
        kids: [
          require('./dir-header')(ui),
          Skeletons.List.Smart({
            className: `${pfx}__list`,
            sys_pn: 'members-list',
            flow: _a.none,
            spinner: true,
            spinnerWait: 300,
            api: ui.getMembers.bind(ui),
            itemsOpt: {
              kind: 'admin_members_item',
              uiHandler: [ui],
            },
            vendorOpt: Preset.List.Orange_e,
            evArgs: Skeletons.Note(LOCALE.NO_MEMBERS_YET, `${pfx}__empty`),
          }),
          require('./footer')(ui),
        ],
      }),
    ],
  });
};
