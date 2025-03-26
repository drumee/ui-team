/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/pages/members/room/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
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

  let a = Skeletons.Box.Y({
    className  : `${roomFig}__main`,
    debug      : __filename,
    kids       : [
      container
    ]
  })

  return a;
}

export default __skl_members_room;