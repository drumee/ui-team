// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-delete-request-pas
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __modal_delete_request_pas
//
// @param [Object] manager
//
// @return [Object] 
//
// ===========================================================

const __modal_delete_request_pas = function(manager) {
  // resent_icon_options =
  //   width   : 14
  //   height  : 14
  //   padding : 0

  const info_options = { 
    width   : 32,
    height  : 30,
    padding : 0
  };

  const a = { 
    kind    : KIND.form,
    flow    : _a.vertical,
    mapName : _a.reader,
    signal  : _e.ui.event,
    service : 'delete-account',
    handler : {
      uiHandler : manager
    },
    name    : 'delete-account',
    className: 'u-jc-sb u-ai-center',
    styleOpt : {
      height : _K.size.full
    },
    kids: [
      SKL_Box_H(manager, {
        className: "popup__header popup__header--danger u-ai-center ", //account-modal__header account-modal__header--delete u-ai-center"
        kids: [
          SKL_SVG('common_placeholder', {className:"mr-20"}, info_options),
          SKL_Note(null, "Delete data & drumee account?", {
            className: ""            
          })
        ]
      }),
      SKL_Box_V(manager, {
        kids: [
          SKL_Box_V(manager, {
            className: "mb-25",
            styleOpt: { 
              width : 410
            },          
            kids: [
              SKL_Note(null, "For safety reasons we have sent you an e-mail with a confirmation code.", {
                className: "popup__text popup__text--regular"  
              }),
              SKL_Note(null, "Before delete you should enter the code below.", {
                className: "popup__text popup__text--regular"      
              })
            ]
          }),
          SKL_Box_V(manager, {
            className: "u-ai-center",
            kids: [
              SKL_Entry(manager, '',{
                className : "input input--inline input--small",
                placeholder: "Enter code",
                name : 'code',
                require : 'any',
                mode : _a.interactive,
                api : {
                  service : SERVICE.drumate.validate_account_deletion_code
                },
                styleOpt: { 
                  width: 210
                }
              })
              // SKL_Box_H(manager, {
              //   className: "account-modal__input-block"
              //   styleOpt: 
              //     width: 260
              //   kids: [
              //     SKL_Box_V(manager, {
              //       kids: [
              //         SKL_Entry(manager, '',{
              //           className : "account-modal__input"
              //           placeholder: "Enter code"
              //           name : 'code'
              //           require : 'any'
              //           mode : _a.interactive
              //           api :
              //             service : SERVICE.drumate.validate_account_deletion_code
              //           styleOpt: 
              //             width: 210
              //         })
              //         SKL_Note(null, "Resend code", {
              //           className: "account-modal__resend"
              //           service : "resend-code"
              //           bubble  : 1
              //         })
              //       ]
              //     })
              //     SKL_Box_H("common_placeholder", {
              //       className : "ml-10"
              //       sys_pn : "code-validation-result"
              //     })
              //   ]
              // })
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
          SKL_Note(null, LOCALE.DELETE, {
            className: "btn btn--cancel",
            service   : _e.submit,
            styleOpt: { 
              "opacity": "0.8"
            }
          })
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-delete-request-pas'); }  
  return a;
};
module.exports = __modal_delete_request_pas;
