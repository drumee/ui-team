// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/admin/skeleton/locale/confirm-remove
//   TYPE : 
// ==================================================================== *

// ===========================================================
const __locale_confirm_remove = function(_ui_, data) {
  const key = data.key_code;
  const message = ` The entry [${key}] will be deleted. \
This may have effect on Drumee UI ! <b> \
Are you sure ?`;
  const bar = Skeletons.Box.X({
    className: `${_ui_.fig.family}__buttons`,
    kids: [
      Skeletons.Note({
        content   : LOCALE.CANCEL,
        className : "btn btn--cancel",
        sys_pn    : "cancel-button",
        service   : _e.close
      }),
      Skeletons.Note({
        content   : LOCALE.GOT_IT,
        className : "btn btn--confirm",
        sys_pn    : "commit-button",
        key,
        service   : 'commit-remove'
      })
    ]});
  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.family}__form-container`,
    uiHandler : _ui_,
    kids :[
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__form-content`,
        kids      : [
          Skeletons.Note({
            content   : message,
            className : `${_ui_.fig.family}__message`,
            sys_pn    : "cancel-button",
            service   : _e.close
          }),
          bar
        ]})
    ]
  });
  return a;
};
module.exports = __locale_confirm_remove;
