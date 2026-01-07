/**
 * Time validity section with radio buttons for Unlimited and Set Limit
 */
export default function (ui, mode = _a.view, type = null) {
  const validityFig = `${ui.fig.family}-validity`;

  let _validitySwitchState = 0;
  let _validityMode = _a.open;
  if ((ui.data?.dmz_expiry == _a.infinity) && (type != 'toggle-edit')) {
    _validitySwitchState = 1;
    _validityMode = _a.closed;
  }

  // Radio button options
  const unlimitedOption = {
    value: _a.infinity,
    label: LOCALE.UNLIMITED || "Unlimited",
    description: LOCALE.UNLIMITED_DESCRIPTION || "Members can access to the folder at any time.",
  };

  const setLimitOption = {
    value: _a.limited,
    label: LOCALE.SET_LIMIT || "Set Limit",
    description: LOCALE.SET_LIMIT_DESCRIPTION || "Members will only be able to access the folder during specific times.",
  };

  const currentMode = ui.formData?.validity_mode || _a.infinity;
  const isUnlimited = currentMode === _a.infinity;

  // Radio buttons
  const unlimitedRadio = Skeletons.Button.Svg({
    icons: ["radio-unchecked", "radio-checked"],
    className: `${validityFig}__radio ${isUnlimited ? "active" : ""}`,
    state: isUnlimited ? 1 : 0,
    service: "toggle-validity-mode",
    uiHandler: ui,
    expiry: _a.infinity,
  });

  const setLimitRadio = Skeletons.Button.Svg({
    icons: ["radio-unchecked", "radio-checked"],
    className: `${validityFig}__radio ${!isUnlimited ? "active" : ""}`,
    state: !isUnlimited ? 1 : 0,
    service: "toggle-validity-mode",
    uiHandler: ui,
    expiry: _a.limited,
  });

  // Time inputs (shown when Set Limit is selected)
  let days = null;
  let hours = null;

  if (mode == _a.edit && !isUnlimited) {
    days = Skeletons.EntryBox({
      className: `${validityFig}__entry validity-entry days`,
      uiHandler: ui,
      placeholder: LOCALE.DAY || "Day",
      service: '',
      type: _a.number,
      sys_pn: 'month-setting-input',
      autocomplete: _a.off,
      value: ui.formData?.days || '',
      name: 'days',
      formItem: 'days',
      min: 0,
      max: 999,
    });

    hours = Skeletons.EntryBox({
      className: `${validityFig}__entry validity-entry hours`,
      uiHandler: ui,
      service: '',
      placeholder: LOCALE.HOUR || "Hour",
      type: _a.number,
      sys_pn: 'hours-setting-input',
      autocomplete: _a.off,
      value: ui.formData?.hours || '',
      name: 'hours',
      formItem: 'hours',
      min: 0,
      max: 23,
    });
  }

  if (mode == _a.view) {
    days = Skeletons.Note({
      className: `${validityFig}__note validity-entry-text`,
      content: ui.formData?.days || '0'
    });

    hours = Skeletons.Note({
      className: `${validityFig}__note validity-entry-text`,
      content: ui.formData?.hours || '0'
    });
  }

  // Only show setValidityWrapper when "Set Limit" is selected (not unlimited)
  const setValidityWrapper = !isUnlimited ? Skeletons.Box.X({
    className: `${validityFig}__set-validity`,
    sys_pn: 'set-validity-wrapper',
    dataset: {
      mode: _a.open
    },
    kids: [
      Skeletons.Box.X({
        className: `${validityFig}__validity-action-wrapper ${mode}`,
        kids: [
          days,
          hours,
        ].filter(Boolean)
      }),
    ]
  }) : undefined;

  return Skeletons.Box.Y({
    className: `${validityFig}__section`,
    sys_pn: 'validity-content',
    kids: [
      Skeletons.Note({
        className: `${validityFig}__title`,
        content: LOCALE.TIME_VALIDITY || "Time validity:",
      }),
      Skeletons.Box.Y({
        className: `${validityFig}__options`,
        kids: [
          // Unlimited option
          Skeletons.Box.X({
            className: `${validityFig}__option${isUnlimited ? " active" : ""}`,
            service: "toggle-validity-mode",
            uiHandler: [ui],
            radio: `validity-radio-${ui._id || ui.id || 'default'}`,
            state: isUnlimited ? 1 : 0,
            expiry: _a.infinity,
            kids: [
              unlimitedRadio,
              Skeletons.Box.Y({
                className: `${validityFig}__option-content`,
                kids: [
                  Skeletons.Note({
                    className: `${validityFig}__option-label`,
                    content: unlimitedOption.label,
                    service: "toggle-validity-mode",
                    uiHandler: [ui],
                    expiry: _a.infinity,
                  }),
                  Skeletons.Note({
                    className: `${validityFig}__option-description`,
                    content: unlimitedOption.description,
                  }),
                ],
              }),
            ],
          }),
          // Set Limit option
          Skeletons.Box.Y({
            className: `${validityFig}__option${!isUnlimited ? " active" : ""}`,
            kids: [
              Skeletons.Box.X({
                service: "toggle-validity-mode",
                uiHandler: [ui],
                radio: `validity-radio-${ui._id || ui.id || 'default'}`,
                state: !isUnlimited ? 1 : 0,
                expiry: _a.limited,
                kids: [
                  setLimitRadio,
                  Skeletons.Box.Y({
                    className: `${validityFig}__option-content`,
                    kids: [
                      Skeletons.Note({
                        className: `${validityFig}__option-label`,
                        content: setLimitOption.label,
                        service: "toggle-validity-mode",
                        uiHandler: [ui],
                        expiry: _a.limited,
                      }),
                      Skeletons.Note({
                        className: `${validityFig}__option-description`,
                        content: setLimitOption.description,
                      }),
                    ],
                  }),
                ],
              }),
              setValidityWrapper,
            ].filter(Boolean),
          }),
        ],
      }),
    ].filter(Boolean),
  });
}

