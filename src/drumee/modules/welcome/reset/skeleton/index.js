function __skl_welcome_reset(ui) {
  const fig = ui.fig.family
  const { button } = require("builtins/skeleton/toolkit");
  const msgBox = require('../../skeleton/common/message-box').default(ui)

  const header = Skeletons.Box.Y({
    className: `${fig}__header`,
    sys_pn: _a.header,
    kids: require('./header').default(ui)
  })

  const content = Skeletons.Box.X({
    className: `${fig}__content`,
    sys_pn: _a.content,
    kids: require('./password').default(ui)
  })

  let a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [
          header,
          content
        ]
      }),
      msgBox,
      button(ui, {
        label: LOCALE.CONFIRM,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "create-password",
        ico: "arrow-right",
        sys_pn: "button-confirm",
        flow: 'g',
        priority: "primary",
      }),

    ]
  })

  return a;

}

export default __skl_welcome_reset