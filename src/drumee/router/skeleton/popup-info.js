// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : router/skeleton/popup-info
//   TYPE : 
// ==================================================================== *

// ==================================================
// ==================================================

// ===========================================================
// __skl_popup_info
//
// @param [Object] view
// @param [Object] question
// @param [Object] warning
// @param [Object] page
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_popup_info = function(view, message) {
  const yes_opt = { 
    contentClass : _C.margin.auto,
    className    : 'popup__btn popup__btn--remove-page popup__btn--success',
    service      : _e.close
  };
  const a = Skeletons.Box.Y({
    debug : __filename,
    className : "popup__inner popup__inner--small pb-24 pt-30 px-40 u-jc-center u-ai-center",
    kids: [
      SKL_Note(_e.close, message, {
        className:"popup__header popup__header--remove-page mb-8"
      }),
      SKL_Box_H(view, {kids:[SKL_Note(null, LOCALE.OK, yes_opt)]})
    ]});
  return a;
};
module.exports = __skl_popup_info;
