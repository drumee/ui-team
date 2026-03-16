
module.exports = function (ui) {
  const topbar = require("./topbar")(ui);

  const main = Skeletons.Box.Y({
    className: `${ui.fig.family}__container u-ai-center`,
    sys_pn: _a.content
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    partHandler: ui,
    kids: [topbar, main]
  });
}
