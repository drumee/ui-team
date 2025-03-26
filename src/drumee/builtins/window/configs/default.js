// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : builins/window/addressbook/skeleton/index
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_default = function(key) {
  
  const a = { 
    offsetY      : 80,
    marginY      : 10,
    marginX      : 10,
    iconWidth    : 125,
    iconHeight   : 125,
    topbarHeight : 42,
    imagePlayer : {
      width     : 850,
      height    : 620
    }
  };
  if (_.isEmpty(key)) {
    return a; 
  }
  return a[key] || 0;
};

module.exports = __skl_window_default;
