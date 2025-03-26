// ===========================================================
// __skl_avatar
// ===========================================================

const __skl_avatar = function(_ui_) {
  const image = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__main`,
    sys_pn      : 'ref-image',
    partHandler : [_ui_]});

  const fs = Skeletons.FileSelector({
    partHandler : _ui_});

  const a = [fs, image, Skeletons.Wrapper.Y({name:'progress'})];

  a.plug(_a.debug, __filename);
  return a; 
};

module.exports = __skl_avatar;
