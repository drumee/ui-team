// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : account/current/profile/skeleton/main.coffee
//   TYPE :
// ==================================================================== *

const __account_fotter = function(_ui_, txt) {
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.group}__footer`,
    sys_pn : _a.footer,
    kids: [
      Skeletons.Note({
        content   : txt || LOCALE.SAVE_CHANGES,
        className : `${_ui_.fig.group}__btn`,
        sys_pn    : "ref-validate",
        uiHandler     : _ui_,
        service   : _e.commit
      })
    ]});
  
  return a;
};

module.exports = __account_fotter;
