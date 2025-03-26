// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : libs/skeleton/tooltip/passphrase
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __passphrase_tooltip
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __passphrase_tooltip = function(manager) {
  const cross_options = {
    height  : 40,
    width   : 30,
    padding : "15px 10px"
  };

  const cross = SKL_SVG("account_cross", {
    className: "popup__close"
    // service  : _e.close
    // name     : _a.context
  }, cross_options); 

  const pas_cross_options = { 
    width   : 18,
    height  : 18,
    padding : 2
  };

  const pass_cross = SKL_SVG("cross", {
    className : "entry-form__icon"
  }, pas_cross_options); 

  const pas_error_text = { 
    kind      : KIND.box,
    flow      : _a.vertical,
    className : "entry-form__tooltip-text entry-form__tooltip-text--danger pt-13 px-14 pb-10",
    styleOpt  : {
      width   : 150
    },
    kids      : [
      SKL_Note(null, "minimum 12 characters"),
      SKL_Note(null, "minimum 1 space")
    ]
  };

  const a = { 
    kind        : KIND.menu.topic,
    className   : "entry-form__tooltip input-details",
    flow        : _a.y,
    opening     : _e.click,
    trigger     : pass_cross,
    items       : pas_error_text
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/tooltip/passphrase'); }
  return a;
};
module.exports = __passphrase_tooltip;