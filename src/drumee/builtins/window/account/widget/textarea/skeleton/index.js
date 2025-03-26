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
  const entry = { 
    kind : 'entry_text',
    placeholder : LOCALE.ENTER_TEXT,
    className   : `${_ui_.fig.family} ${_ui_.fig.family}__textarea mb-15`,
    value       : message,
    sys_pn      : "ref-message",
    name        : _a.message
  };

  const button =  Skeletons.Box.X({
    service   : _e.update,
    uiHandler     : _ui_, 
    kids:[
      Skeletons.Note({
        content   : LOCALE.OK,
        //className : 'share-popup__modal-btn mt-10 mb-20'
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
