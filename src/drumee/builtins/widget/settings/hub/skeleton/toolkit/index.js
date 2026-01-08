/**
 * Check if a specific permission bit is set
 * @param {number} permissionBit - The permission bit to check (e.g., _K.permission.upload)
 * @returns {number} 1 if permission is set, 0 otherwise
 */
function permissionCheck(ui, permissionBit) {
  ui.debug("AAA:7", permissionBit, ui.mget(_a.privilege))
  const privilege = ui.mget(_a.privilege) || 0;
  // Use bitwise AND to check if the specific permission bit is set
  return (privilege & permissionBit) ? 1 : 0;
}


/**
 * Permission section with checkboxes for Upload File and Download File
 */
export function addPermissionRow(ui, permission, service, content, name) {
  const permissionFig = `${ui.fig.family}-permission`;

  let icon = Skeletons.Button.Svg({
    permission,
    service,
    itemForm: 1,
    name,
    icons: ["editbox_shapes-roundsquare", "available"],
    className: `${permissionFig}__checkbox`,
    state: permissionCheck(ui, permission) ? 1 : 0,
    uiHandler: [ui],
  });
  return Skeletons.Box.X({
    className: `${permissionFig}__item`,
    kids: [
      icon,
      Skeletons.Note({
        className: `${permissionFig}__note item-label`,
        content,
      })
    ]
  });
}
export function topbar(ui, label) {
  const figFamily = `${ui.fig.family}-topbar`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${figFamily}__container`,
    sys_pn: _a.topBar,
    kids: [
      Skeletons.Button.Svg({
        ico: "arrow-left",
        className: `${figFamily}__back`,
        service: _a.back,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${figFamily}__title`,
        sys_pn: "window-name",
        content: label || LOCALE.SETTINGS || "Setting",
        uiHandler: [ui],
      }),
      Skeletons.Button.Svg({
        ico: _a.cross,
        className: `${figFamily}__close`,
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });
};


/**
 * Time validity section with radio buttons for Unlimited and Set Limit
 */
export function validity(ui, mode = _a.view, type = null) {
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

