// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


const __window_info_rev = function(_ui_) {
  const r = document.body.dataset.head || "";
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.family}__container`,
    kids      : [
      Skeletons.Note({ 
        className : "u-jc-center w-100",
        content : "Commit ID : " + r.substr(0, 7)
      })
    ]});
  return a;
};
module.exports = __window_info_rev;
