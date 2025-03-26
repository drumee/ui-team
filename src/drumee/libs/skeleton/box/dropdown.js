// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/box/dropdown
//   TYPE : 
// ==================================================================== *

// ============================================
//
// ============================================

// ===========================================================
// __skl_box_dropdown
//
// @param [Object] view
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_box_dropdown = function(view, ext, style) {
  const list = SKL_Box_V(view,
    {sys_pn : _a.list},
    {overflow:"visible", width:_a.auto, height:_a.auto});
  const a = {
    kind:KIND.box,
    flow:_a.vertical,
    kidsOpt: {
      signal       : _e.ui.event,
      handler    : {
        ui       : view
      },
      flow       : _a.none
    },
    //kids:[SKL_Note("dropdown", label, ext, style), list]
    kids:[SKL_Btn_Toggle("dropdown", ext, style), list]
  };
  return a;
};
module.exports = __skl_box_dropdown;