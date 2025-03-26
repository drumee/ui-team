// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __cross = function(_ui_) {
  const a = Skeletons.Button.Svg({
    ico       : "cross",
    src        :"/-/static/images/icons/cross.svg", 
    className : `${_ui_.fig.family}__cross`,
    service   : "clear",
    uiHandler : [_ui_]}); 

  return a;
};
module.exports = __cross;
