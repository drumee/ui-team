// In-call action bar for the 1:1 "Drumee connect" call (Figma: elapsed time
// above a centred row of round 64px controls — mic / camera / share screen /
// hang up). The team meeting keeps its controls in the top bar; the P2P call
// puts them at the bottom, so this bar replaces the empty placeholder the
// meeting renders.
//
// Every control keeps the exact sys_pn / name / service / dataset contract the
// WebRTC room binds to (__ctrlAudio / __ctrlVideo / __ctrlScreen / ctrl-line),
// so moving them out of the top bar changes their position and nothing else.
//
// P2P ONLY — reached through the `service_class === "connect"` branch in
// webrtc/skeleton/commands.js.
module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;

  // Default on / off exactly as the top-bar cluster does: icons[undefined]
  // would otherwise render the fallback "bars" glyph.
  const micState = _ui_.mget(_a.audio) != null ? _ui_.mget(_a.audio) : 1;
  const camState = _ui_.mget(_a.video) != null ? _ui_.mget(_a.video) : 0;

  // Device caret: the Figma bar has no visible caret, but dropping the picker
  // entirely would cost 1:1 calls their mic / camera selection. Render it as a
  // small chevron pinned to the control's corner, revealed on hover (skin), so
  // the bar reads exactly as designed at rest and stays fully functional.
  const caret = (cls, pn, service) =>
    Skeletons.Button.Svg({
      className: `${pfx}__call-action-caret ${cls} ctrl-devicesetting`,
      ico: "meet-caret-down",
      sys_pn: pn,
      name: _a.devicesettings,
      service,
      bubble: 0,
    });

  const micBtn = Skeletons.Box.X({
    className: `${pfx}__call-action-slot mic`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__call-action mic ctrl-audio`,
        ico: "meeting-mic",
        icons: ["meet-mic-slash", "meeting-mic"],
        state: micState,
        sys_pn: "ctrl-audio",
        name: _a.audio,
        service: _a.settings,
        // dataset alone is dropped at render unless attrOpt is present.
        attrOpt: { "data-muted": "1", "data-action": "mic" },
        dataset: { muted: 1, action: "mic" },
      }),
      caret("audio", "ctrl-devicesetting", "device-setting"),
      Skeletons.Wrapper.Y({
        className: `${pfx}__devices-list audio`,
        sys_pn: "audio-devices",
        partHandler: [_ui_],
      }),
    ],
  });

  const cameraBtn = Skeletons.Box.X({
    className: `${pfx}__call-action-slot camera`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__call-action camera ctrl-video`,
        ico: "meet-camera",
        icons: ["meet-camera-slash", "meet-camera"],
        state: camState,
        sys_pn: "ctrl-video",
        name: _a.video,
        service: _a.settings,
        attrOpt: { "data-muted": "1", "data-action": "camera" },
        dataset: { muted: 1, ctrl: "video", action: "camera" },
      }),
      caret("video", "ctrl-camerasetting", "camera-setting"),
      Skeletons.Wrapper.Y({
        className: `${pfx}__devices-list video`,
        sys_pn: "video-devices",
        partHandler: [_ui_],
      }),
      // Backgrounds & effects panel, fed by updateBgEffectsPanel from the
      // camera device list.
      Skeletons.Wrapper.Y({
        className: `${pfx}__bg-effects`,
        sys_pn: "bg-effects",
        partHandler: [_ui_],
      }),
    ],
  });

  const screenBtn = Skeletons.Button.Svg({
    className: `${pfx}__call-action screen ctrl-screen`,
    ico: "meet-screen",
    state: 0,
    sys_pn: "ctrl-screen",
    name: _a.screen,
    service: "start-screenshare",
    attrOpt: { "data-muted": "1", "data-action": "screen" },
    dataset: { muted: 1, action: "screen" },
  });

  // ctrl-line contract: close → leaveRoom (window/connect/index.js).
  const leaveBtn = Skeletons.Button.Svg({
    className: `${pfx}__call-action hangup ${pfx}__leave-btn`,
    ico: "meet-leave",
    sys_pn: "ctrl-line",
    service: _e.close,
    uiHandler: [_ui_],
    attrOpt: { "data-action": "hangup" },
    dataset: { action: "hangup" },
    bubble: 0,
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__commands-container`,
    sys_pn: "commands",
    state: 0,
    attrOpt: { "data-mode": "in-call" },
    dataset: { mode: "in-call" },
    kids: [
      // Elapsed call time — driven by _updateElapsedTimer (webrtc/room), which
      // resolves it by sys_pn wherever it is mounted.
      Skeletons.Note({
        className: `${pfx}__call-elapsed`,
        content: "00:00",
        sys_pn: "elapsed-timer",
      }),
      Skeletons.Box.X({
        className: `${pfx}__commands`,
        kids: [micBtn, cameraBtn, screenBtn, leaveBtn],
      }),
    ],
  });
};
