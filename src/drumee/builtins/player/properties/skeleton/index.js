
function player_props(ui) {
  const topbar = require("./topbar")(ui);
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    sys_pn: "window-header",
    kidsOpt: {
      radio: _a.on,
      uiHandler: ui
    },
    kids: [topbar]
  })
  const a = require('window/skeleton/content/main')(ui, menu)
  a.debug = __filename
  return a
}
module.exports = player_props;