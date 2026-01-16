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


const __locale_row = function (_ui_, target) {

  const bar = Skeletons.Box.X({
    className: `${_ui_.fig.family}__buttons`,
    kids: [
      Skeletons.Note({
        content: LOCALE.CANCEL,
        className: `${_ui_.fig.family}__button cancel`,
        service: _e.close
      }),
      Skeletons.Note({
        content: LOCALE.VALIDATE,
        className: `${_ui_.fig.family}__button confirm`,
        sys_pn: "commit-button",
        service: "add-or-update"
      })
    ]
  });

  const form = Skeletons.Box.Y({
    debug: __filename,
    className: `u-jc-center ${_ui_.fig.family}__form-container`,
    uiHandler: _ui_,
    sys_pn: "row-form",
    kids: [
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__form-content`,
        sys_pn: "entry-form",
        kids: require('./entries')(_ui_)
      }),
      bar
    ]
  });
  const a = form;

  return a;
};
module.exports = __locale_row;
