
const __skl_player_video = (ui) => {
  const topbar = require("../../skeleton/control")(ui);

  const main = Skeletons.Box.Y({
    className: `${ui.fig.group}__container u-ai-center`,
    sys_pn: _a.content,
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__main`,
    handler: {
      part: ui,
    },
    kids: [topbar, main],
  });

  return a;
};

module.exports = __skl_player_video;
