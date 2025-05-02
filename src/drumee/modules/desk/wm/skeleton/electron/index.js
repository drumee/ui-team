// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __skl_folder_main = function(_ui_) {

  const menu = Skeletons.Box.X({
    // className : "drive-popup__bar drive-popup__bar--regular" 
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    kidsOpt: {
      radio : _a.on,
      uiHandler    : _ui_
    },
    kids : [require('./topbar')(_ui_)]});
  const a = require('window/skeleton/content/main')(_ui_, menu);
  return a;
};
module.exports = __skl_folder_main;
