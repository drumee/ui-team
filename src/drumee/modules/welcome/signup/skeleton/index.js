function __skl_welcome_signup  (_ui_) {
  const signupFig = _ui_.fig.family

  const header = Skeletons.Box.Y({
    className  : `${signupFig}__header`,
    sys_pn     : _a.header,
  })

  const content = Skeletons.Box.X({
    className  : `${signupFig}__content`,
    sys_pn     : _a.content,
  })

  let a = Skeletons.Box.Y({
    className  : `${signupFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${signupFig}__container`,
        kids : [
          header,
          content
        ]
      })
    ]
  })

  return a;

}

export default __skl_welcome_signup