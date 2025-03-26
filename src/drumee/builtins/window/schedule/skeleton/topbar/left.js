// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_team_topbar = function(_ui_) {
  const pfx = `${_ui_.fig.family}-topbar`;
  const media = _ui_.mget(_a.media);
  const a = Skeletons.Box.X({
    debug : __filename,
    sys_pn     : "container-action",
    className  : `${pfx}__container`,
    kids : [
      Skeletons.Button.Svg({
        ico       : "editbox_list-plus",
        service   : "create-meeting",
        className : `${_ui_.fig.family}-topbar__icon desktopgroup`
      })
    ]});
    // kids : [
    //   require('window/skeleton/topbar/breadcrumbs')(_ui_)
    //   require('./menu')(_ui_)
    // ]
  return a;
};
module.exports = __skl_window_team_topbar;
