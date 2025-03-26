// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/box/nested
//   TYPE : 
// ==================================================================== *


// ===========================================================
// _exported
//
// @param [Object] view
// @param [Object] ext
//
// @return [Object] 
//
// ===========================================================
const _exported = function(view, ext) {
  const a = {
    kind     : KIND.box,
    flow       : _a.horizontal,
    kids : [{
      kind     : KIND.box,
      flow       : _a.both,
      handler    : {
        ui : view
      },
      className  : _C.full,
      sys_pn   : _a.content
    }]
  };
  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  return a;
};
module.exports = _exported;
