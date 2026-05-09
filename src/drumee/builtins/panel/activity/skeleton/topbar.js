module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.NOTIFICATIONS }),
      Skeletons.Box.X({
        className: `${pfx}__topbar-actions`,
        kids: [
          Skeletons.Button.Label({
            className: `${pfx}__mark-read-btn`,
            ico: 'desktop_check',
            label: LOCALE.MARK_ALL_READ,
            service: 'clear-all',
            uiHandler: [ui],
          }),
          Skeletons.Box.X({
            className: `${pfx}__unread-toggle`,
            sys_pn: 'unread-toggle',
            service: 'toggle-unreads',
            state: ui._unreadsOnly ? 1 : 0,
            uiHandler: ui,
            partHandler: ui,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Note({ className: `${pfx}__unread-label`, content: LOCALE.UNREADS }),
              Skeletons.Box.X({
                className: `${pfx}__toggle-track`,
                kids: [
                  Skeletons.Box.X({ className: `${pfx}__toggle-thumb` }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
