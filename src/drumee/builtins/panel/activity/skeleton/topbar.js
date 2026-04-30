module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.NOTIFICATIONS }),
      Skeletons.Box.X({
        className: `${pfx}__unread-toggle`,
        kids: [
          Skeletons.Note({ className: `${pfx}__unread-label`, content: LOCALE.UNREADS }),
          Skeletons.Button.Svg({
            className: `${pfx}__toggle-btn`,
            ico: 'toggle',
            sys_pn: 'unread-toggle',
            service: 'toggle-unreads',
            state: ui._unreadsOnly ? 1 : 0,
            uiHandler: ui,
          }),
        ],
      }),
    ],
  });
};
