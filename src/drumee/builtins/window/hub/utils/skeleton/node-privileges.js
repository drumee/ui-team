// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/project-room/skeleton/node-privileges
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __pr_node_privileges
//
// @param [Object] desk_ui
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
const __pr_node_privileges = function(manager, api) {  
  // _dbg 'add_shareeadd_shareeadd_sharee', manager.get(_a.height)


  let members;
  const close_modal = SKL_SVG("account_cross", {
    className : "share-popup__modal-close",
    service:  "close-popup"
  }, {
    width: 36,
    height: 36,
    padding: 12
  });

  const a = { 
    kind      : KIND.box,
    className : "project-room__modal-wrapper share-popup ",
    sys_pn    : "access-rooom",
    kids      : [
      close_modal,
      SKL_Box_V(manager, {
        className : 'share-popup__modal-inner pt-30 u-ai-center',
        kids: [
          SKL_Box_H(manager, {
            className: 'share-popup__modal-header u-ai-center',
            kids: [
              SKL_Note(null, LOCALE.SPECIFIC_ACCESS)
            ]
          }),
          SKL_Box_V(manager, {
            sys_pn : "share-list-contact",   
            className: 'share-popup__modal-content u-ai-center',
            kids: [
              SKL_Box_V(manager, {
                className: '',
                kidsOpt: {  
                  className: 'share-popup__modal-email mb-7'
                },
                sys_pn : "sharee-list",
                kids: [
                  (members = require('./members')(manager, api)),
                  SKL_Box_V(manager, {
                    className: "",
                    sys_pn: 'sharebox-options-modal'
                  })
                ]
              }),

              SKL_Box_V(manager, {
                sys_pn    : 'sharing-popup',
                className : 'share-popup__modal-extra w-100',
                kids      : [
                  SKL_SVG('desktop_plus', {
                    className : 'share-popup__modal-plus u-as-end mt-10 mr-14',
                    service   : "set-specific-permission"
                  }, {
                    width: 14,
                    height: 14,
                    padding: 3
                  })
                ]
              })
            ]
          })
        ]
      })      
    ]
  };
    
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/project-room/skeleton/node-privileges'); }
  return a;
};
module.exports = __pr_node_privileges;
