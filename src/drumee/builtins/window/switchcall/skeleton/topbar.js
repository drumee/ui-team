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
    className : `${_ui_.fig.family}-${figname}__container`,
    service   : _e.raise,
    debug     : __filename,
    sys_pn    : "topbar",
    kids : [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}-${figname}__title u-ai-center`,
        kids: [
          Skeletons.Box.X({
            className: `${_ui_.fig.family}-${figname}__title name`,
            kids: [Skeletons.Note(LOCALE.INCOMING_CALL)]})
        ]}),
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]});

  return a;
};
module.exports = __skl_window_search_topbar;
