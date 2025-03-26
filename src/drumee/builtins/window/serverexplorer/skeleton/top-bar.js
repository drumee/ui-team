// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/skeleton/top-bar.coffee
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
const __skl_serverexplorer_topbar = function(_ui_) {
  // name = _ui_.mget(_a.filename) || _ui_.mget(_a.name)

  let createDir;
  let title = 'Import from Server';
  if (_ui_.type === _a.export) {
    title = 'Export to Server';
  }

  const name = Skeletons.Note({
    // className : "#{_ui_.fig.family}__title-name"
    className : "name",
    sys_pn    : 'ref-window-name',
    content   : title
  },
  
  // New folder Without menu option  
  // createDir = Skeletons.Button.Svg
  //   ico        : 'desktop_bigger'
  //   className  : "#{_ui_.fig.family}__icon create-directory link"
  //   sys_pn     : 'create-directory'
  //   service    : _e.mkdir

    (createDir = Skeletons.Box.X({
      className : `${_ui_.fig.family}__menu ${_ui_.fig.group}__menu topbar-menu`,
      kids      : [
        require('./menu')(_ui_)
      ]})));
    
  
  const figname = 'topbar';

  const a = Skeletons.Box.X({
    className : `${_ui_.fig.group}-${figname}__container u-jc-sb`,
    sys_pn    : 'browser-top-bar"',
    debug     : __filename,
    service   : _e.raise,
    dataset   : {
      group     : _ui_.fig.group
    },
    kids      : [
      require('./breadcrumbs')(_ui_),


      Skeletons.Box.X({
        className : `${_ui_.fig.group}-${figname}__container ${_ui_.mget(_a.area)}`,
        kids      : [
          Skeletons.Box.X({
            className : `${_ui_.fig.group}-${figname}__title`,
            sys_pn    : 'ref-window-title',
            kids      : [
              name,
              _ui_.mget(_a.type) === _a.export ?
                createDir : undefined
            ]})
        ]}),

      require('window/skeleton/topbar/control')(_ui_, "c"),
    ]});

  return a;
};

module.exports = __skl_serverexplorer_topbar;
