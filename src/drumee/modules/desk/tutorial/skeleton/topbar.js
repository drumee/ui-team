module.exports = function (ui) {
  const fig = ui.fig.family;
  const p = `${fig}__tb`;

  return Skeletons.Box.X({
    className: `${p}-topbar`,
    kids: [
      // Breadcrumb
      Skeletons.Box.X({
        className: `${p}-breadcrumb`,
        kids: [
          Skeletons.Note({ className: `${p}-breadcrumb-root`, content: LOCALE.HOME }),
        ],
      }),

      // Actions
      Skeletons.Box.X({
        className: `${p}-actions`,
        kids: [
          Skeletons.Button.Svg({
            ico: 'topbar-add',
            className: `${p}-btn`,
            service: 'add-new',
            uiHandler: [ui],
            tooltips: LOCALE.ADD_NEW,
          }),
          Skeletons.Button.Svg({
            ico: 'magnifying-glass',
            className: `${p}-btn`,
            service: 'toggle-search',
            uiHandler: [ui],
            tooltips: LOCALE.SEARCH,
          }),
        ],
      }),
    ],
  });
};
