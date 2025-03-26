/* ==================================================================== *
*   Copyright Xialia.com  2011-2021
*   FILE : window/skeleton/topbar/control/minimize.js
*   TYPE : Skelton
* ==================================================================== */

const __topbar_control_minimize = function(_ui_) {
  const minimize_ctrl = Skeletons.Button.Svg({
    ico        : 'window-minimize',
    className  : "icon ctrl-minimize",
    service    : _e.minimize,
    uiHandler  : _ui_,
  });
  return minimize_ctrl
}

export default __topbar_control_minimize