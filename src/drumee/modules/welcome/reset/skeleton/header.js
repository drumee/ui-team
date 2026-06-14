function __skl_welcome_reset_header(_ui_) {
  const headerFig = _ui_.fig.family

  let headerTitle = LOCALE.SET_A_NEW_PASSWORD

  if (Visitor.parseModuleArgs().reason == 'new-account') {
    headerTitle = LOCALE.CHOOSE_PASSWORD
  }

  const header = Skeletons.Box.X({
    className: `${headerFig}__header-content`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'lock',
        className: `${headerFig}__header-icon lock`,
      }),

      Skeletons.Note({
        className: `${headerFig}__note header`,
        content: headerTitle
      })
    ]
  })

  return header;

}

export default __skl_welcome_reset_header
