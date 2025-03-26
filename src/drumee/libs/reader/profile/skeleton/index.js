// ===========================================================
// __skl_avatar
// ===========================================================

const __skl_avatar = function(_ui_) {
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`,
    sys_pn      : "image-box",
    partHandler : _ui_,
    active      : _ui_.mget(_a.active)
  });
    // kids        : [
    //   Skeletons.Note
    //     content     : _ui_.initiales()
    //     className   : "#{_ui_.fig.family}__icon #{_ui_.fig.family}__initiales initiales"
    //     styleOpt    :
    //       backgroundColor : _ui_.color()
    //     state       : 0
    //     sys_pn      : 'initiales'
    //   p 
    //]
  return a; 
};

module.exports = __skl_avatar;
