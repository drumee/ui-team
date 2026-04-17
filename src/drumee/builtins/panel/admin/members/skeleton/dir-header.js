module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__dir-header`,
    kids: [
      Skeletons.Note({ className: `${pfx}__dir-title`, content: LOCALE.ACTIVE_DIRECTORY }),
      Skeletons.Button.Label({
        className: `${pfx}__roles-filter`,
        ico: 'filter',
        label: LOCALE.ALL_ROLES,
        service: 'filter-roles',
        uiHandler: [ui],
      }),
    ],
  });
};
