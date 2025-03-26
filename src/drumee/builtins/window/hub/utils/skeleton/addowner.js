// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/addowner
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_addowner
//
// @param [Object] desk_ui
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
const __project_room_addowner = function(manager) {  
  const contacts_found = {
    kind        : KIND.list.stream, 
    flow        : _a.y,
    radiotoggle : _a.parent,
    className   : 'sharee-list my-5',
    sys_pn      : "contacts-found",
    styleOpt    : {
      width     : 260,
      height    : 190
    },
    vendorOpt   : {
      alwaysVisible : true,
      size      : "2px",
      opacity   : "1",
      color     : "#FA8540",
      distance  : "2px",    
      railColor : "#E5E5E5"
    }
  };
    // placeholder : SKL_Note(null, 'examplemail@mail.com')

  const search_box = {
    kind        : KIND.search,
    flow        : _a.x,
    className   : "input input--inline input--small share-popup__modal-input mt-10 ml-20",
    itemsOpt    : {
      kind      : 'media'
    },
    placeholder : 'Name or e-mail',
    listClass   : "found-box",
    justify     : _a.left,
    handler     : {
      uiHandler     : manager
    },
    api         : {
      service   : SERVICE.hub.show_contributors,
      hub_id    : manager.model.get(_a.hub_id)
    },
      // name      : "key"
      // page      : 1
    signal      : _e.ui.event,
    service     : "found-contacts",
    mode : _a.interactive,
    preselect   : 1,
    // styleOpt    : 
    //   width     : _K.size.full
    name        : "key"
  };

  const btn =  SKL_Note(_e.share, LOCALE.ADD, {
    className : 'share-popup__modal-btn',
    service   : "service "
  });

  const a = { 
    kind      : KIND.box,
    //className : "ml-20" #"project-room__modal-wrapper share-popup pt-16 pb-20 px-18"
    kids      : [
      search_box,
      // btn

      SKL_Box_V(manager, {
        sys_pn    : "contacts-found-block",
        name      : "hub-owner",
        className : 'share-popup__search share-popup__search--owner',
        wrapper   : 1,
        kids      : [
          SKL_Note(null, LOCALE.MEMBERS, {
            className: 'share-popup__search-label'
          }),
          contacts_found
        ]
      })
    ]
  };
    
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/addowner'); }
  return a;
};
module.exports = __project_room_addowner;
