// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/site
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
  const innerClass = view.get(_a.innerClass) || _a.innerClass;
  const a = [{
    kind:KIND.box,
    flow:view.get(_a.listFlow),
    className:view.get(_a.listClass),
    sys_pn: _a.label,
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
    justify : _a.center,
    sys_pn: "site-menu",
    kidsOpt : {
      className  : view.get(_a.itemsClass)
    },
    styleOpt: {
      visibility : _a.hidden,
      width:_K.size.full,
      height:_a.auto
    }
  }];
  return a;
};
module.exports = __btn_box;