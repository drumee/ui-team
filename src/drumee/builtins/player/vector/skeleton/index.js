// ==================================================================== *
//   Copyright Xialia.com  2011-201ç
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __vector_player = function(_ui_) {
  const topbar = require("../../skeleton/topbar")(_ui_);


  const main = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__container u-ai-center`,
    sys_pn    : _a.content
  });

  const a = Skeletons.Box.Y({
    debug      : __filename,
    className  : `${_ui_.fig.family}__main`,
    handler    : {
      part     : _ui_
    },
    kids:[topbar, main]});

  return a;
};
module.exports = __vector_player;
