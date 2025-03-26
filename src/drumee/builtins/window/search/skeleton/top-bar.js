// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/window/search/skeleton/top-bar
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __skl_window_search_topbar
//
// @param [Object] _ui_
//
// @return [Object]
//
// ===========================================================
const __skl_window_search_topbar = function(_ui_) {
  const figname = "topbar";
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.family}-${figname}__container u-jc-sb`,
    sys_pn    : "browser-top-bar",
    service   : _e.raise,
    debug     : __filename,
    kids : [
      require('window/skeleton/topbar/breadcrumbs')(_ui_),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}-${figname}__title u-ai-center`,
        kids: [
          Skeletons.Box.X({
            className: `${_ui_.fig.family}-${figname}__title name`,
            sys_pn: "topbar-name",
            kids: [Skeletons.Note(LOCALE.SEARCH_RESULTS)]})
        ]}),
      require('window/skeleton/topbar/control')(_ui_)
    ]});

  return a;
};
module.exports = __skl_window_search_topbar;
