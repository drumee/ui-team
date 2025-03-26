// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/router/skeleton/header
//   TYPE : 
// ==================================================================== *

let a = 1;

// ===========================================================
// __skl_header
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __skl_header = function (view) {
  const a = [
    Skeletons.ox.Y({ sys_pn: 'header_left' }),
    Skeletons.ox.Y({ sys_pn: 'header_center' }),
    Skeletons.ox.Y({ sys_pn: 'header_right' })
  ];
  return a;
};
module.exports = __skl_header;
