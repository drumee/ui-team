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

  const saveRotationIcon = Skeletons.Button.Svg({
    ico: "checked-circle",
    sys_pn: "save-rotation-button",
    className: "icon save-rotation",
    service: "save-rotation",
    uiHandler: ui,
  });

  let actionIcons = Skeletons.Box.X({
    className: `${ui.fig.group}-topbar__icon-wrapper`,
    kids: [],
  });
  if (!Visitor.inDmz || ui.canDownload()) {
    actionIcons.kids.unshift(downloadIcon);
  }

  if (ui.canUpload() && ui.media && ui.media.imgCapable()) {
    actionIcons.kids.push(rotateLeftIcon, rotateRightIcon, saveRotationIcon);
  }
  actionIcons.kids.push(require("../../skeleton/control")(ui));

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
        kids: [name, dl],
      }),
    ],
  });
};
