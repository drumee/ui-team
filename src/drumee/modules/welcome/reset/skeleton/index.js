function __skl_welcome_reset  (_ui_) {
  const resetFig = _ui_.fig.family

  const header = Skeletons.Box.Y({
    className  : `${resetFig}__header`,
    sys_pn     : _a.header,
  })

  const content = Skeletons.Box.X({
    className  : `${resetFig}__content`,
    sys_pn     : _a.content,
  })

  let a = Skeletons.Box.Y({
    className  : `${resetFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${resetFig}__container`,
        kids : [
          header,
          content
        ]
      })
    ]
  })

  return a;

}

export default __skl_welcome_reset