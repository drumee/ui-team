// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/router/skeleton/footer
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_footer
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __skl_footer = function (view) {
  const a = [
    Skeletons.ox.Y({ sys_pn: 'footer_left' }),
    Skeletons.ox.Y({ sys_pn: 'footer_center' }),
    Skeletons.ox.Y({ sys_pn: 'footer_right' })
  ];
  return a;
};
module.exports = __skl_footer;
