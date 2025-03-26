/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/accesslist
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __quick_share_box
//
// @param [Object] desk_ui
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
const __project_room_accesslist = function(manager, type, service) {  
  let header, submit;
  if (service == null) { service = "close-popup"; }
  if (type === "Administrators") {
    header = "Administrators";
    submit = "add-administrator-list";
    // service = "close-settings-popup"
  } else if (type === "Hub users") {
    header = LOCALE.ACCESS_PERMISSION;
    submit = "add-hubuser-list";
  } else {  
    header = LOCALE.ACCESS_PERMISSION;
    submit = "add-user-list";
  }
    // service = "close-popup"

  // _dbg 'add_shareeadd_shareeadd_sharee', manager.get(_a.height)

  const contacts_list = {
    kind        : KIND.list.stream, 
    flow        : _a.y,
    radiotoggle : _a.parent,
    className   : 'sharee-list my-5',
    sys_pn      : "access-list",
    styleOpt    : {
      width     : 290,
      height    : 0
    },//180 1402
    vendorOpt   : {
      alwaysVisible : true,
      size      : "2px",
      opacity   : "1",
      color     : "#FA8540",
      distance  : "2px",    
      railColor : "#E5E5E5"
    },
      //placeholder : SKL_Note(null, 'examplemail@mail.com')
    kidsOpt     : { 
      radio     : 'sharee-radio-group'
    }
  };
    // kids        : []

  const close_modal = SKL_SVG("account_cross", {
    className : "share-popup__modal-close",
    service
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
              SKL_Note(null, header)
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
                  contacts_list,
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
                    service   : submit
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
    
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/accesslist'); }
  return a;
};
module.exports = __project_room_accesslist;
