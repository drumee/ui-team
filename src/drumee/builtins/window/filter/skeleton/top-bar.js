
module.exports = function(_ui_) {
  const figname = "topbar";

  return Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container`,
    sys_pn    : "browser-top-bar",
    debug     : __filename,
    service   : _e.raise,
    kids : [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__title`,
        kids: [
          Skeletons.Box.X({
            className: `${_ui_.fig.family}__title text`,
            sys_pn: "ref-window-title",
            kids: [Skeletons.Note(LOCALE.PLZ_SELECT_FILE)]})
        ]}),
      require('window/skeleton/topbar/control')(_ui_)
    ]});
}
