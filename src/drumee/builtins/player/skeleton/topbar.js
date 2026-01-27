const __player_topbar = function (_ui_, size) {
  size = size || _ui_.size;
  const name = Skeletons.Note({
    className: `${_ui_.fig.group}__title mr-11`,
    sys_pn: "player-title",
    content: _ui_.model.get(_a.filename),
    service: _e.raise,
    uiHandler: _ui_,
  });

  const downloadIcon = Skeletons.Button.Svg({
    ico: "download",
    sys_pn: "download-button",
    className: "icon link ",
    service: _e.download,
    uiHandler: _ui_,
  });

  const rotateLeftIcon = Skeletons.Button.Svg({
    ico: "desktop_rotate",
    sys_pn: "rotate-left-button",
    className: "icon rotate-left",
    service: _e.rotate,
    value: -90,
    uiHandler: _ui_,
  });

  const rotateRightIcon = Skeletons.Button.Svg({
    ico: "desktop_rotate",
    sys_pn: "rotate-right-button",
    className: "icon link ",
    service: _e.rotate,
    value: 90,
    uiHandler: _ui_,
  });

  let actionIcons = "";
  if (_ui_.canDownload()) {
    actionIcons = Skeletons.Box.X({
      className: `${_ui_.fig.group}-topbar__icon-wrapper`,
      kids: [downloadIcon, rotateLeftIcon, rotateRightIcon],
    });
  }

  const dl = Skeletons.Box.X({
    className: `${_ui_.fig.group}-topbar__action`,
    sys_pn: "commands",
    kids: [actionIcons],
  });

  const a = Skeletons.Box.X({
    className: `${_ui_.fig.group}__header container u-jc-sb`,
    debug: __filename,
    sys_pn: "topbar",
    justify: _a.right,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.group}__header main u-ai-center`,
        service: _e.raise,
        uiHandler: _ui_,
        kids: [
          name,
          // Skeletons.Box.X({
          //   className: `${_ui_.fig.group}-topbar__info`,
          //   kids: [
          //     Skeletons.Button.Svg({
          //       ico: "account_info",
          //       className: "icon info",
          //       service: "info",
          //       uiHandler: _ui_,
          //     }),
          //   ],
          // }),
          // Skeletons.Wrapper.X({
          //   className: `${_ui_.fig.group}__wrapper-info`,
          //   name: "info",
          // }),
          dl,
        ],
      }),

      require("./control")(_ui_),
    ],
  });

  return a;
};
module.exports = __player_topbar;
