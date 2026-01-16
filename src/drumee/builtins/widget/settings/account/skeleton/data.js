const { button, entry } = require("../../../../skeleton/toolkit");

/**
 * Form for backup all my data
 * @param {*} ui 
 * @returns 
 */
function form(ui) {
  const fig = `${ui.fig.family}-data`;
  
  return Skeletons.Box.Y({
    className: `${fig}__form-main`,
    kids: [
      // Title
      Skeletons.Note({
        className: `${fig}__form-title`,
        content: LOCALE.BACKUP_ALL_MY_DATA,
      }),
      // Message
      Skeletons.Note({
        className: `${fig}__form-message content text`,
        content: LOCALE.BACKUP_MESSAGE,
      }),
      // Password entry
      Skeletons.Box.G({
        className: `${fig}__form-row`,
        kids: [
          Skeletons.Box.G({
            className: `${ui.fig.family}__entry-main`,
            kids: [
              Skeletons.Note({
                className: `${ui.fig.family}__entry-label`,
                content: LOCALE.PASSWORD,
              }),
              Skeletons.EntryBox({
                className: `${ui.fig.family}__entry-input`,
                name: 'password',
                type: _a.password,
                placeholder: LOCALE.ENTER_PASSWORD,
                shower: 1,
                value: '',
                interactive: 1,
                uiHandler: [ui],
                formItem: 'password',
              }),
            ]
          }),
        ]
      }),
      // Error message
      Skeletons.Note({
        sys_pn: "error",
        className: `${fig}__form-error`,
        state: 0,
        content: ""
      }),
    ]
  });
}

/**
 * Settings body for My data page
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function settings_body(ui) {
  const fig = ui.fig.family;
  const group = ui.fig.group;
  
  const buttons = Skeletons.Box.X({
    className: `${group}__buttons ${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids: [
      button(ui, {
        label: LOCALE.VALIDATE,
        type: _a.toggle,
        className: `${group}__button`,
        service: "backup-data",
        priority: "primary",
      }),
    ],
  });
  
  return [
    form(ui),
    buttons
  ];
}

export default settings_body;
