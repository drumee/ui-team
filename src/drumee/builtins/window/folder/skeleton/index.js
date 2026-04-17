const { dialog, tooltips, tabBar } = require("../../skeleton/toolkit");


function grid(ui) {
  const header = Skeletons.Box.X({
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    service: _e.raise,
    kids: [require("./topbar")(ui)],
  });


  const splitBody = Skeletons.Box.X({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    kids: [Skeletons.Box.Y({
      className: `${ui.fig.family}__body ${ui.fig.group}__body`,
      sys_pn: _a.content,
      type: _a.type,
    })],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, tooltips, tabBar(ui), splitBody, dialog],
  });
}
module.exports = grid;
