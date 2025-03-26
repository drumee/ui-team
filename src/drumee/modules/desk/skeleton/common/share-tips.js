// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/share-box/message
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __desk_share_tips
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __desk_share_tips = function(manager, options) {
  const a = {  
    kind      : KIND.form,
    flow      : _a.vertical,
    name      : 'message',
    className : 'option__block option__block--message my-10',
    signal    : _e.ui.event,
    service   : 'share-message',
    sys_pn    : 'quick-share-option',
    uiHandler   : manager,
    kids      : [
      SKL_Entry(manager, null, {
        className   : "input input--inline input--thiner input--small option__input-text mt-10 mb-0",
        placeholder : LOCALE.YOUR_MESSAGE, //'your message'
        name        : _a.message,
        value       : options.message
        // mode : _a.interactive
        // bubble      : 1
        // errorClass  : 'input-details'
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/share-box/message'); }
  return a;
};
module.exports = __desk_share_tips;
