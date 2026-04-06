const __window_website_main = function (ui, size, icon) {
  const menu = Skeletons.Box.X({
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    kids: [
      require("./topbar")(ui),
    ],
  });
  // const a = require('window/skeleton/content/main')(ui, menu);
  const a = Skeletons.Box.X({
    className: `${ui.fig.family}__main ${ui.fig.group}__main w-800px `,

    kids: [require("window/skeleton/content/main")(ui, menu)],
  });
  a.debug = __filename;
  return a;
};
module.exports = __window_website_main;
