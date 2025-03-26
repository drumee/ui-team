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
const __sharees_hub = function(_ui_) {
  const label = Skeletons.Box.X({
    className : `${_ui_.fig.family}__container`,
    kids: [
      Skeletons.Note({
        className : `${_ui_.fig.family}__header my-15`,
        content   : LOCALE.CONTACTS
      })
    ]});
  

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className : `${_ui_.fig.group} ${_ui_.fig.group}__main sharees-roll`,
    kids: [require("./list")(_ui_)]});
  

  return a;
};
module.exports = __sharees_hub;
