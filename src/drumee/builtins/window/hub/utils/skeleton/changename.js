// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/changename
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_change_name
//
// @param [Object] desk_ui
// @param [Object] cmd
//
// @return [Object] 
//
// ===========================================================
const __project_room_change_name = function(manager, hub_name) {
  const input = SKL_Entry(manager, '', {
    className : "project-room__settings-input",
    value     : hub_name,
    name      : "new_hub_name",
    active    : 1,
    preselect : 1
  });
  const a = { 
    kind      : KIND.form,
    flow      : _a.vertical,
    name      : 'hub-name',
    signal    : _e.ui.event,
    kids      : [input]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/changename'); }
  return a;
};
module.exports = __project_room_change_name;
