
const __skl_addressbook_common_overlay_wrapper = function(_ui_) {

  const a = Skeletons.Box.X({
    debug       : __filename,
    className   : `${_ui_.fig.family}__overlay-wrapper`,
    sys_pn      : 'overlay-wrapper',
    dataset     : {
        mode    : _a.closed
      },
    kids        : [
      Skeletons.Box.X({
        className   : 'overlay'}),

      Skeletons.Wrapper.X({
        className : 'overlay-notifier',
        name      : 'overlay-notifier'
      })
    ]});
  
  return a;
};

module.exports = __skl_addressbook_common_overlay_wrapper;
