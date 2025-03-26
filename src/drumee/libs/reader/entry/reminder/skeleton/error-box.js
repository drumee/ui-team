// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/router/skeleton/cop/login-tooltip
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __reminder_error
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __reminder_error = function(_ui_) {
  // pas_icon_options = 
  //   width   : 23
  //   height  : 23
  //   padding : 4.5

  // cross = SKL_SVG("cross", {
  //   className : "entry-form__icon"
    
  //   # bubble    : 1
  //   # state     : 0
  // }, pas_icon_options) 
  // cross = Skeletons.Button.Svg({
  //   ico       : "cross"
  //   className : "#{_ui_.fig.family}__icon error"
  //   service   : _e.clear
  //   ui        : _ui_
  //   state     : 1
  // }) 

  // a = Skeletons.Box.Y({
  //   className: "input-details"
  //   kidsOpt :
  //     active : 0
  //   kids:[cross]
  // })
  const a = Skeletons.Button.Svg({
    ico       : "cross",
    className : `${_ui_.fig.family}__icon error`,
    service   : _e.clear,
    uiHandler : _ui_,
    state     : 1
  }); 

  return a;
};
module.exports = __reminder_error;