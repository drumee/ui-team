// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-account-change-email-msg
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __modal_account_change_email_msg
//
// @param [Object] manager
//
// @return [Object] 
//
// ===========================================================

const __modal_account_change_email_msg = function(manager, email) {
  const close_btn_options = {
    width   : 42,
    height  : 42,
    padding : 17
  };
    
  const a = { 
    kind: KIND.box,
    flow: _a.vertical,
    className: "modal__inner account-modal py-40 px-90 u-jc-center u-ai-center",
    styleOpt: { 
      width: 570
    },
    kids: [
      SKL_SVG("cross", {
        className : "modal__close",
        service   : _e.cancel
      }, close_btn_options),
      SKL_Note(null, "Change acccount mail", {
        className: "account-modal__header mb-33 text-center"       
      }),
      SKL_Box_V(manager, {
        className: "u-ai-center text-center",
        kids: [
          SKL_Note(null, "For authentication you will receive an email on your new email address:", {
            className: "account-modal__label mb-24"   
          }),

          SKL_Note(null, email, {
            className: "account-modal__label account-modal__label--link mb-24 text-center"
          }),

          SKL_Note(null, "You should click on link aside to activate your new-email.", {
            className: "account-modal__label mb-34 text-center"   
          })
        ]
      }),
      SKL_Box_H(manager, {
        className: "",
        kids: [
          SKL_Note(null, "Close", {
            className: "content__btn",
            signal    : _e.ui.event,
            service   : "close-change-email-modal"
          })
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-account-change-email-msg'); }
  return a;
};
module.exports = __modal_account_change_email_msg;
