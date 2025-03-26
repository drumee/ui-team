// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : /src/drumee/builtins/window/folder/skeleton/top-bar.coffee
//   TYPE : Skeleton
// ==================================================================== *

// ===========================================================
// __browser_top_bar
//
// @param [Object] _ui_
//
// @return [Object]
//
// ===========================================================
const __litechat_topbar = function(_ui_) {

  const name = Skeletons.Note({
    className : "name",
    sys_pn    : 'ref-window-name',
    content   : _ui_.mget(_a.filename) || _ui_.mget(_a.name)
  });
  
  const figname = 'topbar';
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header ${_ui_.mget(_a.mode)}`,    
    debug     : __filename,
    service   : _e.raise,
    dataset   : {
      group   : _ui_.fig.group,
      area    : _ui_.mget(_a.area)
    },
    kids      : [
      Skeletons.Box.X({
        className : `${_ui_.fig.group}-${figname}__container`,
        kids      : [
          Skeletons.Box.X({
            className : `${_ui_.fig.group}-${figname}__title`,
            sys_pn    : 'ref-window-title',
            kids      : [
              name
            ]})
        ]}),
      
      require('window/skeleton/topbar/control')(_ui_, 'sc')
    ]});

  return a;
};

module.exports = __litechat_topbar;
