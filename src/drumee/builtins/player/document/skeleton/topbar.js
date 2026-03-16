module.exports = function (ui, size) {
  const name = Skeletons.Note({
    className: `${ui.fig.group}__title mr-11`,
    sys_pn: "player-title",
    content: ui.model.get(_a.filename),
    service: _e.raise,
    uiHandler: ui,
  });

  return Skeletons.Box.X({
    className: `${ui.fig.group}__header container u-jc-sb`,
    debug: __filename,
    sys_pn: "topbar",
    justify: _a.right,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}__header ${ui.fig.family}__header main u-ai-center`,
        service: _e.raise,
        uiHandler: ui,
        kids: [
          name,
          require("./menu")(ui),
        ],
      }),
      require("../../skeleton/control")(ui),
    ],
  });
};
