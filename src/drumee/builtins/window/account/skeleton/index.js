const __account_main = function(_ui_, tab_name) {

  let handle;

  const wrapper = Skeletons.Wrapper.Y({
    className : "account-modal u-jc-center u-ai-center",
    sys_pn    : "overlay-wrapper",
    state     : 0
  });

  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header  ${_ui_.fig.group}__header`,
    sys_pn    : "top-bar",
    kids      : [
      Skeletons.Note({
        content   : LOCALE.MY_ACCOUNT,
        flow      : _a.y, 
        className : `${_ui_.fig.family}__topbar--text u-jc-center`
      }),
      (handle = require('window/skeleton/topbar/control')(_ui_, 'c'))
    ]});
  const container = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__container`, 
    sys_pn    : _a.container,
    uiHandler     : _ui_
  });

  const a = Skeletons.Box.Y({
    debug   : __filename,
    ui: _ui_,
    className: `${_ui_.fig.family}__main u-ai-center --border`,
    kids: [
      header,
      wrapper,
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__body`,
        kids      : [
          require('./navbar')(_ui_),
          container
          //require('./footer')(_ui_)
        ]})
    ]});

  return a;
};

module.exports = __account_main;
