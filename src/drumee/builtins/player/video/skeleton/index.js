
const __skl_player_video = (ui) => {
  // The close control that used to be the whole "topbar". It now lives inside
  // a real header so the window can be dragged by it.
  const control = require("../../skeleton/control")(ui);

  // `${group}__header` is the jQuery-draggable handle wired up in
  // player/interact.js (`handle: '.${this.fig.group}__header'`), and the
  // "topbar" sys_pn is what triggers `setupInteract()` in interact's
  // onPartReady. Both are required for the window to be draggable.
  const topbar = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.group}__header container u-jc-sb`,
    sys_pn: "topbar",
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}__header ${ui.fig.family}__header main u-ai-center`,
        service: _e.raise,
        uiHandler: ui,
        kids: [
          Skeletons.Note({
            className: `${ui.fig.group}__title`,
            sys_pn: "player-title",
            content: ui.mget(_a.filename),
            service: _e.raise,
            uiHandler: ui,
          }),
          control,
        ],
      }),
    ],
  });

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
