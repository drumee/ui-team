// ================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/builtins/window/note/skeleton/index.js
//   TYPE : Skelton
// ===================================================================**/

function __skl_window_note(_ui_) {
  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`,
    sys_pn    : "window-header",
    kidsOpt:{
      radio : _a.on,
      uiHandler    : _ui_
    },
    kids : [require('./topbar')(_ui_)]
  })
  const a = require('window/skeleton/content/main')(_ui_, menu)
  a.debug = __filename
  return a
}
module.exports = __skl_window_note;