const { button, entry } = require("../../../../skeleton/toolkit");



/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function otp(ui, url) {
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
        label: "Click here to pay",
        type: _a.toggle,
        className: `${group}__button`,
        service: "open-payment-link",
        value: url,
        priority: "primary",
      }),
    ],
  });
  return Skeletons.Box.Y({
    className: `${fig}__main payment`,
    kids: [
      // Skeletons.Note({
      //   className: `${ui.fig.family}__text`,
      //   content: "Please, click on the link beloaw to pay",
      //   href: url
      // }),
      buttons
    ]
  })
}
export default otp
