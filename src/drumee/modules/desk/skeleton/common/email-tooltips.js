// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
if (__BUILD__ === 'dev') {
  const __dbg_path = 'builtins/widget/recipient/skeleton/email-tooltips';
}


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

  const a = Skeletons.Box.X({
    kidsOpt : {
      active : 0
    },
    handler : {
      uiHandler : manager
    },
    className: "input-details p-5",
    service  : "close-tooltips",
    kids:[
      SKL_Note(null, "Invalid email adress"),
      cross
    ],
    styleOpt : {
      background : "white"
    }
  });

  return a;
};
module.exports = __email_tooltip;