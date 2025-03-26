// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


const __skl_window_info_topbar = function(_ui_) {
  const figname = "topbar";
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.family}-${figname}__container u-jc-sb`,
    sys_pn    : "browser-top-bar",
    debug     : __filename,
    service   : _e.raise,
    kids : [
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]});

  return a;
};
module.exports = __skl_window_info_topbar;
