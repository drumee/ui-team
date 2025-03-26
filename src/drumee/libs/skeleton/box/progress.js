// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/box/progress
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_progess
//
// @param [Object] view
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_progess = function(view, ext, style) {
  const a = {
    kind     : KIND.box,
    flow       : _a.vertical,
    handler  : {
      ui     : view
    },
    styleOpt: {
      position: _a.absolute,
      left: "300px",
      "z-index": 300
    },
    sys_pn: "progress"
  };
  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = __skl_progess;
