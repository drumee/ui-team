/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/pages/admin-settings/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_admin_security_page  (_ui_){
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main fullwidth`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container fullwidth`,
        kids : [
          require('./visibility').default(_ui_)
        ]
      })
    ]
  })
  return a;
}
export default __skl_admin_security_page;