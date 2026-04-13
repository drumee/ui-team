const { windowHeader, splitBody, dialog, tooltips } = require("../../skeleton/toolkit")

function grid(ui) {
  const topbar = require("./topbar")(ui)
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [windowHeader(ui, topbar), splitBody(ui), dialog(ui), tooltips(ui)],
  });
};
module.exports = grid;