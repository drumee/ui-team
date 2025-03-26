// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/libs/reader/spinner/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_spinner_loader (_ui_) {
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
module.exports = __skl_spinner_loader;