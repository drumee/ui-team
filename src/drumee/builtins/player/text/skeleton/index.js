const withFileSwitcher = require("builtins/player/widget/file-switcher/frame");

module.exports = function (_ui_) {
  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`,
    sys_pn    : "window-header",
    kidsOpt:{
      radio : _a.on,
      uiHandler    : _ui_
    },
    kids : [require('./topbar')(_ui_)]
  })
  return withFileSwitcher(_ui_, require('window/skeleton/content/main')(_ui_, menu))
}