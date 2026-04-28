const { dialog, tooltips, tabBar, splitBody } = require("../../skeleton/toolkit");


function grid(ui) {
  const header = Skeletons.Box.X({
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    kidsOpt: {
      radio: _a.on,
      uiHandler: [ui],
    },
    service: _e.raise,
    kids: [require("./topbar")(ui)],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, tooltips(ui), tabBar(ui, { meeting: true }), splitBody(ui), dialog(ui)],
  });
}
module.exports = grid;
