// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/router/skeleton/cop/login-tooltip
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __login_help
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __login_help = function(manager) {
  const pas_icon_options = { 
    width   : 23,
    height  : 23,
    padding : 4.5
  };

  const cross = SKL_SVG("cross", {
    className : "entry-form__icon"
    // bubble    : 1
    // state     : 0
  }, pas_icon_options); 

  const a = Skeletons.Box.Y({
    className: "input-details",
    kidsOpt : {
      active : 0
    },
    kids:[cross]
  });
  return a;
};
module.exports = __login_help;