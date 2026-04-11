const __topbar_control = function (ui) {
  let fullscreen_ctrl, rotate_ctrl, size_ctrl;
  const cnWidowButton = "window-button";

  let state = 0;
  if (ui.getViewMode() === _a.row) {
    state = 1;
  }

  const filetype = ui.mget(_a.filetype) || ui.mget(_a.type);

  if (filetype === _a.image) {
    fullscreen_ctrl = Skeletons.Button.Svg({
      ico: "player-fullscreen",
      className: "icon fullscreen",
      sys_pn: "ctrl-fullscreen",
      service: _a.fullscreen,
      uiHandler: ui,
    });

    rotate_ctrl = Skeletons.Button.Svg({
      ico: "desktop_rotate",
      className: "icon rotate",
      service: "rotate",
      sys_pn: "ctrl-rotate",
      uiHandler: ui,
    });
  }

  if ([_a.image, _a.video, _a.audio, "tutorial"].includes(filetype)) {
    size_ctrl = "";
  } else {
    size_ctrl = Skeletons.Button.Svg({
      ico: "desktop_reduce",
      className: "icon",
      service: "change-size",
      sys_pn: "ctrl-size",
      uiHandler: ui,
      state: 0,
      icons: ["desktop_fullview", "desktop_reduce"],
    });
  }

  // const minimize = require("./minimize").default(ui);

  const close = Skeletons.Button.Svg({
    ico: "cross",
    className: `${cnWidowButton}__icon-button`,
    service: _e.close,
    uiHandler: ui,
  });

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.group}-topbar__control ${ui.fig.family}-topbar__control`,
    kids: [
      // minimize,
      // size_ctrl,
      close,
    ],
  });

  // if (fullscreen_ctrl) {
  //   a.kids.unshift(fullscreen_ctrl);
  // }

  // if (!Visitor.inDmz && rotate_ctrl) {
  //   a.kids.unshift(rotate_ctrl);
  // }

  return a;
};

module.exports = __topbar_control;
