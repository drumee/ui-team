function __webrtc_device(_ui_) {
  return Skeletons.Box.X({
    className: `device-button`,
    kids: [
      Skeletons.Button.Svg({
        className: "ctrl-button accept",
        ico: "meeting-mic",
        state: _ui_.mget(_a.audio),
        sys_pn: "ctrl-audio",
        name: _a.audio,
        service: _a.settings,
        dataset: { muted: 1 }
      }),
      Skeletons.Button.Svg({
        className: "ctrl-button settings audio",
        ico: "settings",
        sys_pn: "ctrl-devicesetting",
        name: _a.devicesettings,
        service: 'device-setting'
      }),
      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__devices-list audio`,
        sys_pn: "audio-devices",
        partHandler: [_ui_],
      }),
    ]
  });
}

const __window_connect_commands = function (_ui_) {
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__commands-container`,
    sys_pn: "commands",
    state: 0,
    dataset: { mode: "in-call" },
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__commands`,
        kids: [
          __webrtc_device(_ui_),
          Skeletons.Button.Svg({
            className: "ctrl-button accept",
            ico: "meeting-video",
            state: _ui_.mget(_a.video),
            sys_pn: "ctrl-video",
            name: _a.video,
            service: _a.settings,
            dataset: { muted: 1 }
          }),
          Skeletons.Button.Svg({
            className: "ctrl-button hand-raise",
            ico: "hand-raise",
            sys_pn: "ctrl-hand",
            name: "hand-raise",
            service: "hand-raise",
            state: 0,
          }),
          Skeletons.Button.Svg({
            className: "ctrl-button leave",
            ico: "meeting-leave",
            sys_pn: "ctrl-line",
            service: _e.close,
            bubble: 0,
          }),
        ]
      }),
    ]
  });

  return a;
};
module.exports = __window_connect_commands;
