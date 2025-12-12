const { button, entry } = require("../../../../skeleton/toolkit");


/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function change_password(ui, service) {
  const fig = `${ui.fig.family}-modal`;
  const group = ui.fig.group;
  const buttons = Skeletons.Box.X({
    className: `${group}__buttons ${ui.fig.famil}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kidsOpt: { uiHandlers: [ui] },
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${group}__button`,
        service: "close-overlay",
        priority: "secondary",
      }),
      button(ui, {
        label: LOCALE.CONFIRM,
        type: _a.toggle,
        className: `${group}__button`,
        service,
        priority: "primary",
      }),
    ],
  });
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      Skeletons.Box.G({
        className: `${fig}-password name`,
        kids: [
          entry(ui, {
            label: LOCALE.OLD_PASSWORD,
            name: 'old_password',
            type: _a.password,
            placeholder: "",
            shower: 1,
            value: ''
          }),
        ]
      }),
      Skeletons.Note({
        sys_pn: "error",
        className: `${fig}-error`,
        state: 0,
        content: ""
      }),
      {
        kind: 'dtk_pwsetter',
        sys_pn: 'pwsetter',
        service: 'change-password',
        uiHandler: [ui],
      },
      buttons
    ]
  })
}

export default change_password
