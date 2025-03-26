// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/tag-form-menu/skeleton/index.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_widget_tagFormMenu = function(_ui_) {
  
  let tagMenu;
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          (tagMenu = require('./tag-menu')(_ui_))
        ]})
    ]});

  return a;
};

module.exports = __skl_widget_tagFormMenu;