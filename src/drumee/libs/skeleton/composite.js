// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/composite
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_composite
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __skl_composite = function(view) {
  const innerClass = view.get(_a.innerClass) || _a.innerClass;
  const a = [{
    kind:KIND.box,
    flow:view.get(_a.listFlow),
    className:view.get(_a.listClass),
    sys_pn: "labelX",
    active : 0,
    kidsOpt : {
      className  : view.get(_a.itemsClass)
    },
    styleOpt: {
      width:_K.size.full,
      height:_a.auto
    },
    kids:[SKL_Note(_a.base, view.get(_a.label), {className:innerClass})]
  },{
    kind:KIND.box,
    flow:view.get(_a.listFlow),
    className:view.get(_a.listClass),
    sys_pn: _a.list,
    kidsOpt : {
      className  : view.get(_a.itemsClass)
    },
    styleOpt: {
      width:_K.size.full,
      height:_a.auto
    }
  }];
  return a;
};
module.exports = __skl_composite;