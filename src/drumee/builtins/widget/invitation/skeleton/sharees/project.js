// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// @return [Object] 
//
// ===========================================================
const __sharees_admin = function(_ui_) {
  const label = Skeletons.Box.X({
    className : `${_ui_.fig.family}__title-big mt-30 mb-25 u-jc-center`,
    kids: [
      Skeletons.Note({content   : LOCALE.DOCUMENTS_ACCESS})
    ]});
  const button = Preset.Button.Close(_ui_);
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className : `${_ui_.fig.group} ${_ui_.fig.group}__main sharees-roll`,
    kids: [label, button, require("./list")(_ui_)]});
  

  return a;
};
module.exports = __sharees_admin;
