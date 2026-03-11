module.exports = function (ui) {
  const topbar = require("./topbar")(ui);

  const main = Skeletons.Box.Y({
    className: `${ui.fig.group}__container ${ui.fig.family}__container`,
    sys_pn: _a.content,
    kids: [
      require("./slider")(ui)
    ]
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__main`,
    partHandler: ui,
    styleOpt: {
      width: _K.size.full,
      height: _K.size.full,
      "min-width": 250,
      "min-height": 250
    },
    kids: [topbar, main]
  });
};;
