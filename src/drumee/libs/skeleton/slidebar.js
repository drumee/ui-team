// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/slidebar
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_slidebar_input
//
// @param [Object] view
// @param [Object] text
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_slidebar_input = function(view, text, ext, style) {
  const target = {
    kind : KIND.slidebar,
    flow : _a.horizontal,
    value   : view.get(_a.value),
    signal: _e.ui.event,
    min     : 0,
    max     : 100,
    start   : view.get(_a.value) || 0,
    unit    : 'px',
    handler : {
      ui : view
    }
  };
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    target.styleOpt = target.styleOpt || {};
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __skl_slidebar_input;
