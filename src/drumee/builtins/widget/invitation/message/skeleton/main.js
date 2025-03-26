// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __skl_invitation_message
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __skl_invitation_message = function(_ui_) {
  const message = _ui_.model.get(_a.message) || "";
  // entry = 
  //   kind        : KIND.entry_text
  //   placeholder : LOCALE.MESSAGE
  //   className   : "#{_ui_.fig.family} #{_ui_.fig.family}__textarea mb-15"
  //   value       : message
  //   sys_pn      : "ref-message"
  //   name        : _a.message
  // entry = Skeletons.RichText 
  const entry = Skeletons.Entry({ 
    type        : _a.textarea,
    kind        : KIND.entry_text,
    placeholder : LOCALE.MESSAGE,
    className   : `${_ui_.fig.family} ${_ui_.fig.family}__textarea input mb-15`,
    value       : message,
    sys_pn      : "ref-message",
    name        : _a.message,
    content     : "",
    mode        : _a.interactive,
    service     : _e.submit
  }); 

  const button =  Skeletons.Box.X({
    service   : _e.update,
    uiHandler     : _ui_, 
    kids:[
      Skeletons.Note({
        content   : LOCALE.OK,
        className : `${_ui_.fig.family}__button dialog__button--submit`,
        service   : _e.update,
        uiHandler     : _ui_ 
      })
    ]
  });
  const a = [entry, button];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __skl_invitation_message;
