const __skl_window_team = function (ui) {
  const { breadcrumbs } = require('../../skeleton/toolkit')
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    kids: [
      require("./topbar")(ui, "desktop_sharebox_edit"),
      breadcrumbs(ui)
    ],
  });
  return Skeletons.Box.X({
    className: `${ui.fig.family}__main ${ui.fig.group}__main w-800px `,

    kids: [require("window/skeleton/content/main")(ui, menu)],
  });
};
module.exports = __skl_window_team;
