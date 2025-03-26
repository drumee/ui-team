// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/button/base
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __btn_box
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __btn_box = function(view) {
  const items_box = {
    kind:KIND.box,
    flow:view.get(_a.listFlow),
    className:view.get(_a.listClass),
    sys_pn: _a.list,
    kidsOpt : {
      handler : {
        ui    : view
      },
      className  : view.get(_a.itemsClass)
    },
    styleOpt: {
      width:_K.size.full,
      height:_a.auto
    }
  };
  const innerClass = view.get(_a.innerClass) || _a.innerClass;
  return [SKL_Note(_a.base, view.get(_a.label), {className:innerClass}), items_box];
};
module.exports = __btn_box;