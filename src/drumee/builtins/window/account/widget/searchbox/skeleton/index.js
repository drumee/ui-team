// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
//
// @return [Object] 
//
// ===========================================================
const __account_searchbox_main = function(_ui_) {
  const size = _ui_.size || {};
  const search_box = {
    kind        : KIND.search,
    flow        : _a.x,
    className   : `${_ui_.fig.family}__input`,
    listClass   : "found-box",
    justify     : _a.left,
    sys_pn      : "ref-searchbox",
    handler     : {
      uiHandler     : _ui_
    },
    api         : _ui_.getApi(),
    signal      : _e.ui.event,
    service     : "items-found",
    vendorOpt   : {
      placeholder : _ui_.mget(_a.placeholder),
      mode : _a.interactive,
      preselect   : 1,
      name        : _a.name
    }
  };
  if (_ui_.mget(_a.preselect) === 0) { 
    delete search_box.vendorOpt.preselect;
  }

  const a = [
    Skeletons.Box.Y({
      className : `${_ui_.fig.family}__main ${_ui_.fig.name}__main`,
      kids: [search_box]
    }),
    Skeletons.Wrapper.Y({
      name : "tooltips",
      part      : _ui_,
      className : `${_ui_.fig.family}__tooltips`
    }),
    require("./results")(_ui_)
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __account_searchbox_main;
