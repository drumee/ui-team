// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/window/project-room/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __project_room_main
//
// @param [Object] manager
// @param [Object] size
// @param [Object] icon
//
// @return [Object] 
//
// ===========================================================
const __project_room_main = function(manager) {
  const menu = Skeletons.Box.X({
    cn : "drive-popup__bar--special drive-popup__bar--project-room",
    kidsOpt: {
      radio : _a.on,
      handler    : {
        uiHandler    : manager
      }
    },
    kids : [require('./top-bar')(manager)]
  });
  const a = require('window/skeleton/content/main')(manager, menu);
  a.debug = __filename;
  return a;
};
module.exports = __project_room_main;
