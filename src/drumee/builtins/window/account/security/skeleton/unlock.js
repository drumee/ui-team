// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
// __desk_skl_confirm_remove
//

//
// ===========================================================
const __desk_skl_confirm_remove = function(_ui_, message) {
  message = LOCALE.MSG_UNLOCK_SECURITY_SETTINGS;
  const pfx = 'modal';
  const password = { 
    kind        : KIND.entry_reminder,
    className   : `${_ui_.fig.group}-${pfx}__entry`,
    uiHandler       : _ui_,
    service     : _a.unlock, //_e.submit 
    type        : _a.password,
    placeholder : LOCALE.PASS_PHRASE,
    require     : "any",
    sys_pn      : "ref-pass",
    shower      : 1
  };

  const popup = Skeletons.Wrapper.Y({
    name      : "popup",
    className : `${_ui_.fig.family}__popup`,
    uiHandler     : _ui_
  }); 

  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.group}-${pfx}__main u-jc-center u-ai-center`,
    kids      : [
      Skeletons.Note(message, `${_ui_.fig.group}-${pfx}__title`),
      password,
      Skeletons.Box.X({
        justify:_a.center,
        className:`${_ui_.fig.group}-${pfx}__command u-jc-sb`,
        kids:[
          Skeletons.Note({
            className :'btn btn--regular mr-20',
            content   : LOCALE.CLOSE,
            href      : _K.module.desk,
            service   : "close-dialog",
            uiHandler     : _ui_
          }),
          
          Skeletons.Note({
            className :'btn btn--go ml-20',
            content   : LOCALE.UNLOCK,
            service   : _a.unlock,
            uiHandler     : _ui_
          }),
          
          popup
        ]})
    ]});
  return a;
};
module.exports = __desk_skl_confirm_remove;
