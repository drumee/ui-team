// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/search/skeleton/main.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_window_search_main = function(_ui_) {

  const menu = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    debug     : __filename,
    kidsOpt : {
      radio     : _a.on,
      uiHandler : _ui_
    },
    kids : [require('./top-bar')(_ui_)]
  });
  const a = require('window/skeleton/content/main')(_ui_, menu);
  return a;
};

module.exports = __skl_window_search_main;