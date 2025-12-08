const __skl_folder_main = function (_ui_) {
  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.family}__header ${_ui_.fig.group}__header`,
    kidsOpt: {
      radio: _a.on,
      uiHandler: _ui_,
    },
    kids: [require("./top-bar")(_ui_)],
  });
  // const a = Skeletons.Box.X({
  //   className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main w-800px `,

  //   kids: [require("window/skeleton/content/main")(_ui_, menu)],
  // });
  // const a = require('window/skeleton/content/main')(_ui_, menu);
  return require('window/skeleton/content/main')(_ui_, menu);
};
module.exports = __skl_folder_main;
