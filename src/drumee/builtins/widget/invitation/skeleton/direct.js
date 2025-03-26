// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/skeleton/main
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
//
// ===========================================================
const __invitation_direct = function(_ui_) {
  let close;
  if (_ui_.mget('closeButton')) {
    close = Preset.Button.Close(_ui_);
  }

  const a = [
    require("./recipients")(_ui_),
    require("./options-bar")(_ui_),
    Skeletons.Wrapper.Y({
      name      : "settings",
      part      : _ui_,
      className : `${_ui_.fig.family}__settings settings`
    }),
    _ui_.mget('action_bar') ?
      require("./actions-bar")(_ui_) : undefined
  ];
  if (close) {
    a.unshift(close); 
  }
  return a;
};
module.exports = __invitation_direct;
