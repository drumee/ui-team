// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/libs/reader/note/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_libs_note = function(_ui_) {
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : []})
    ]});

  return a;
};
module.exports = __skl_libs_note;