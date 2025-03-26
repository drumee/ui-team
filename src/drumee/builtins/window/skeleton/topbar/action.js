// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __topbar_action = function(_ui_) {
  const media = _ui_.mget(_a.media) || _ui_;
  const a = Skeletons.Box.X({
    debug : __filename,
    sys_pn     : "container-action",
    className  : `${_ui_.fig.group}-topbar__action--container`
  });
  //   kids : [
  //     Skeletons.Button.Svg
  //       ico        : "desktop__link"
  //       className  : "#{_ui_.fig.group}-topbar__action--icon"
  //       service    : "copy-link"
  //   ]
  // if media.mget(_a.area) is _a.personal
  //   a.kids = []
  return a;
};
module.exports = __topbar_action;
