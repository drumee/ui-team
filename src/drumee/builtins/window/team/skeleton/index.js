const { windowHeader, dialog, tooltips, tabBar, folderFilesView } = require("../../skeleton/toolkit")

// Toolkit's splitBody() no longer includes a meeting-panel child (refactored); keep it here.
function teamSplitBody(ui) {
  return Skeletons.Box.G({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    sys_pn: "folder-view",
    partHandler: ui,
    dataset: { view: "files" },
    kids: [
      ...folderFilesView(ui),
      Skeletons.Box.Y({
        className: `${ui.fig.family}__meeting-panel ${ui.fig.group}__meeting-panel`,
        sys_pn: "meeting-panel",
      }),
    ],
  });
}

function grid(ui) {
  const topbar = require("./topbar")(ui, "desktop_sharebox_edit")
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [dialog(ui), windowHeader(ui, topbar), tabBar(ui), teamSplitBody(ui), tooltips(ui)],
  });
}
module.exports = grid;
