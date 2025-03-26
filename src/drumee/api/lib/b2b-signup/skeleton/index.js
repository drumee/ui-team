// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __welcome_default = function(_ui_) {

  const body  = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__entry-container`,
    sys_pn    : "body-container",
    kids      : [
      require('./form')(_ui_)
      // require('./success-message')(_ui_,LOCALE.B2B_REGISTRATION_SUCCESS_MESSAGE)
    ]});


  const a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${_ui_.fig.family}__main`,
    kids      :[body]});
  return a;
};
module.exports = __welcome_default;
