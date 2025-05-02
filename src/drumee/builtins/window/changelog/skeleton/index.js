// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_drive_header = function(_ui_, list) {
  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`,
    sys_pn    : 'window-header',
    kidsOpt   : { 
      radio     : _a.on,
      uiHandler : _ui_
    },
    
    kids      : [
      require('./topbar')(_ui_) 
    ]});
  
  
  const a = require('window/skeleton/content/main')(_ui_, menu);
  return a;
};

module.exports = __skl_window_drive_header;
