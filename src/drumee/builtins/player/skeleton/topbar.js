const __player_topbar = function (ui, size) {
  size = size || ui.size;
  const name = Skeletons.Note({
    className: `${ui.fig.group}__title`,
    sys_pn: "player-title",
    content: ui.model.get(_a.filename),
    service: _e.raise,
    uiHandler: ui,
  });

  const downloadIcon = Skeletons.Button.Svg({
    ico: "download",
    sys_pn: "download-button",
    className: "icon link ",
    service: _e.download,
    uiHandler: ui,
  });

  const rotateLeftIcon = Skeletons.Button.Svg({
    ico: "desktop_rotate",
    sys_pn: "rotate-left-button",
    className: "icon rotate-left",
    service: _e.rotate,
    value: -90,
    uiHandler: ui,
  });

  const rotateRightIcon = Skeletons.Button.Svg({
    ico: "desktop_rotate",
    sys_pn: "rotate-right-button",
    className: "icon link ",
    service: _e.rotate,
    value: 90,
    uiHandler: ui,
  });

  let actionIcons = "";
  if (!Visitor.inDmz || ui.canDownload()) {
    actionIcons = Skeletons.Box.X({
      className: `${ui.fig.group}-topbar__icon-wrapper`,
      kids: [
        // downloadIcon
        require("./menu")(ui),
      ],
    });
  }

  if (ui.canUpload() && ui.media && ui.media.imgCapable()) {
    actionIcons.kids.push(rotateLeftIcon, rotateRightIcon);
  }

  const dl = Skeletons.Box.X({
    className: `${ui.fig.group}-topbar__action`,
    sys_pn: "commands",
    kids: [actionIcons],
  });

  const a = Skeletons.Box.X({
    className: `${ui.fig.group}__header container u-jc-sb`,
    debug: __filename,
    sys_pn: "topbar",
    justify: _a.right,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}__header main u-ai-center`,
        service: _e.raise,
        uiHandler: ui,
        kids: [
          name,
          // Skeletons.Box.X({
          //   className: `${ui.fig.group}-topbar__info`,
          //   kids: [
          //     Skeletons.Button.Svg({
          //       ico: "account_info",
          //       className: "icon info",
          //       service: "info",
          //       uiHandler: ui,
          //     }),
          //   ],
          // }),
          // Skeletons.Wrapper.X({
          //   className: `${ui.fig.group}__wrapper-info`,
          //   name: "info",
          // }),
          dl,
          require("./control")(ui),
        ],
      }),
    ],
  });

  return a;
};
module.exports = __player_topbar;
