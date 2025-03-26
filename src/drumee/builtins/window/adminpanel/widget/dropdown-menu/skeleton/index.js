/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/widget/dropdown-menu/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/


function __skl_widget_dropdownMenu (_ui_) {
  const menuFig = `${_ui_.fig.family}`

  const menu = require('./card-menu').default(_ui_);
  
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          menu
        ]
      })
    ]
  })
  return a;
}
export default __skl_widget_dropdownMenu;