const { dialog, tooltips } = require("../../skeleton/toolkit")

function grid(ui) {
  const family = ui.fig.family;
  const group = ui.fig.group;
  const header = Skeletons.Box.X({
    debug: __filename,
    className: `${family}__header ${group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui,
    },
    service: _e.raise,
    kids: [
      require("./topbar")(ui, "desktop_sharebox_edit"),
    ],
  });
  
  const body = Skeletons.Box.G({
    className: `${family}__body  ${group}__body`,
    kids: [
      Skeletons.Box.Y({
        className: `${family}__files ${group}__files`,
        sys_pn: _a.content,
        type: _a.type,
      }),
      Skeletons.Box.Y({
        className: `${family}__chat ${group}__chat`,
        sys_pn: "chat-wrapper",
      })
    ]
  });
  return Skeletons.Box.Y({
    className: `${family}__main ${group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, tooltips, body, dialog],
  });

};
module.exports = grid;
