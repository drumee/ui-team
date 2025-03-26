// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/api/lib/b2b-signup/skeleton/form.coffee
//   TYPE : Skelton
// ==================================================================== *

const __welcome_b2b_signup_form = function(_ui_) {
  const formFig = _ui_.fig.family;
  const emailValidators = [
    {
      reason: LOCALE.ENTER_VALID_EMAIL, 
      comply: Validator.email
    },
    {
      reason: LOCALE.EMAIL_REQUIRED, 
      comply: Validator.require
    }
  ];

  const emailIcon = Skeletons.Button.Svg({
    ico       : 'email',
    className : `${formFig}__icon input-icon-prefix`
  });

  const email = Skeletons.Box.X({
    className : `${formFig}_email_wrapper row-wrapper input-wrapper`,
    kids: [
      
      Skeletons.EntryBox({
        className     : `${formFig}__entry email with-icon`,
        sys_pn        : 'ref-email',
        formItem      : 'email',
        placeholder   : LOCALE.EMAIL,//'email'
        require       : _a.email,
        mode          : _a.commit,
        interactive   : 1,
        preselect     : 1,
        service       : _e.submit,
        uiHandler     : [_ui_],
        errorHandler  : [_ui_],
        validators    : emailValidators,
        showError     : false,
        prefix        : emailIcon
      })
    ]});

  const compIcon =  Skeletons.Button.Svg({
    ico       : 'company',
    className : `${formFig}__icon input-icon-prefix`
  });

  const companyName = Skeletons.Box.X({
    className : `${formFig}_company_wrapper row-wrapper input-wrapper`,
    kids: [
      Skeletons.EntryBox({
        className     : `${formFig}__entry with-icon`,
        formItem      : 'name',
        sys_pn        : 'ref-name',
        placeholder   : LOCALE.COMPANY_NAME,
        uiHandler     : _ui_,
        prefix        : compIcon,
        errorHandler  : [_ui_],
        validators    : [
          {
            reason: LOCALE.COMPANY_NAME_REQUIRED, 
            comply: Validator.require 
          }
        ]})
    ]});

  const formElements = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__form_element_wrapper`,
    kids:[
      companyName,
      email
    ]});

  const button = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__form_button_wrapper`,
    sys_pn    : "go-button-wrapper",
    kids:[
      Skeletons.Box.X({
        className : `${formFig}_go_btn_wrapper row-wrapper action-wrapper`,
        kids: [
          Skeletons.Note({
            className : `${formFig}_go_btn row-wrapper action-btn`,
            service: 'b2b-signup-submit',
            content: LOCALE.GO
          })  
        ]})
    ]});

  const errorMessage = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__row ${_ui_.fig.group}__error-wrapper`,
    sys_pn    : "error-message-wrapper",
    dataset   :{
      state : _a.closed
    },
    kids:[
      Skeletons.Note({
        className : `${_ui_.fig.group}__error-message`,
        sys_pn    : "error-message",
        content   : ""        
      })
    ]});
  
  const form = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__form_wrapper`,
    kids:[
      formElements,
      button,
      errorMessage
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
