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
  const icon_opt = { 
    width   : 22,
    height  : 22,
    padding : 0
  };

  const icon_public = {
    width   : 24,
    height  : 24,
    padding : 0
  };

  const publish_opt     = {contentClass:_C.margin.auto, className:'btn btn--other', service: "publish-success"};
  const draft_opt      = {contentClass:_C.margin.auto, className:'btn btn--confirm', service: "draft-success"};

  if (yes_ext != null) {
    _.merge(yes_opt, yes_ext);
  }
  if (no_ext != null) {
    _.merge(no_opt, no_ext);
  }

  const buttons = [
    SKL_Box_V(view, {
      className: "popup__btn-group popup__btn-group--other u-ai-center",
      kids: [
        SKL_Box_V(view, {
          className: "popup__btn-group--save-icon public",
          kids: [
            SKL_SVG("desktop_public", {className: "mb-19"}, icon_public)
          ]
        }),
        SKL_Note(null, "Published on site", publish_opt) //LOCALE.CANCEL
      ]
    }),
    SKL_Box_V(view, {
      className: "popup__btn-group popup__btn-group--confirm u-ai-center",
      kids: [
        SKL_Box_V(view, {
          className: "popup__btn-group--save-icon",
          kids: [
            SKL_SVG("header_save", {className: "mb-19"}, icon_opt)
          ]
        }),        
        SKL_Note(null, "Saved as draft", draft_opt) //_L(_I.GOT_IT
      ]
    })
  ];
  const row_opt     = {className:"popup__btn-block u-jc-sb", kids:buttons};
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
