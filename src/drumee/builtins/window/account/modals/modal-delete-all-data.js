// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-delete-all-data
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __modal_delete_all_data
//
// @param [Object] manager
//
// @return [Object] 
//
// ===========================================================

const __modal_delete_all_data = function(manager) {
  const info_options = { 
    width   : 32,
    height  : 30,
    padding : 0
  };

  const a = [
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
      className: "u-ai-center",
      kids: [
        SKL_Note(null, "You want to close your account and to delete all your data in Drumee icluding:", {
          className: "popup__text popup__text--regular mb-10",  
          styleOpt: { 
            width : 340
          }          
        }),
        SKL_Box_V(manager, {
          className: "",
          kids: [
            SKL_Note(null, "all your personnal data", {
              className: "popup__text popup__text--regular popup__text--small popup__text--danger popup__list-item popup__list-item--danger"            
            }),
            SKL_Note(null, "all your websites", {
              className: "popup__text popup__text--regular popup__text--small popup__text--danger popup__list-item popup__list-item--danger"            
            }),
            SKL_Note(null, "all the files in your drive", {
              className: "popup__text popup__text--regular popup__text--small popup__text--danger popup__list-item popup__list-item--danger"            
            }),
            SKL_Note(null, "all contacts", {
              className: "popup__text popup__text--regular popup__text--small popup__text--danger popup__list-item popup__list-item--danger"            
            })
          ]
        })
      ]
    }),
    SKL_Box_H(manager, {
      className: "popup__btn-block u-jc-sb",
      kids: [
        SKL_Note(null, "Cancel", {
          className: "btn btn--regular",
          signal    : _e.open_modal,
          service   : "close-modal"
        }),
        SKL_Note(null, "I confirm", {
          className: "btn btn--cancel",
          signal    : _e.open_modal,
          service   : "code-request"
        })
      ]
    })
  ];

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/account/skeleton/modals/modal-delete-all-data'); }  
  return a;
};
module.exports = __modal_delete_all_data;
