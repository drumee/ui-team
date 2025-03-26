// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================

// ===========================================================
const __topbar_control_sizing = function(_ui_) {

  const s = _ui_._state || 0;

  const size_ctrl = Skeletons.Button.Svg({
    // ico       : "desktop_reduce"
    className : "icon ctrl-sizing",
    service   : "change-size",
    sys_pn    : "size-ctrl",
    uiHandler : _ui_,
    state     : s,
    icons     : [
      "desktop_fullview",
      "desktop_reduce"
    ]});
  return size_ctrl;
};

module.exports = __topbar_control_sizing;
