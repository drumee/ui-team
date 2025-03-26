// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/confirm
//   TYPE : 
// ==================================================================== *

// ==================================================================== *
// ======================================================
//
// ======================================================

// ===========================================================
// __skl_confirm
//
// @param [Object] view
// @param [Object] label
// @param [Object] question
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_confirm = function(view, label, question, ext, style) {
  const target = {
    signal    : _e.ui.event,
    handler   : {
      ui      : view
    },
    kind      : KIND.confirm,
    label,
    question,
    anim      : require('utils/anim/slide-y')(),
    className : "popup",
    styleOpt: style
  };
      // "width" : width
      // "height": height
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __skl_confirm;
