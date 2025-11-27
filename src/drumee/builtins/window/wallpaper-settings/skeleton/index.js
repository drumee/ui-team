const { button } = require('../../../skeleton/toolkit/index');

function __skl_window_wallpaper_settings(_ui_) {
  const fig = `${_ui_.fig.family}`;

  const menu = Skeletons.Box.X({ 
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    sys_pn    : 'window-header',
    kidsOpt   : {
      radio     : _a.on,
      uiHandler : _ui_
    },
    kids      : [
      require('./top-bar').default(_ui_) 
    ]
  });
  
  const a = require('window/skeleton/content/main')(_ui_, menu);
  
  return a;
}

export default __skl_window_wallpaper_settings;

