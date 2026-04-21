module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__topbar-info`,
        kids: [
          Skeletons.Note({ className: `${pfx}__title`,    content: LOCALE.WORKSPACE_PERMISSIONS }),
          Skeletons.Note({ className: `${pfx}__subtitle`, content: LOCALE.WORKSPACE_PERMISSIONS_SUBTITLE }),
        ],
      }),
      Skeletons.Button.Label({
        className: `${pfx}__save-btn`,
        ico: 'save',
        label: LOCALE.SAVE_CHANGES,
        service: 'save-changes',
        uiHandler: [ui],
      }),
    ],
  });
};
