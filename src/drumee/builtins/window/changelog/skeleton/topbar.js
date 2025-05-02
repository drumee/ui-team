const __skl_folder_topbar = function(_ui_, label) {
  label = label || LOCALE.UNSYNCED_FILES;

  const info = Skeletons.Button.Svg({
    ico       : 'info',
    className : "icon",
    service   : _a.info,
    uiHandler : [_ui_]});
  
  let name = Skeletons.Note({
    className : "name",
    sys_pn    : 'ref-window-name',
    content   : label
  });
  
  
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
            
      require('window/skeleton/topbar/control')(_ui_)
    ]});

  return a;
};

module.exports = __skl_folder_topbar;
