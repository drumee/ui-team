// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================

// ===========================================================
const __topbar_control_close = function(_ui_) {

  const close_ctrl = Skeletons.Button.Svg({
    ico        : 'player-fullscreen',
    className  : "icon ctrl-fullscreen",
    service    : 'fullscreen',
    uiHandler  : _ui_,
    sys_pn     : 'ctrl-fullscreen',
    state      : 0
  });
  return close_ctrl;
};

module.exports = __topbar_control_close;
