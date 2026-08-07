
const __skl_player_video = (ui) => {
  // The shared topbar widget. It emits `${group}__header` and the "topbar"
  // sys_pn itself, which are what make the window draggable — see the note
  // in ./topbar.js.
  const topbar = require("./topbar")(ui);

  const main = Skeletons.Box.Y({
    className: `${ui.fig.group}__container u-ai-center`,
    sys_pn: _a.content,
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__main`,
    partHandler: ui,
    kids: [topbar, main],
  });

  return a;
};

module.exports = __skl_player_video;
