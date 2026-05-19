module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__purge-container`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__purge-dialog`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__purge-dialog-top`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__purge-avatar`,
                kids: [
                  Skeletons.Image.Svg({ ico: 'logo', className: `${pfx}__purge-avatar-icon` }),
                ],
              }),
              Skeletons.Button.Svg({
                ico: 'cross',
                className: `${pfx}__purge-close`,
                service: 'cancel-empty-bin',
                uiHandler: [ui],
              }),
            ],
          }),
          Skeletons.Note({ className: `${pfx}__purge-title`, content: LOCALE.TRASH }),
          Skeletons.Note({
            className: `${pfx}__purge-message`,
            content: LOCALE.Q_DELETE_ALL_FILES,
          }),
          Skeletons.Box.Y({ className: `${pfx}__purge-spacer` }),
          Skeletons.Box.X({
            className: `${pfx}__purge-actions`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__purge-btn ${pfx}__purge-btn--cancel`,
                content: LOCALE.CANCEL,
                service: 'cancel-empty-bin',
                uiHandler: [ui],
              }),
              Skeletons.Note({
                className: `${pfx}__purge-btn ${pfx}__purge-btn--danger`,
                content: LOCALE.DELETE,
                service: 'confirm-empty-bin',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
