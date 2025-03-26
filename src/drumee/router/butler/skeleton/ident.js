const _ident = function(_ui_) {

  const entry = Skeletons.Entry({
    name        : _a.email,
    className   : "input--inline input--small",
    placeholder : LOCALE.EMAIL_OR_IDENT,
    require     : "email_or_id",
    sys_pn      : "ref-ident",
    preselect   : 1,
    error_box   : require("./tooltips")(_ui_),
    mode : _a.interactive, 
    service     : _e.check
    //ui          : _ui_ 
  });

  const reminder = Skeletons.Note({
    content   : LOCALE.EMAIL_OR_IDENT,
    className : `${_ui_.fig.family}__label ph-reminder mb-26`,
    sys_pn    : "reminder"
    //ui        : _ui_ 
  });
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__container-input mb-20 pb-12`,
    kids        : [entry, reminder]
  });
  return a;
};
module.exports = _ident;
