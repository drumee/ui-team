// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/menu/skeleton/horizontal
//   TYPE : 
// ==================================================================== *

// ===========================

// ===========================================================
// __skl_menu_horizontal
//
// @param [Object] view
// @param [Object] opt
//
// @return [Object] 
//
// ===========================================================
const __skl_menu_horizontal = function(view, opt) {
  const a = [
    SKL_Box_H(view,
    {
      handler   : {
        ui      : view
      },
      className : "menu-trigger",
      sys_pn : _a.trigger,
      kidsOpt: {
        handler   : {
          ui      : view
        }
      },
      kids:[
        SKL_SVG_LABEL("toolbox_t-letter"),
        SKL_Note(_a.title, LOCALE.TITLE)
      ]
    }),
    SKL_Box_V(view,
    {
      wrapper : 1,
      className : "menu-items",
      sys_pn : _a.items
    })
  ];
  return a;
};
module.exports = __skl_menu_horizontal;