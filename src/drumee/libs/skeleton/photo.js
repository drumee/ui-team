// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/photo
//   TYPE :
// ==================================================================== *

// ===========================================================
// __skl_image_box
//
// @param [Object] view
// @param [Object] opt
//
// @return [Object]
//
// ===========================================================
const __skl_photo = function(view, opt) {
  let a = [
    SKL_Box_H(view,{
      wrapper : 1,
      className : "fill-up placeholder",
      sys_pn : _a.loader
    })
    // SKL_Box_V(view,{
    //   wrapper : 1
    //   className : "fill-up landing-box"
    //   sys_pn : "landing"
    // })
    // SKL_Box_V(view,{
    //   wrapper : 1
    //   className : "fill-up hover-box"
    //   sys_pn : 'hover'
    // })
    // SKL_Box_V(view,{
    //   wrapper : 1
    //   className : "fill-up selected-box"
    //   sys_pn : 'selected'
    // })
  ];
  if (_.isArray(view.model.get(_a.kids))) {
    a = a.concat(view.model.get(_a.kids));
  }

  return a;
};
module.exports = __skl_photo;
