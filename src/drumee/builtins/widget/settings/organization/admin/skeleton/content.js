/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_admin_panel_content  (_ui_){
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          Skeletons.Note({
            content: "__skl_admin_panel_content"
          })
        ]
      })
    ]
  })
  return a;
}
export default __skl_admin_panel_content;