// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/room-admins
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_admins
//
// @param [Object] hub
// @return [Object] 
//
// ===========================================================
const __project_room_admins = function(hub, roomAdmins) {
  const admins_items = { 
    kind        : KIND.box,
    flow        : _a.vertical,
    sys_pn      : "room-admins-items",
    kids        : roomAdmins.arr
  };

  const admins_trigger = { 
    kind        : KIND.note,
    content     : roomAdmins.length,
    sys_pn      : "room-admins-number",
    className   : 'project-room__settings-input',
    styleOpt    : {
      width     : "auto"
    }
  };

  const admins_menu = {
    kind        : KIND.menu.topic,
    className   : 'project-room__settings-menu',
    flow        : _a.y,
    signal      : _e.ui.event,
    name        : "room-administrators-menu",
    service     : "room-administrators-menu",
    direction   : _a.down,
    shower      : 1, 
    trigger     : admins_trigger,
    items       : admins_items
  };

  const admin = roomAdmins.first || LOCALE.EDIT_ADMINISTRATORS;

  const a = { 
    kind      : KIND.box,
    flow      : _a.horizontal,
    styleOpt  : { 
      width   : _K.size.full
    },
    kids      : [  
      SKL_Note(null, admin, {
        className : 'project-room__settings-input',
        sys_pn    : "room-admins-first"
      }),
      SKL_Box_H(hub, {
        className: "mx-3",
        sys_pn    : "room-admins-menu",
        kids: [
          admins_menu
        ]
      })
    ]
  };
    
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/room-admins'); }
  return a;
};
module.exports = __project_room_admins;
