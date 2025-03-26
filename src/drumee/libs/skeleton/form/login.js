// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/form/login
//   TYPE :
// ==================================================================== *

// ==================================
// Inputs definition for login pad
// ==================================

// ===========================================================
// __skl_form_login
//
// ===========================================================
const __skl_form_login = function(manager) {
  const pas_icon_options = { 
    width   : 16,
    height  : 16,
    padding : 0
  };

  const check_options = { 
    width   : 80,
    height  : 14,
    padding : 0
  };

  const pas_input = {   
    name        : _a.password,
    className   : "entry-form__input mb-12", //"flow-h"
    kind        : KIND.entry,
    type        : _a.password,
    on_enter    : _e.submit,
    placeholder : LOCALE.PASSWORD,
    require     : "any"
  };
  
  const pas_footer = { 
    kind      : KIND.box,
    flow      : _a.horizontal,
    className : "u-jc-sb", 
    kids      : [
      SKL_SVG_LABEL("account_check", {
        label: "Remember me",
        className: "entry-form__link entry-form__link--checkbox u-jc-start",
        state: 0
      }, check_options),
      SKL_Note(null, "Forgot password?", {className: "entry-form__link"})
    ]
  };

  const pas_icon = SKL_SVG("backoffice_preview", {className: "entry-form__icon"}, pas_icon_options); 
    
  const a = [{
    name        : _a.ident,
    className   : "entry-form__input mb-12", // "flow-h"
    kind        : KIND.entry,
    placeholder : "Email",//LOCALE.USERNAME,empty
    require     : "email_or_id",
    error_box   : require("./login-help")
  },{
    kind        : KIND.box,
    flow        : _a.vertical,
    className   : "entry-from__input-block",
    kids        : [
      pas_input,
      pas_icon,
      pas_footer
    ]
  }];
  return a;
};
module.exports = __skl_form_login;
