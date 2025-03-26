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
// __skl_unpublish_buttons
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
const __skl_save_clear_buttons = function(view, yes_ext, no_ext, ext, style) {
  //btn_class  = 'pointer bg-white padding-10'
  const yes_opt     = {contentClass:_C.margin.auto, className:'btn btn--confirm', service: "saveSuccess"};
  const no_opt      = {contentClass:_C.margin.auto, className:'btn btn--cancel', service: "clearPage"};
  if (yes_ext != null) {
    _.merge(yes_opt, yes_ext);
  }
  if (no_ext != null) {
    _.merge(no_opt, no_ext);
  }
  // buttons = [
  //   SKL_Note(null, "Clear", no_opt) #LOCALE.CANCEL
  //   SKL_Note(null, "Save", yes_opt) #_L(_I.GOT_IT
  // ]

  const buttons = [
    SKL_Box_V(view, {
      className: "popup__btn-group popup__btn-group--cancel u-ai-center",
      kids: [
        SKL_SVG("header_save", {className: "mb-19"}),
        SKL_Note(null, "Clear", no_opt) //LOCALE.CANCEL
      ]
    }),
    SKL_Box_V(view, {
      className: "popup__btn-group popup__btn-group--confirm u-ai-center",
      kids: [
        SKL_SVG("header_save", {className: "mb-19"}),
        SKL_Note(null, "Save", yes_opt) //_L(_I.GOT_IT
      ]
    })
  ];


  const row_opt     = {className:"popup__btn-block popup__btn-block--small u-jc-sb", kids:buttons, justify:_a.center};
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
module.exports = __skl_save_clear_buttons;
