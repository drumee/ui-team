// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/owner
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_owner
//
// @param [Object] desk_ui
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
const __project_room_owner = function(manager, o) {  
  const close_modal = SKL_SVG("account_cross", {
    className : "share-popup__modal-close",
    service: "close-settings-popup"
  }, {
    width: 36,
    height: 36,
    padding: 12
  });
  const a = { 
    kind      : KIND.box,
    className : "project-room__modal-wrapper share-popup share-popup--owner pt-16 pb-20 px-18",
    sys_pn    : "owner-room",
    styleOpt  : { 
      width   : 290
    },
    kids      : [
      close_modal,
      SKL_Note(null, "LOCALE.OWNERS", {className: "project-room__access-header u-jc-center mb-14"}),
      SKL_Box_H(manager, {
        className: "u-jc-sb u-ai-center ml-20",
        kids: [
          SKL_Box_H(manager, {
            sys_pn: "owner-name",
            kids: [
              SKL_Note(null, `${o.firstname} ${o.lastname}`, {
                className: "project-room__access-item text-center mr-18",
                id   : o.id,
                email: o.email
              })
            ]
          }),
          SKL_SVG('desktop_plus', {
            className : 'share-popup__modal-plus ',
            service   : "open-add-owner"
          }, {
            width: 14,
            height: 14,
            padding: 3
          })
        ]
      }),
      SKL_Box_H(manager, {
        sys_pn  : 'owners-add'
      })
    ]
  };
    
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/owner'); }
  return a;
};
module.exports = __project_room_owner;
