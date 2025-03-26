const passwordContainer = function (_ui_) {
  const pfx = 'check-password';

  const password = {
    kind: KIND.entry_reminder,
    className: `${_ui_.fig.family}-${pfx}__entry`,
    uiHandler: _ui_,
    service: "check-password",
    type: _a.pass,
    placeholder: LOCALE.CURRENT_PASSWORD,
    require: "any",
    sys_pn: "password-value",
    shower: 1
  };

  const ok = Skeletons.Note({
    className: `${_ui_.fig.family}-${pfx}__button`,
    content: "Ok",
    flow: _a.y,
    service: "check-password",
    uiHandler: _ui_
  });

  const entries = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__entry`,
    kids: [password, ok]
  });

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}-${pfx}`,
    sys_pn: "password-container",
    kids: [
      Preset.Button.Close(_ui_, "close-pass"),
      entries
    ]
  });


  return a;
};

module.exports = passwordContainer;
