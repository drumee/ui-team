const withFileSwitcher = require("builtins/player/widget/file-switcher/frame");

module.exports = function (ui) {
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    kids: [require("./topbar")(ui)],
  });
  return withFileSwitcher(ui, require("window/skeleton/content/main")(ui, menu));
}
