const __previewer_main = function(_ui_) {
  const topbar = require("../../skeleton/topbar")(_ui_);

  const main = Skeletons.Box.Y({
    className : `${_ui_.fig.group}__container ${_ui_.fig.family}__container`,
    sys_pn    : _a.content,
    kids : [
      require("./slider")(_ui_)
    ]
  });

  const a = Skeletons.Box.Y({
    debug      : __filename,
    className  : `${_ui_.fig.group}__main`,
    handler    : {
      part     : _ui_
    },
    styleOpt   : {
      width  : _K.size.full,
      height : _K.size.full,
      "min-width": 250,
      "min-height": 250
    },
    kids:[topbar, main]});
  return a;
};
module.exports = __previewer_main;
