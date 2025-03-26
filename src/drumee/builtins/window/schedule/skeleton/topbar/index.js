// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_team_topbar = function(_ui_, icon) {

  // settings =  Skeletons.Button.Svg
  //   ico       : "editbox_cog"
  //   uiHandler : _ui_
  //   part      : _ui_
  //   sys_pn    : "ref-window-icon"
  //   className : "icon"
  //   service   : "show-settings"

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container ${_ui_.mget(_a.area)}`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    debug     : __filename,
    kids : [
      require("./left")(_ui_),
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title ${_ui_.fig.family}-${figname}__title`,
        kids: [
          Skeletons.Note({
            sys_pn    : "ref-window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : _a.name,
            content   : LOCALE.EXTERNAL_MEETING
          })
          //settings
        ]}),
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.group}__wrapper--context dialog__wrapper--context`,
        name      : "context",
        uiHandler   : _ui_,
        partHandler : _ui_
      }),

      require('window/skeleton/topbar/control')(_ui_)
    ]});
  return a;
};
module.exports = __skl_window_team_topbar;
