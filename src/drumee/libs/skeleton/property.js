// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/property
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_property
//
// @param [Object] view
// @param [Object] ext
//
// @return [Object] 
//
// ===========================================================
const __skl_property = function(view, ext) {
  const innerClass = view.get(_a.innerClass) || _a.innerClass;
  const a = [{
    kind:KIND.property,
    flow:view.get(_a.listFlow),
    className:view.get(_a.listClass),
    sys_pn: "label",
    active : 0,
    kidsOpt : {
      className  : view.get(_a.itemsClass)
    },
    styleOpt: {
      width:_K.size.full,
      height:_a.auto
    },
    kids:require('property/kids')(view, ext)
  }];
  return a;
};
module.exports = __skl_property;