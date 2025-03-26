// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/window/project-room/skeleton/top-bar';
}

// ===========================================================
// __project_room_top_bar
//
// @param [Object] manager
//
// @return [Object]
//
// ===========================================================
const __project_room_top_bar = function(manager) {
  let _settings;
  const _privilege = manager._curNode.model.get(_a.privilege);
  
  const svg_options = { 
    width   : 12,
    height  : 12,
    padding : 0
  };

  const icon_options = { 
    width   : 30,
    height  : 30,
    padding : 9
  };

  const settings_options = { 
    width   : 21,
    height  : 21,
    padding : 4
  };

  let stylesWidth = manager.size.width;
  if (stylesWidth < manager.size.minWidth) {
    stylesWidth = manager.size.minWidth;
  }


  const hub_name = manager.model.get(_a.name);

  if (_privilege < 15) {
    _settings = SKL_SVG('desktop_information', {
      className : 'project-room__header-icon drive-popup__header-icon ml-15',
      service   : "user-hub-info"
    }, settings_options);
  } else { 
    _settings = SKL_SVG('desktop_sharebox_edit', {
      className : 'project-room__header-icon drive-popup__header-icon ml-15',
      service   : _e.settings
    }, settings_options);
  }


  const a = SKL_Box_H(manager, {
    className : "browser-top-bar u-jc-sb w-100",
    sys_pn    : "browser-top-bar",
    service   : _e.raise,
    kids : [
      //require('window/skeleton/topbar/breadcrumbs/wrapper')(manager)
      SKL_Box_H(manager, {
        className: 'drive-popup__header project-room__header u-ai-center',
        kids: [
          SKL_Box_H(manager, {
            sys_pn: "project-room-name",
            className: "drive-popup__name",
            kids: [
              SKL_Note(_e.raise, hub_name)
            ]
          }),
          _settings
        ]
      }),
      require('window/skeleton/topbar/control')(manager)
    ]
  });

  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __project_room_top_bar;
