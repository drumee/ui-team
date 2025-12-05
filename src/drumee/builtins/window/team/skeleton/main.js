const __skl_window_team = function (_ui_) {
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.family}__header ${_ui_.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: _ui_,
    },
    kids: [require("./topbar")(_ui_, "desktop_sharebox_edit")],
  });
  // const a = require('window/skeleton/content/main')(_ui_, menu);
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main w-800px `,

    kids: [require("window/skeleton/content/main")(_ui_, menu)],
  });
  a.debug = __filename;
  return a;
};
module.exports = __skl_window_team;
