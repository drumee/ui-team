/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/builtins/window/helpdesk/widget/help-item/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_widget_help_item  (_ui_) {
  const helpItemFig = _ui_.fig.family

  const button = Skeletons.Box.X({
    className : `${helpItemFig}__button`,
    kids      : [
      Skeletons.Note({
        className : `${helpItemFig}__note button-text`,
        content   : _ui_.mget('LH'),
      })
    ]
  })

  const content = Skeletons.Box.X({
    className : `${helpItemFig}__content`,
    kids      : [
      Skeletons.Note({
        className : `${helpItemFig}__note content`,
        content   : _ui_.mget('RH'),
      })
    ]
  })
  
  let a = Skeletons.Box.Y({
    className  : `${helpItemFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${helpItemFig}__container`,
        kids : [
          button,
          content
        ]
      })
    ]
  })
  
  return a;
}

export default __skl_widget_help_item;