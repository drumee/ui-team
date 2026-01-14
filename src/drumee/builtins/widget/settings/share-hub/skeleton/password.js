/**
 * Password section with checkbox and input field
 */
export default function (ui, formData, mode = _a.view) {
  const passwordFig = `${ui.fig.family}-password`;
  // Get formData from parameter or ui.data(), handle both hasPassword and hasPaswword (API typo)
  const data = formData || ui.data() || {};
  let hasPassword = data.hasPassword;
  if (hasPassword === undefined && data.hasPaswword !== undefined) {
    hasPassword = data.hasPaswword;
  }
  hasPassword = hasPassword || (data.password ? 1 : 0) || 0;

  // Edit mode - show checkbox and input when checked
  const passwordCheckbox = Skeletons.Button.Svg({
    icons: ["editbox_shapes-roundsquare", "available"],
    className: `${passwordFig}__checkbox`,
    state: hasPassword ? 1 : 0,
    name: "passwordSet",
    itemForm: 1,
    service: "toggle-password",
    uiHandler: [ui],
  });

  // Password input wrapper (shown when checkbox is checked)
  // EntryBox with Hide/Show text button on the right
  const passwordVisibility = data.passwordVisible || 0;
  // Get password from formData, data, or ui.data()
  const passwordValue = data.password || formData?.password || '';
  const passwordInputWrapper = Skeletons.Box.X({
    className: `${passwordFig}__input-wrapper`,
    state: hasPassword ? 1 : 0,
    sys_pn:"passwordInputWrapper",
    kids: [
      Skeletons.Entry({
        className: `${passwordFig}__input`,
        uiHandler: [ui],
        placeholder: LOCALE.ENTER_PASSWORD || "Enter password",
        service: '',
        type: passwordVisibility ? _a.text : _a.password,
        sys_pn: 'password-input',
        autocomplete: _a.off,
        value: passwordValue,
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
            state: hasPassword ? 1 : 0,
            service: "toggle-password",
            interactive: 1,
            uiHandler: [ui],
          }),
        ],
      }),
      passwordInputWrapper,
    ].filter(Boolean),
  });
}

