const RADIO = 'admin-main-col';

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
      Skeletons.Note({
        className: `${pfx}__col member`,
        content: LOCALE.MEMBER,
        service: 'show-members',
        radio: RADIO,
        state: 1,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__col role`,
        content: LOCALE.ROLE,
        service: 'show-roles',
        radio: RADIO,
        state: 0,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__col workspaces`,
        content: LOCALE.WORKSPACES,
        service: 'show-workspaces',
        radio: RADIO,
        state: 0,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__col status`,
        content: LOCALE.STATUS,
        service: 'show-status',
        radio: RADIO,
        state: 0,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__col last-active`,
        content: LOCALE.LAST_ACTIVE,
        service: 'show-last-active',
        radio: RADIO,
        state: 0,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__col actions`,
        content: LOCALE.ACTIONS,
        service: 'show-actions',
        radio: RADIO,
        state: 0,
        uiHandler: [ui],
      }),
    ],
  });
};
