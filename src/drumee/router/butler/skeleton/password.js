// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/router/skeleton/cop/login-entries
//   TYPE :
// ==================================================================== *

// ==================================
// Inputs definition for login pad
// ==================================

// ===========================================================
// _password
//
// ===========================================================
const _password = function(_ui_) {

  const options = {
    width   : 23,
    height  : 23,
    padding : 0
  };
  const ph = _ui_.mget(_a.placeholder) || LOCALE.PASS_PHRASE;

  const entry = Skeletons.Entry({
    name        : _a.password,
    type        : _a.password,
    className   : "input--inline input--small",
    placeholder : LOCALE.EMAIL_OR_IDENT,
    require     : "email_or_id",
    sys_pn      : "ref-password",
    mode : _a.interactive, 
    service     : 'check-password',
    require     : "any",
    uiHandler   : _ui_ 
  });

  const icon = Skeletons.Button.Icon({
    ico       : "desktop_hidepassword",
    className : `${_ui_.fig.family}__icon show-password`,
    service   : "show-password",
    uiHandler : _ui_,
    state     : 1
  }, options); 

  const reminder = Skeletons.Note({
    content   : ph,
    className : `${_ui_.fig.family}__label ph-reminder mb-26`,
    sys_pn    : "reminder",
    uiHandler : _ui_ 
  });

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__container-input mb-20`,
    kids        : [entry, icon, reminder]
  });
  return a;
};
module.exports = _password;
