const { button, entry } = require("../../../../skeleton/toolkit");



/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function otp(ui, service) {
  const fig = `${ui.fig.family}-modal`;
  const group = ui.fig.group;
  const buttons = Skeletons.Box.X({
    className: `${group}__buttons ${ui.fig.famil}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
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
      Skeletons.Note({
        className: `${ui.fig.family}__text`,
        content: LOCALE.ENTER_CODE_TO_CHANGE_EMAIL.format(Visitor.profile().email)
      }),
      Skeletons.Box.G({
        className: `${fig}-row name`,
        kids: [
          entry(ui, {
            label: LOCALE.ENTER_CODE_RECEIVED,
            name: _a.code,
            placeholder: "",
            value: ''
          }),
        ]
      }),
      Skeletons.Note({
        className: `${fig}__text highlight`,
        content: LOCALE.DIDNT_GET_EMAIL
      }),
      Skeletons.Note({
        sys_pn: "error",
        className: `${fig}__text error`,
        content: ""
      }),
      buttons
    ]
  })
}

export default otp
