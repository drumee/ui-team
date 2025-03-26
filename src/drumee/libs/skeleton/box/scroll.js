// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/box/scroll
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_box_scroll
//
// @param [Object] view
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_box_scroll = function(view, ext, style) {
  ext       = ext  || {};
  var list      = list || [];
  const listClass = ext.listClass || _a.thread;
  const listStyle = ext.listStyle || {'min-height':400};
  const a = {
    kind      : KIND.,
    flow      : _a.vertical
  };
  _.extend(a, ext);
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = __skl_box_scroll;
