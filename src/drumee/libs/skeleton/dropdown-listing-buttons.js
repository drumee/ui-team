/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/confirm-buttons
//   TYPE : 
// ==================================================================== *

// ==================================================
// ==================================================

// ===========================================================
// __skl_conf_buttons
//
// @param [Object] view
// @param [Object] yes_ext
// @param [Object] no_ext
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_restore_buttons = function(view, yes_ext, no_ext, ext, style) {
  //btn_class  = 'pointer bg-white padding-10'
  const yes_opt     = {contentClass:_C.margin.auto, className:'popup__btn popup__btn--success', service: "success"};
  const no_opt      = {contentClass:_C.margin.auto, className:'popup__btn popup__btn--cancel', service: "cancel"};
  if (yes_ext != null) {
    _.merge(yes_opt, yes_ext);
  }
  if (no_ext != null) {
    _.merge(no_opt, no_ext);
  }
  const buttons = [
    SKL_Note(null, "Cancel", no_opt), //LOCALE.CANCEL
    SKL_Note(null, "Ok", same_opt) //_L(_I.GOT_IT
  ];
  const row_opt     = {className:"popup__btn-block", kids:buttons, justify:_a.center};
  //row_style   = {padding:_K.size.px10}
  if (ext != null) {
    _.merge(row_opt, ext);
  }
  if (style != null) {
    _.merge(row_style, style);
  }
  //a = SKL_Box_H view, row_opt, row_style
  const a = SKL_Box_H(view, row_opt);
  return a;
};
module.exports = __skl_restore_buttons;
