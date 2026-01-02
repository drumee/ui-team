/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/member_tag_item/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_widget_member_tagItem  (_ui_) {
  const tagItemFig = _ui_.fig.family

  const optIcon = Skeletons.Button.Svg({
    ico       : 'desktop_sharebox_edit',
    className : `${tagItemFig}__icon edit-icon desktop_sharebox_edit`,
    service   : 'edit-tag',
    dataset   : {
      form  : _a.on
    },
    uiHandler : _ui_
  })

  const name = Skeletons.Note({
    className : `${tagItemFig}__note name`,
    content   : _ui_.mget(_a.name),
    service   : 'show-member-list',
    type      : 'role',
    uiHandler : _ui_
  })
  
  let a = Skeletons.Box.Y({
    className  : `${tagItemFig}__main`,
    debug      : __filename,
    service    : 'show-member-list',
    type       : 'role',
    uiHandler  : _ui_,
    kidsOpt    : {
      active   : 0
    },
    kids       : [
      Skeletons.Box.X({
        className  : `${tagItemFig}__container`,
        kids : [
          name,
          optIcon
        ]
      })
    ]
  })
  
  return a;
}

export default __skl_widget_member_tagItem;