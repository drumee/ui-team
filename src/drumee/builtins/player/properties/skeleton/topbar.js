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


  // Inside a DMZ share, always show download and gate the click (sign-up /
  // Request Access) in the player's onUiEvent. OUTSIDE DMZ, keep the original
  // permission check so a view-only/no-download user doesn't get a usable button.
  const actionIcons = Skeletons.Box.X({
    className: `${ui.fig.group}-topbar__icon-wrapper`,
    kids: (Visitor.inDmz || ui.canDownload()) ? [downloadIcon] : [],
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
