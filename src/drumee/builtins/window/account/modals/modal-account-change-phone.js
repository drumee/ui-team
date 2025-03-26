// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-account-change-phone
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __modal_account_change_phone
//
// @param [Object] manager
//
// @return [Object] 
//
// ===========================================================

const __modal_account_change_phone = function(manager) {
  const close_btn_options = {
    width   : 48,
    height  : 48,
    padding : 16
  };

  const a = { 
    kind    : KIND.form,
    flow    : _a.vertical,
    mapName : _a.reader,
    signal  : _e.ui.event,
    service : 'change-phone',
    handler : {
      uiHandler : manager
    },
    name    : 'change-phone',
    className: "popup__inner popup__inner--medium", //modal__inner account-modal pt-40 pb-50 px-115 u-jc-center u-ai-center"
    kids: [
      SKL_SVG("account_cross", {
        className : "popup__close", //modal__close"
        service   : _e.cancel
      }, close_btn_options),

      SKL_Note(null, "Change account phone number", {
        className: "popup__header" //account-modal__header text-center mb-50"  
      }),
      SKL_Box_V(manager, {
        className: "u-ai-center",
        sys_pn: "change-phone-modal-box",
        kids: [
          SKL_Entry_Text(manager, '',{
            className : "input input--inline input--small mb-10",
            placeholder: "Enter password",
            name : _a.password,
            type : _a.password,
            require : 'any',
            styleOpt: { 
              width: 220
            }
          }),
          // SKL_Box_V(manager, {
          //   # className: "account-modal__input-block mb-20"
          //   kids: [
          //   ]
          // })
          SKL_Entry_Text(manager, '',{
            className : "input input--inline input--small mb-10", //"account-modal__input"
            placeholder: "New phone number",
            name : _a.phone,
            require : _a.phone,
            styleOpt: { 
              width: 220
            }
          }),

          // SKL_Box_V(manager, {
          //   # className: "account-modal__input-block mb-20"
          //   kids: [
          //   ]
          // })
          SKL_Entry_Text(manager, '',{
            className : "input input--inline input--small", //"account-modal__input"
            placeholder: "Confirm new phone number",
            name : 'confirmPhone',
            require : _a.phone,
            styleOpt: { 
              width: 220
            }
          }),
          SKL_Box_V(manager, {
            className: "account-modal__input-block mb-20",
            kids: [
              
            ]
          })
        ]
      }),

      SKL_Box_H(manager, {
        className: "popup__btn-block u-jc-sb",
        kids: [
          SKL_Note(null, "Cancel", {
            className: "btn btn--regular",
            service: _e.cancel
          }),
          SKL_Note(null, "Ok", {
            className: "btn btn--confirm",
            service   : _e.submit
          })
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-account-change-phone'); }
  return a;
};
module.exports = __modal_account_change_phone;
