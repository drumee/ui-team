/**
 * Password section with checkbox and input field
 */
export default function (ui, mode = _a.view) {
  const passwordFig = `${ui.fig.family}-password`;
  const hasPassword = ui.formData?.hasPassword || 0;

  if (mode == _a.view) {
    return Skeletons.Box.X({
      className: `${passwordFig}__section`,
      sys_pn: 'password-content',
      kids: [
        Skeletons.Note({
          className: `${passwordFig}__label`,
          content: hasPassword ? LOCALE.PASSWORD_SET || "Password set" : LOCALE.NO_PASSWORD || "No password",
        }),
      ],
    });
  }

  // Edit mode - show checkbox and input when checked
  const passwordCheckbox = Skeletons.Button.Svg({
    icons: ["editbox_shapes-roundsquare", "available"],
    className: `${passwordFig}__checkbox`,
    state: hasPassword ? 1 : 0,
    service: "toggle-password",
    uiHandler: [ui],
  });

  // Password input wrapper (shown when checkbox is checked)
  // EntryBox with Hide/Show text button on the right
  const passwordVisibility = ui.formData?.passwordVisible || 0;
  const passwordInputWrapper = hasPassword ? Skeletons.Box.X({
    className: `${passwordFig}__input-wrapper`,
    kids: [
      Skeletons.EntryBox({
        className: `${passwordFig}__input`,
        uiHandler: [ui],
        placeholder: LOCALE.ENTER_PASSWORD || "Enter password",
        service: '',
        type: passwordVisibility ? _a.text : _a.password,
        sys_pn: 'password-input',
        autocomplete: _a.off,
        value: ui.formData?.password || '',
        name: _a.password,
        formItem: 'password'
      }),
      Skeletons.Note({
        className: `${passwordFig}__toggle-visibility`,
        label: passwordVisibility ? (LOCALE.HIDE || "Hide") : (LOCALE.SHOW || "Show"),
        service: "toggle-password-visibility",
        uiHandler: [ui],
      }),
    ],
  }) : undefined;

  return Skeletons.Box.Y({
    className: `${passwordFig}__section`,
    sys_pn: 'password-content',
    kids: [
      Skeletons.Box.X({
        className: `${passwordFig}__wrapper`,
        kids: [
          passwordCheckbox,
          Skeletons.Note({
            className: `${passwordFig}__label`,
            content: LOCALE.SET_UP_PASSWORD || "Set up password",
            service: "toggle-password",
            uiHandler: [ui],
          }),
        ],
      }),
      passwordInputWrapper,
    ].filter(Boolean),
  });
}

