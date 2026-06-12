module.exports = function (ui, size) {
  size = size || ui.size;
  const name = Skeletons.Note({
    className: `${ui.fig.group}__title mr-11`,
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


  // Always show download; in a DMZ share without the download grant the click
  // is gated (sign-up / Request Access) in the player's onUiEvent.
  const actionIcons = Skeletons.Box.X({
    className: `${ui.fig.group}-topbar__icon-wrapper`,
    kids: [
      downloadIcon,
    ],
  });


  const dl = Skeletons.Box.X({
    className: `${ui.fig.group}-topbar__action`,
    sys_pn: "commands",
    kids: [actionIcons],
  });

  return Skeletons.Box.X({
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
          dl,
        ],
      }),

      require("../../skeleton/control")(ui),
    ],
  });

};
