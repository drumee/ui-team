// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-delete-contact
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __modal_delete_account
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================

const __modal_delete_account = function(view, opt) {
  // header_icon_options =
  //   height  : 14
  //   width   : 14
  //   padding : 0

  const close_btn_options = {
    width   : 22,
    height  : 22,
    padding : 7   
  };

  // resent_icon_options =
  //   width   : 10
  //   height  : 10
  //   padding : 0

  // approved_icon_options =
  //   width   : 30
  //   height  : 30
  //   padding : 4
  const email = opt.email || "";
  const a = {
    kind    : KIND.box,
    flow    : _a.vertical,
    kidsOpt : {
      mapName : _a.reader,
      signal  : _e.ui.event,
      handler : {
        uiHandler   : view
      }
    },
    className : "popup__inner popup__inner--small",//"modal__inner account-modal pt-34 pb-30 px-68 u-ai-center"
    kids    : [
      SKL_SVG("account_cross", {
        signal    : _e.ui.event,
        service   : "close-modal",
        className : "popup__close"
      }, close_btn_options),
      SKL_Note(null, "Delete contact?", {
        className: "popup__header"            
      }),
      SKL_Box_V(view, {
        kids: [
          SKL_Note(null, "You want to delete the following contact", {
            className: "popup__text popup__text--regular mb-6"            
          }),
          SKL_Box_H(view, {
            className: "u-jc-center u-ai-center",
            kids: [
              SKL_Note(null, `Contact Name (${email})`, {
                className: "popup__text popup__text--regular popup__text--link"            
              }),
              SKL_SVG("common_placeholder", {
                className: "ml-10"            
              })
            ]
          })

        ]
      }),
      SKL_Box_H(view, {
        className: "popup__btn-block u-jc-sb",
        kids: [
          SKL_Note(null, "Cancel", {
            className: "btn btn--regular",     
            signal: _e.ui.event,
            service: "close-modal"       
          }),
          SKL_Note(null, LOCALE.DELETE, {
            className: "btn btn--cancel",
            signal: _e.ui.event,
            service: "deleteContact",
            value : email
          })
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-delete-contact'); }  
  return a;
};
module.exports = __modal_delete_account;
