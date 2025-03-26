module.exports = function (_ui_) {
  return Skeletons.Box.X({
    className: `device-button`,
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
