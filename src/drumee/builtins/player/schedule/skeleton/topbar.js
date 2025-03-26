const __schedule_topbar = function(_ui_, size) {
  let a;
  const fig = `${_ui_.fig.family}-topbar`;
  const name = Skeletons.Note({
    className : _a.name,
    content   : _ui_.mget(_a.title) || LOCALE.EXTERNAL_MEETING
  });


  return a = Skeletons.Box.X({
    className : `${fig}__main`,
    debug     : __filename,
    sys_pn    : 'topbar',
    justify   : _a.right,
    service   : _e.raise,
    uiHandler : _ui_,
    kids      : [
      Skeletons.Box.X({
        className : `${fig}__title`,
        service   : _e.raise,
        uiHandler : _ui_,
        kids      : [
          name
        ]}),
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]});
};


module.exports = __schedule_topbar;
