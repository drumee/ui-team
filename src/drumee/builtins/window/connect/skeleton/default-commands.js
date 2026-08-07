/**
 * Pre-call action row shown during 'dial' (caller) and 'ring' (callee).
 *
 * Figma "call-action-button": 64px circles, 48px apart.
 *   outbound → mic · camera · hang up (red)
 *   inbound  → accept (green) · mic · camera · decline (red)
 *
 * The mic / camera buttons are PREFERENCES here, not live track toggles — no
 * conference exists yet. They carry their own sys_pn (precall-*) rather than
 * ctrl-audio / ctrl-video so defaultState()'s `_setService("ctrl-audio", null)`
 * can't reach in and disable them, and window/connect/index.js applies the
 * chosen state to the real tracks once the call goes live.
 *
 * The role's service is baked in up-front because _setService runs before these
 * buttons mount and would otherwise no-op.
 */
const __window_connect_commands = function (_ui_) {
  const isCallee = !!_ui_.caller;
  const fig = _ui_.fig.family;

  const micState = _ui_.mget(_a.audio) != null ? _ui_.mget(_a.audio) : 1;
  const camState = _ui_.mget(_a.video) != null ? _ui_.mget(_a.video) : 0;

  const acceptBtn = isCallee
    ? Skeletons.Button.Svg({
        className: `${fig}__call-action accept pickup`,
        ico: "telephone_handset",
        sys_pn: "ctrl-pickup",
        name: "pickup",
        service: "pickup",
        state: 1,
        uiHandler: [_ui_],
        attrOpt: { "data-muted": "0", "data-action": "accept" },
        dataset: { muted: 0, action: "accept" },
      })
    : null;

  const micBtn = Skeletons.Button.Svg({
    className: `${fig}__call-action mic`,
    ico: "meeting-mic",
    icons: ["meet-mic-slash", "meeting-mic"],
    state: micState,
    sys_pn: "precall-audio",
    name: _a.audio,
    service: "precall-audio",
    uiHandler: [_ui_],
    attrOpt: { "data-action": "mic" },
    dataset: { action: "mic" },
  });

  const cameraBtn = Skeletons.Button.Svg({
    className: `${fig}__call-action camera`,
    ico: "meet-camera",
    icons: ["meet-camera-slash", "meet-camera"],
    state: camState,
    sys_pn: "precall-video",
    name: _a.video,
    service: "precall-video",
    uiHandler: [_ui_],
    attrOpt: { "data-action": "camera" },
    dataset: { action: "camera" },
  });

  const declineBtn = Skeletons.Button.Svg({
    className: `${fig}__call-action hangup`,
    ico: "meet-leave",
    sys_pn: "ctrl-line",
    service: isCallee ? "reject" : _e.close,
    state: 1,
    uiHandler: [_ui_],
    attrOpt: { "data-muted": "0", "data-action": "hangup" },
    dataset: { muted: 0, action: "hangup" },
  });

  return Skeletons.Box.X({
    className: `${fig}__commands-container`,
    debug: __filename,
    sys_pn: "commands",
    state: 1,
    attrOpt: { "data-mode": "setup" },
    dataset: { mode: "setup" },
    kids: [
      Skeletons.Box.X({
        className: `${fig}__commands`,
        kids: [acceptBtn, micBtn, cameraBtn, declineBtn].filter(Boolean),
      }),
    ],
  });
};

module.exports = __window_connect_commands;
