/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/transferbox/pages/outbound/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_members_page  (_ui_) {
  const membersFig = `${_ui_.fig.family}`;


  
  let a = Skeletons.Box.Y({
    className  : `${membersFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${membersFig}__container`,
        kids : [
          Skeletons.Note({
            className  : `${_ui_.fig.family}__classname`,
            content: "Out Bound Content"
          })
        ]
      })
    ]
  })

  return a;
}

export default __skl_members_page;