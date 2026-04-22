module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__table-header`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__select-all`,
        icons: ['editbox_shapes-roundsquare', 'available'],
        sys_pn: 'select-all',
        state: 0,
        service: 'select-all',
        uiHandler: [ui],
      }),
      Skeletons.Note({ className: `${pfx}__col member`,      content: LOCALE.MEMBER }),
      Skeletons.Note({ className: `${pfx}__col role`,        content: LOCALE.ROLE }),
      Skeletons.Note({ className: `${pfx}__col workspaces`,  content: LOCALE.WORKSPACES }),
      Skeletons.Note({ className: `${pfx}__col status`,      content: LOCALE.STATUS }),
      Skeletons.Note({ className: `${pfx}__col last-active`, content: LOCALE.LAST_ACTIVE }),
      Skeletons.Note({ className: `${pfx}__col actions`,     content: LOCALE.ACTIONS }),
    ],
  });
};
