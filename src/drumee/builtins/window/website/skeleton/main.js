const __window_website_main = function(_ui_, size, icon) {

  const menu = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    sys_pn    : "window-header",
    kidsOpt: {
      radio : _a.on,
      uiHandler    : _ui_
    },
    kids : [require('window/skeleton/topbar/main')(_ui_, "desktop_settings")]});
  const a = require('window/skeleton/content/main')(_ui_, menu);
  a.debug = __filename;
  return a;
};
module.exports = __window_website_main;
