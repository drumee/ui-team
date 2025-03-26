// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/skeleton/main
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
//
// @return [Object] 
//
// ===========================================================
const __invitation_mini = function(_ui_) {
  // opt = _ui_.resultItem || {}
  // opt.role = _a.selection 
  const searchbox  = { 
    kind          : 'invitation_search',
    contactItem   : _ui_.resultItem,
    no_label      : 1,
    debug         : __filename,
    signal        : _e.ui.event,
    service       : _e.update,
    preselect     : _ui_.mget(_a.preselect),
    uiHandler     : [_ui_]
  };
  const a = [
    searchbox,
    require("./recipients")(_ui_),
    require("./options-bar")(_ui_),
    Skeletons.Wrapper.Y({
      name      : "settings",
      part      : _ui_,
      className : `${_ui_.fig.family}__settings settings`
    })
  ];
  return a;
};
module.exports = __invitation_mini;
