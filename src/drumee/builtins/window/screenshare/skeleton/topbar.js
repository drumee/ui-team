// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __window_conference_topbar = function(_ui_, name) {
  const media = _ui_.mget(_a.media);
  name = name || _ui_.origin_name;

  name = name.printf(LOCALE.X_SCREEN);


  const figname = "topbar";
  const actions = [];

  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    debug     : __filename,
    kids : [
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title`,
        kids: [
          Skeletons.Note({
            sys_pn    : "window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : "name",
            content   : name
          })
          //settings
        ]}),
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__wrapper--context dialog__wrapper--context`,
        name      : "context",
        uiHandler   : _ui_,
        partHandler : _ui_
      }),

      require('window/skeleton/topbar/control')(_ui_,'fs')
    ]});
  
  return a;
};
module.exports = __window_conference_topbar;
