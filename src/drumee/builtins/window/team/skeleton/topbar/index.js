const __skl_window_team_topbar = function(_ui_, icon) {
  let settings;
  const media = _ui_.mget(_a.media);
  const name = _ui_.model.get(_a.filename) || _ui_.model.get(_a.name) || "";
  if ((icon == null) || (_ui_.mget(_a.media) == null)) {
    settings = {kind : KIND.wrapper};
  } else {
    if (!media.isGranted(_K.permission.admin)) {
      icon = "desktop_info";
    }

    settings =  Skeletons.Button.Svg({
      ico       : "editbox_cog",
      uiHandler : _ui_,
      part      : _ui_,
      sys_pn    : "ref-window-icon",
      className : "icon",
      service   : "show-settings"
    });
  }

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container ${_ui_.mget(_a.area)}`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    debug     : __filename,
    kids : [
      require("./left")(_ui_),
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title`,
        kids: [
          Skeletons.Note({
            sys_pn    : "ref-window-name",
            uiHandler : _ui_,
            partHandler : _ui_,
            className : _a.name,
            content   : name
          }),
          settings
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
