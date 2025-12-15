const { button } = require("../../../../skeleton/toolkit");



/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function ack(ui, content) {
  const fig = `${ui.fig.family}-modal`;
  const group = ui.fig.group;
  const buttons = Skeletons.Box.X({
    className: `${group}__buttons ${ui.fig.famil}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids: [
      button(ui, {
        label: LOCALE.CLOSE,
        type: _a.toggle,
        className: `${group}__button`,
        service : "close-overlay",
        priority: "primary",
      }),
    ],
  });
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__text`,
        content:LOCALE.PREFERENCES
      }),
      buttons
    ]
  })
}

export default ack
