module.exports = function (ui) {
  const pfx = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${pfx}__header ${ui.fig.group}__header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header-left`,
        kids: [
          Skeletons.Image.Svg({ ico: 'trash', className: `${pfx}__header-icon` }),
          Skeletons.Note({ className: `${pfx}__header-title`, content: LOCALE.TRASH }),
        ],
      }),
      Skeletons.Image.Svg({
        ico: 'cross',
        className: `${pfx}__header-icon`,
        service: "toggle-trash",
        uiHandler: [Desk]
      }),
    ],
  });

  const statusBar = Skeletons.Box.X({
    className: `${pfx}__status-bar`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__selection-count`,
        sys_pn: 'items-count',
        content: '',
      }),
      Skeletons.Note({
        className: `${pfx}__empty-btn`,
        content: LOCALE.PURGE,
        service: 'empty-bin',
        uiHandler: ui,
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__topbar`,
    debug: __filename,
    kids: [header, statusBar],
  });
};
