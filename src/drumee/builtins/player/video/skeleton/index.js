// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_player_video = _ui_ => {
  const topbar = require("../../skeleton/topbar")(_ui_);

  const main = Skeletons.Box.Y({
    className : `${_ui_.fig.group}__container u-ai-center`,
    sys_pn    : _a.content
  });

  const a = Skeletons.Box.Y({
    debug      : __filename,
    className  : `${_ui_.fig.group}__main`,
    handler    : {
      part     : _ui_
    },
    kids:[topbar, main]});

  return a;
};

module.exports = __skl_player_video;
