/**
 * Password section with checkbox and input field
 */
export default function (ui) {
  const passwordFig = `${ui.fig.family}-password`;
  let { hasPassword, passwordVisible = 0, password } = ui.data()
  ui.debug("AAA:777", ui, ui.data())
  // if (mode == _a.view) {
  //   return Skeletons.Box.X({
  //     className: `${passwordFig}__section`,
  //     sys_pn: 'password-content',
  //     kids: [
  //       Skeletons.Note({
  //         className: `${passwordFig}__label`,
  //         content: hasPassword ? LOCALE.PASSWORD_SET || "Password set" : LOCALE.NO_PASSWORD || "No password",
  //       }),
  //     ],
  //   });
  // }

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
  const passwordVisibility = passwordVisible || 0;
  const passwordInputWrapper = Skeletons.Box.X({
    className: `${passwordFig}__input-wrapper`,
    state: 0,
    sys_pn: "passwordInputWrapper",
    kids: [
      Skeletons.Entry({
        className: `${passwordFig}__input`,
        uiHandler: [ui],
        placeholder: LOCALE.ENTER_PASSWORD || "Enter password",
        service: '',
        type: passwordVisibility ? _a.text : _a.password,
        sys_pn: 'password-input',
        autocomplete: _a.off,
        value: password || '',
        name: _a.password,
        formItem: 1
      }),
      Skeletons.Note({
        className: `${passwordFig}__toggle-visibility`,
        label: passwordVisibility ? (LOCALE.HIDE || "Hide") : (LOCALE.SHOW || "Show"),
        service: "toggle-password-visibility",
        state: 1,
        uiHandler: [ui],
      }),
    ],
  })

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

