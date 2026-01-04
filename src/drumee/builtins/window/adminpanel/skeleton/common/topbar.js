const __skl_admin_panel_common_topBar = function (ui) {

  const mode = ui._view;
  const figFamily = `${ui.fig.family}-topbar`;
  const figGroup = `${ui.fig.group}-topbar`;

  let windowTitle = LOCALE.ADMIN;
  if (ui.organisation && ui.organisation.name) {
    windowTitle = (ui.organisation.name.printf(LOCALE.ADMINISTRATION_OF)) //
  }

  const a = Skeletons.Box.G({
    className: `${figFamily}__container ${figGroup}__container`,
    sys_pn: _a.topBar,
    service: _e.raise,
    dataset: {
      view: mode
    },
    debug: __filename,
    kids: [
      // Skeletons.Box.X({
      //   className: `${ui.fig.family}__page-dropdown`,
      //   sys_pn: 'page_dropdown',
      //   kids: [
      //     require('../common/dropdown').default(ui)
      //   ]
      // }),

      require('./search').default(ui),

      Skeletons.Box.X({
        className: `${figFamily}__content ${figGroup}__content topbar-content`,
        kids: [
          Skeletons.Note({
            className: 'title',
            sys_pn: 'window-name',
            content: windowTitle,
            partHandler: ui,
            uiHandler: ui,
          })
        ]
      }),

      require('window/skeleton/topbar/control')(ui, 'c')

    ]
  });

  return a;
};

export default __skl_admin_panel_common_topBar;
