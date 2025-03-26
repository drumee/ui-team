// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __window_topbar = function(_ui_) {
  const name = _ui_.model.get(_a.filename) || "???";
  let settings = {kind : KIND.wrapper};
  try { 
    if (_ui_.mget(_a.media).mget(_a.privilege) &_K.privilege.owner) {
      settings =  Skeletons.Button.Svg({
        ico       : "desktop_settings",
        uiHandler  : _ui_,
        partHandler: _ui_,
        sys_pn    : "ref-window-icon",
        className : "icon settings ml-15",
        service   : "show-settings"
      });
    }
  } catch (error) {}

  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}__header-container u-jc-sb`,
    sys_pn    : "browser-top-bar",
    service   : _e.raise,
    debug     : __filename,
    kids : [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),
      Skeletons.Box.X({
        className: `${_ui_.fig.group}__header u-ai-center`,
        kids: [
          Skeletons.Box.X({
            className: `${_ui_.fig.family}__header-title`,
            sys_pn: "ref-window-title",
            kids: [
              Skeletons.Note({
                sys_pn    : "ref-window-name",
                uiHandler     : _ui_,
                part      : _ui_,
                className :"name",
                content   : name
              }),     
              settings         
            ]})
        ]}),
      require('window/skeleton/topbar/control')(_ui_)
    ]});
  return a;
};
module.exports = __window_topbar;
