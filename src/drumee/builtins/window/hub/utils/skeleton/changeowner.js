// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/changeowner
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_change_owner
//
// @param [Object] desk_ui
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
const __project_room_change_owner = function(manager, name) {
  const icon_options = { 
    width   : 14,
    height  : 14,
    padding : 0
  };

  const delete_options = { 
    width   : 14,
    height  : 14,
    padding : 1
  };

  const a = { 
    kind      : KIND.box,
    flow      : _a.vertical,
    kids      : [
      SKL_Note(null, "LOCALE.WAITING_FOR_CONFIRMATION", {className: "project-room__access-preheader"}),
      SKL_Box_H(manager, {
        className: "u-ai-center u-jc-sb project-room__access-additem",
        kids: [
          SKL_SVG('desktop_waiting', {className: 'mx-12 project-room__access-loading'}, icon_options),
          SKL_Note(null, name, {className: "project-room__access-new pl-38 pr-34"}),
          SKL_SVG('desktop_delete', {className: 'project-room__access-delete mr-20'}, delete_options)
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/changeowner'); }
  return a;
};
module.exports = __project_room_change_owner;
