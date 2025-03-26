
function buttons (_ui_) {
  const pfx = _ui_.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__setup-buttons`,
    sys_pn : "device-button",
    kidsOpt:{
      uiHandler:[_ui_],
      className: "ctrl-button",
    },
    kids: [
      Skeletons.Button.Svg({
        ico: "speaker",
        service: "test-speaker",
      }),
      Skeletons.Button.Svg({
        ico: "micro",
        service: "test-mic",
        type : _a.audio
      }),
      Skeletons.Button.Svg({
        ico: "video-camera",
        service: "test-video",
        type : _a.video
      }),
    ]
  })
}

module.exports = function (_ui_, data = {}) {
  const { sender } = data;
  const pfx = _ui_.fig.family;
  const a = Skeletons.Box.Y({
    className: `${pfx}__setup`,
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: `${pfx}__setup-text title`,
        content: LOCALE.JOIN_CONFERENCE_CREATED_BY.format(sender)
      }),
      Skeletons.Note({
        service: "join-conference",
        className: `${pfx}__setup-text button`,
        content: LOCALE.JOIN_CONFERENCE,
        uiHandler: [_ui_]
      }),
      Skeletons.Box.Y({
        sys_pn: 'lobby-options',
        className: `${pfx}__setup-options main`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__setup-text check-hw`,
            content: LOCALE.CHECK_HARDWARE,
          }),
          buttons(_ui_),
          Skeletons.Box.Y({
            className: `${pfx}__devices-output`,
            sys_pn: 'devices-output',
            partHandler: [_ui_]
          }),
        ]
      })
    ]
  });
  return a;
};
