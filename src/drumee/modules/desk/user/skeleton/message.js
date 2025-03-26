// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/share-box/skeleton/outbound/message';
}

// ===========================================================
// __sb_message
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __sb_message = function(manager, opt) {
  const form_one = {  
    kind      : KIND.form,
    flow      : _a.y,
    name      : 'message',
    className : 'option__block option__block--message mb-10',
    signal    : _e.ui.event,
    service   : 'preset-message',
    interactive : 0,
    sys_pn    : 'preset-message-form',
    handler   : {
      uiHandler   : manager
    },
    kids      : [
      SKL_Entry(manager, null, {
        className   : "input input--inline input--thiner input--small option__input-text mt-10 mb-20",
        placeholder : LOCALE.ENTER_TEXT,
        name        : _a.message,
        value       : opt.message,
        type        : _a.textarea
      }),
      SKL_Note(_e.share, LOCALE.CLOSE, {
        className : 'share-popup__modal-btn mt-24',
        sys_pn    : "action-share",
        service   : _e.submit
      })
    ]
  };

  const a = {  
    kind      : KIND.box,
    flow      : _a.y,
    signal    : _e.ui.event,
    className : "",
    kids      : [
      form_one
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __sb_message;
