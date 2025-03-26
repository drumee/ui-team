const __skl_folder_main = function (_ui_) {

  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.family}__header ${_ui_.fig.group}__header`,
    kidsOpt: {
      radio: _a.on,
      uiHandler: _ui_
    },
    kids: [require('./top-bar')(_ui_)]
  });
  const a = require('window/skeleton/content/main')(_ui_, menu);
  return a;
};
module.exports = __skl_folder_main;
