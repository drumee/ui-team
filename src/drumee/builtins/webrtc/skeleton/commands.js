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
  // Team meetings render the controls in the top bar (webrtc/skeleton/topbar.js)
  // instead of this floating bar. Keep the `commands` container node so the
  // ensurePart("commands") show/hide calls in webrtc/room/index.js +
  // window/meeting/index.js still resolve, but leave it empty (no duplicate
  // ctrl-* buttons, which would clash with the topbar ones by sys_pn).
  // The 1:1 connect window puts its controls HERE, at the bottom (Figma
  // "Drumee connect"), and leaves its top bar as a plain window header.
  if (_ui_.service_class === "connect") {
    return require("./p2p-commands")(_ui_);
  }

  // Team meetings render controls in the top bar (webrtc/skeleton/topbar.js),
  // so keep this floating bar empty for them — avoids duplicate ctrl-* buttons
  // clashing with the topbar ones by sys_pn.
  const isTeamMeeting =
    _ui_.service_class === "meeting" && _ui_.mget(_a.area) !== _a.dmz;
  if (isTeamMeeting) {
    return Skeletons.Box.X({
      className: `${_ui_.fig.family}__commands-container`,
      sys_pn: "commands",
      state: 0,
      // dataset alone is dropped at render unless attrOpt is present — and the
      // [data-empty="1"] CSS is what keeps this shell invisible after the
      // post-join ensurePart("commands").el.show() call.
      attrOpt: { "data-empty": "1" },
      dataset: { mode: "in-call", empty: 1 },
    });
  }

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
            dataset: { muted: 1, ctrl: "video" }
          }),
          Skeletons.Button.Svg({
            className: "ctrl-button screen",
            ico: "screen_share",
            state: 0,
            sys_pn: "ctrl-screen",
            name: _a.screen,
            service: "start-screenshare",
            attrOpt: { title: LOCALE.SHARE_SCREEN },
            dataset: { muted: 1 }
          }),
          Skeletons.Button.Svg({
            className: "ctrl-button hand-raise",
            ico: "hand-raise",
            sys_pn: "ctrl-hand",
            name: "hand-raise",
            service: "hand-raise",
            attrOpt: { title: LOCALE.RAISE_HAND },
            dataset: { raised: 0 },
          }),
          Skeletons.Button.Svg({
            className: "ctrl-button leave",
            ico: "meeting-leave",
            sys_pn: "ctrl-line",
            service: _e.close,
            uiHandler: [_ui_],
            bubble: 0,
          }),
        ]
      }),
    ]
  });

  return a;
};
module.exports = __window_connect_commands;
