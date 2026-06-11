function __skl_welcome_reset(ui) {
  const fig = ui.fig.family
  const msgBox = require('../../skeleton/common/message-box').default(ui)

  const header = Skeletons.Box.Y({
    className: `${fig}__header`,
    sys_pn: _a.header,
    kids: require('./header').default(ui)
  })

  const content = Skeletons.Box.Y({
    className: `${fig}__content`,
    sys_pn: _a.content,
    kids: require('./password').default(ui)
  })

  // Update-password action. The box itself carries the click service and is
  // styled as the primary button; it starts disabled (state 0) and is enabled
  // by the controller once every rule passes and both fields match.
  const button = Skeletons.Box.X({
    className: `${fig}__button-confirm`,
    sys_pn: 'button-confirm',
    service: 'create-password',
    uiHandler: [ui],
    dataset: { state: 0 },
    kids: [
      // active: 0 makes the icon + label click-through, so a click anywhere on
      // the button (not just the padding) bubbles to the 'create-password'
      // service instead of being swallowed by the inner Svg/Note.
      Skeletons.Button.Svg({
        ico: 'app-check',
        active: 0,
        className: `${fig}__button-ico`
      }),
      Skeletons.Note({
        className: `${fig}__button-label`,
        active: 0,
        content: LOCALE.UPDATE_PASSWORD
      })
    ]
  })

  return Skeletons.Box.Y({
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
      button
    ]
  })
}

export default __skl_welcome_reset
