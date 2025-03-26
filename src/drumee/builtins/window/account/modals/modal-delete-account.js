// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-delete-account
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __modal_delete_account
//
// @param [Object] manager
//
// @return [Object] 
//
// ===========================================================

const __modal_delete_account = function(manager) {
  const close_btn_options = {
    width   : 48,
    height  : 48,
    padding : 16   
  };

  const info_options = { 
    width   : 32,
    height  : 30,
    padding : 0
  };

  const a = {
    kind: KIND.box,
    flow: _a.vertical,
    className: "popup__inner popup__inner--medium",//"modal__inner account-modal pt-40 pb-50 px-72 u-ai-center"
    styleOpt: {
      width   : 570
    },
    kids: [
      SKL_SVG("account_cross", {
        className : "popup__close",
        signal    : _e.open_modal,
        service   : "close-modal"
      }, close_btn_options),
      SKL_Box_V(manager, {
        sys_pn: "delete-account-modal-box",
        className: "u-jc-sb u-ai-center",
        styleOpt: { 
          height: _K.size.full
        },
        kids: [
          SKL_Box_H(manager, {
            className: "popup__header popup__header--danger u-ai-center ", //account-modal__header account-modal__header--delete u-ai-center"
            kids: [
              SKL_SVG('common_placeholder', {className:"mr-20"}, info_options),
              SKL_Note(null, LOCALE.Q_DELETE_ACCOUNT, {
                className: ""            
              })
            ]
          }),
          SKL_Box_V(manager, {
            className: "u-jc-center",
            kids: [
              SKL_Note(null, LOCALE.W_BEFORE_DELETE_ACCOUNT, {
                className: "popup__text popup__text--regular mb-20",  
                styleOpt: { 
                  width : 330
                }          
              }),
              SKL_Box_H(manager, {
                className: "u-jc-center",
                kids: [
                  SKL_Note(null, "Total data", {
                    className: "popup__text popup__text--regular mr-10"            
                  }),
                  SKL_Note(null, "67.3 GB", {
                    className: "popup__text popup__text--regular popup__text--link"            
                  })
                ]
              })
            ]
          }),
          SKL_Box_H(manager, {
            className : "u-jc-sb",
            styleOpt  : {
              width   : 450
            },
            kids: [
              SKL_Note(null, "Save data on my computer", {
                className: "btn btn--confirm btn--big",
                handler : {
                  uiHandler : manager
                },
                signal  : _e.ui.event,
                service : 'save-data'   
              }),
              SKL_Note(null, "Go to delete process", {
                className: "btn btn--cancel btn--big",
                signal: _e.open_modal,
                service: "confirm-delete"
              })
            ]
          })
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-delete-account'); }  
  return a;
};
module.exports = __modal_delete_account;