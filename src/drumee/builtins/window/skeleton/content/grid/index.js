const __media_skl_grid = function(_ui_) {
  const type   = _ui_.mget(_a.type);

  const opt = {       
    kind     : _a.media,
    type,   
    logicalParent : _ui_,   
    role  : _ui_.mget(_a.role) || '',
    uiHandler  : null
  };
  
  if (_ui_.mget(_a.itemsOpt)) {
    _.merge(opt, _ui_.mget(_a.itemsOpt));
  }
  
  const list = Skeletons.List.Smart({
    className   : `${_ui_.fig.group}__icons-list`,
    innerClass  : `${_ui_.fig.group}__icons-scroll`,
    sys_pn      : _a.list,
    flow        : _a.none,
    timer       : 2000,
    dataset     : {
      role    : _a.container,
    },
    spinnerWait : 1500,
    spinner     : true,
    itemsOpt    : opt,
    skip:{
      filename : /^\./
    },
    vendorOpt   : Preset.List.Orange_e,
    api         : _ui_.getCurrentApi
  });
  if(localStorage.getItem("showHidden")){
    delete list.skip;
  }
  const a = {
    kind      : KIND.box,
    debug     : __filename,
    flow      : _a.y,
    className : `${_ui_.fig.group}__icons-container`,
    kids      : [
      list
    ]
  };

  return a;
};

module.exports = __media_skl_grid;
