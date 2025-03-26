// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/admin/name/skeleton/view
//   TYPE : 
// ==================================================================== *

// ===========================================================
const __hub_admin_name_view = function(manager) {  
  const edit_icon = { 
    width   : 20,
    height  : 20,
    padding : 3
  };
  const a = [    
    Skeletons.Note({
      content: manager.mget(_a.label),
      className: "label pr-6 mr-10 dots"
    }),
    Skeletons.Box.X({
      sys_pn: "wrapper-field",
      kids: [
        Skeletons.Note({
          content: manager.mget(_a.value),
          className: "value"
        })
      ]
    }),
    Skeletons.Box.X({
      sys_pn: "wrapper-cmd",
      kids: [
        Skeletons.Button.Icon({
          ico       : "desktop_information",
          className : "icon",
          uiHandler     : manager,
          service   : _e.view
        }, edit_icon)
      ]
    })
  ];
  return a; 
};
module.exports = __hub_admin_name_view;
