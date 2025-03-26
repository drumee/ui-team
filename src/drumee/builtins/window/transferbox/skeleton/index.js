/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/adminpanel/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_admin_panel  (_ui_){
  const menu = Skeletons.Box.X({ 
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    sys_pn    : "window-header",
    kidsOpt   : {
      radio     : _a.on,
      uiHandler : _ui_
    },
    kids      : [ require('./common/top-bar').default(_ui_) ]}); 
  
  const a = require('window/skeleton/content/main')(_ui_, menu);
  
  return a;
}

export default __skl_admin_panel;