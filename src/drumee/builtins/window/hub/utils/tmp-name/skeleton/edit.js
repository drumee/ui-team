// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/admin/name/skeleton/name
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __hub_admin_name_edit
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __hub_admin_name_edit = function(manager) {  
  const edit_icon = { 
    width   : 20,
    height  : 20,
    padding : 3
  };
  const a = [    
    Skeletons.Note({
      content: manager.mget(_a.label),
      className: `${manager.fig.family}__settings-label pr-6 mr-10 dots`
    }),
    Skeletons.Box.X({
      sys_pn: "wrapper-field",
      kids: [
        Skeletons.Note({
          content: manager.mget(_a.value),
          className: `${manager.fig.family}__settings-input`
        })
      ]
    }),
    Skeletons.Box.X({
      sys_pn: "wrapper-cmd",
      kids: [
        Skeletons.Button.Icon({
          ico     : "desktop_sharebox_edit",
          cn      : `${manager.fig.family}__settings-edit--btn`,
          uiHandler   : manager,
          service : _e.edit
        }, edit_icon)
      ]
    })
  ];
  return a; 
};
module.exports = __hub_admin_name_edit;
