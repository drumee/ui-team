// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/api/lib/b2b-signup/skeleton/success-message.coffee
//   TYPE : Skelton
// ==================================================================== *

const __welcome_b2b_signup_form = function(_ui_,message) {
  const formFig = _ui_.fig.family;

  const successMessage = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__row ${_ui_.fig.group}__success-msg-wrapper`,
    sys_pn    : "success-message-wrapper",
    kids:[
      Skeletons.Button.Svg({
        ico       : 'account_check',
        className : `${_ui_.fig.family}__info_wrapper-icon url-info`
      }),
        
      Skeletons.Note({
        className : `${_ui_.fig.group}__success-message`,
        sys_pn    : "success-message",
        content   : message || ""
      }) 
    ]});
  
  const form = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__success_wrapper`,
    kids:[
      successMessage
    ]});
          

  const a = Skeletons.Box.Y({
    debug : __filename,  
    className : `${_ui_.fig.family}__main`,
    kids:[
      form
    ]});
  return a;
};

module.exports = __welcome_b2b_signup_form; 
