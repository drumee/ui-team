/**
 * Pre-call command bar shown during 'dial' (caller) and 'ring' (callee).
 * Renders the correct service per role up-front, since _setService runs
 * before the buttons are mounted and would otherwise no-op.
 */
const __window_connect_commands = function (_ui_) {
  const isCallee = !!_ui_.caller;
  const fig = _ui_.fig.family;

  const acceptBtn = isCallee ? Skeletons.Button.Svg({
    className: "ctrl-button accept",
    ico: "telephone_handset",
    sys_pn: "ctrl-pickup",
    name: "pickup",
    service: "pickup",
    state: 1,
    uiHandler: [_ui_],
    dataset: { muted: 0 },
  }) : null;

  const declineBtn = Skeletons.Button.Svg({
    className: "ctrl-button line",
    ico: "telephone_handset",
    sys_pn: "ctrl-line",
    service: isCallee ? "reject" : _e.close,
    state: 1,
    uiHandler: [_ui_],
    dataset: { muted: 0 },
  });

  return Skeletons.Box.X({
    className: `${fig}__commands-container`,
    debug: __filename,
    sys_pn: "commands",
    state: 1,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__commands`,
        kids: [acceptBtn, declineBtn],
      }),
    ],
  });
};

module.exports = __window_connect_commands;
