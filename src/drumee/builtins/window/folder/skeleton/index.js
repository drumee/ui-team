const __skl_folder_main = function (ui) {
  const { breadcrumbs  } = require('../../skeleton/toolkit')
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    kids: [
      require("./topbar")(ui),
      breadcrumbs(ui)
    ],
  });

  return require('window/skeleton/content/main')(ui, menu);
};
module.exports = __skl_folder_main;
