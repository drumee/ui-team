
const __results = function(_ui_) {
  const list = {
    kind         : KIND.list.stream, 
    flow         : _a.y,
    radiotoggle  : _a.parent,
    className    : `${_ui_.fig.family}__list-results`,
    sys_pn       : "roll-results",
    vendorOpt    : Preset.List.Orange_e
  };
    
  const a = Skeletons.Box.Y({
    className    : `${_ui_.fig.family}__container-results`,
    sys_pn       : "wrapper-results",
    kids         : [list]
  });
  return [a]; 
};

const __results_list = function(_ui_, state) {
  const a = Skeletons.Box.Y({
    debug        : __filename,
    className    : `${_ui_.fig.family}__main`,
    sys_pn       : "ref-streams",
    kids         : __results(_ui_)
  },{
    height   : _a.auto,
    zIndex   : 10
  });
  return a;
};
module.exports = __results_list;
