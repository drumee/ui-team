// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/team/skeleton/topbar/left.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_window_team_topbar = function(_ui_) {
  const pfx = `${_ui_.fig.family}-topbar`;
  const media = _ui_.mget(_a.media);

  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-topbar__action`,
    debug     : __filename,
    sys_pn    : "container-action",
    kids      : [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),
      require('./menu')(_ui_)
    ]});
  
  return a;
};

module.exports = __skl_window_team_topbar;
