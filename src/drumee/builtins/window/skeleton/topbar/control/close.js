// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================

// ===========================================================
const __topbar_control_close = function(_ui_) {

  const close_ctrl = Skeletons.Button.Svg({
    ico        : _a.cross,
    className  : "icon ctrl-close",
    service    : _e.close,
    uiHandler  : _ui_
  });

  return close_ctrl;
};

module.exports = __topbar_control_close;
