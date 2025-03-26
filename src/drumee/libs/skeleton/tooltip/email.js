// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : libs/skeleton/tooltip/email
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __email_tooltip
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __email_tooltip = function(manager) {
  const pas_icon_options = { 
    width   : 18,
    height  : 18,
    padding : 2
  };

  const cross = SKL_SVG("cross", {
    className : "entry-form__icon",
    bubble    : 1,
    state     : 0
  }, pas_icon_options); 

  const a = {
    kind:KIND.box,
    flow:_a.y,
    kidsOpt : {
      active : 0
    },
    handler : {
      ui    : manager
    },
    className: "input-details",
    kids:[
      cross
    ]
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/tooltip/email'); }
  return a;
};
module.exports = __email_tooltip;