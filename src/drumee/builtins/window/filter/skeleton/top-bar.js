// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __browser_top_bar
//
// @param [Object] _ui_
//
// @return [Object]
//
// ===========================================================
const __skl_folder_topbar = function(_ui_) {
  const name = _ui_.model.get(_a.filename);
  const figname = "topbar";

  const a = Skeletons.Box.X({
    // className : "browser-top-bar u-jc-sb"
    className : `${_ui_.fig.group}-${figname}__container`,
    // className : "#{_ui_.fig.group}-topbar__container u-jc-sb"
    sys_pn    : "browser-top-bar",
    debug     : __filename,
    service   : _e.raise,
    kids : [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),
      Skeletons.Box.X({
        //className: "#{_ui_.fig.group}__header-title u-ai-center"
        className: `${_ui_.fig.family}__title`,
        kids: [
          Skeletons.Box.X({
            className: `${_ui_.fig.family}__title text`,
            sys_pn: "ref-window-title",
            kids: [Skeletons.Note(LOCALE.PLZ_SELECT_FILE)]})
        ]}),
      require('window/skeleton/topbar/control')(_ui_)
    ]});

  return a;
};
module.exports = __skl_folder_topbar;
