
const { windowHeader, splitBody, dialog, tooltips, tabBar } = require("../../skeleton/toolkit")
function grid(ui) {
  const topbar = require("./topbar")(ui, "desktop_sharebox_edit")
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [windowHeader(ui, topbar), tabBar(ui), splitBody(ui), dialog(ui), tooltips(ui)],
  });
};
module.exports = grid;
