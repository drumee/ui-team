
function __skl_members_room  (_ui_) {
  const roomFig = _ui_.fig.family;

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

  if ((_ui_.mget(_a.type) != 'member_create') && (_.isEmpty(_ui_._drumateId))) {
    container = Skeletons.Box.Y({
      className  : `${roomFig}__container`,
      kids : [
        require('./default-content').default(_ui_)
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