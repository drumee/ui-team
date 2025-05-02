/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
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
const __skl_folder_topbar = function(_ui_) {
  let name = _ui_.mget(_a.filename) || _ui_.mget(_a.name);

  const info = Skeletons.Button.Svg({
    ico       : 'info',
    // className : "#{_ui_.fig.family}__icon-info"
    className : "icon",
    service   : _a.info,
    uiHandler : [_ui_]});
  
  name = Skeletons.Note({
    // className : "#{_ui_.fig.family}__title-name"
    className : "name",
    sys_pn    : 'ref-window-name',
    content   : name
  });
  
  let downloadIcon = '';
  if (Visitor.parseModule().includes(_a.dmz)) {
    if (__guard__(_ui_.mget('desk'), x => x.havePermission(_K.permission.download))) { //for dmz folder download icons
      downloadIcon = Skeletons.Button.Svg({
        ico        : 'download',
        className  : `${_ui_.fig.family}__icon download link`,
        sys_pn     : 'download-button',
        service    : _e.download,
        token      : _ui_.mget(_a.token) || ''
      });
    }
  }
  
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
      require('window/skeleton/topbar/breadcrumbs')(_ui_),

      downloadIcon,

      Skeletons.Box.X({
        className : `${_ui_.fig.group}-${figname}__container ${_ui_.mget(_a.area)}`,
        kids      : [
          Skeletons.Box.X({
            className : `${_ui_.fig.group}-${figname}__title`,
            sys_pn    : 'ref-window-title',
            kids      : [
              name,
              info
            ]})
        ]}),
      
      Skeletons.Wrapper.Y({ 
        className : `${_ui_.fig.family}__wrapper-info`,
        name      : 'info',
        dataset   : {
          state : _a.closed
        }
      }),
      
      require('window/skeleton/topbar/control')(_ui_)
    ]});

  return a;
};

module.exports = __skl_folder_topbar;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}