// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/admin/skeleton/local-row
//   TYPE :
// ==================================================================== *

// ===========================================================
// _form (local-row)
//
// @param [Object] _ui_
//
// ===========================================================


const __locale_row = function(_ui_, target) {

  const bar = Skeletons.Box.X({
    className: "w-100 mb-30 my-22 u-jc-center",
    kids: [
      Skeletons.Note({
        content   : LOCALE.CANCEL,
        className: "btn btn--cancel mx-22",
        service : _e.close
      }),
      Skeletons.Note({
        content   : LOCALE.VALIDATE,
        className : "btn btn--confirm mx-22",
        sys_pn    : "commit-button",
        service   : "add-or-update"
      })
    ]});
  
  const form = Skeletons.Box.Y({
    debug     : __filename,
    className : `u-jc-center ${_ui_.fig.family}__form-container`,
    uiHandler : _ui_,
    sys_pn    : "row-form",
    kids      : [
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__form-content`,
        sys_pn    : "entry-form",
        kids: require('./entries')(_ui_)
      }),
      bar
    ]});
  const a = form;

  return a;
};
module.exports = __locale_row;
