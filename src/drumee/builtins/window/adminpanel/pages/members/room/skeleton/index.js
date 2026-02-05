
function __skl_members_room  (ui) {
  const roomFig = ui.fig.family;

  let container;

  const header = Skeletons.Box.X({
    className : `${roomFig}__header-wrapper`,
    sys_pn    : 'header'
  })

  const separator = Skeletons.Box.X({
    className : `${roomFig}__separator`
  })

  const content = Skeletons.Box.X({
    className : `${roomFig}__content`,
    sys_pn    : _a.content
  })

  if ((ui.mget(_a.type) != 'member_create') && (_.isEmpty(ui._drumateId))) {
    container = Skeletons.Box.Y({
      className  : `${roomFig}__container`,
      kids : [
        require('./default-content').default(ui)
      ]
    })

  } else {
    container = Skeletons.Box.Y({
      className  : `${roomFig}__container`,
      kids : [
        header,
        separator,
        content
      ]
    })
  }

  return Skeletons.Box.Y({
    className  : `${roomFig}__main`,
    debug      : __filename,
    kids       : [
      container
    ]
  })

}

export default __skl_members_room;