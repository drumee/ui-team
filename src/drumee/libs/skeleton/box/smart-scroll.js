// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/box/smart-scroll
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_smart_scroll
//
// @param [Object] view
// @param [Object] list
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_smart_scroll = function(view, list, ext, style) {
  ext       = ext  || {};
  list      = list || [];
  const {
    listStyle
  } = ext;
  const kidsOpt = {
    signal: _e.ui.event,
    handler    : {
      ui       : view
    }
  };
  const a = {
    kind      : KIND.box,
    flow      : _a.vertical,
    kids     :[{
      kind   : KIND.box,
      className : "outer-scroll",
      kids:[SKL_Box_V(view, {kidsOpt, className:_a.thread, kids:list}, listStyle)]
    }]
  };
  _.extend(a, ext);
  if (_.isObject(style)) {
    a.styleOpt = a.styleOpt || {};
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = __skl_smart_scroll;
