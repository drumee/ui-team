// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *

const __account_data_deletion_confirm = function(_ui_) {
  const pfx = `${_ui_.fig.family}-deletion`;
  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kidsOpt: {
      uiHandler : _ui_
    },
    kids: [
      Skeletons.Note({
        content   : LOCALE.CANCEL,
        className : `${pfx}__btn cancel`,
        service   : 'close-dialog'
      }),
      Skeletons.Note({
        content   : LOCALE.ACCOUNT_DELETE,
        className : `${pfx}__btn delete`,
        service   : 'confirm-delete'
      })
    ]});
  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug     : __filename,
    kids      : [
      require("./header")(_ui_),
      require("./steps")(_ui_),
      Skeletons.Box.X({
        className : `${pfx}__guidelines`,
        kids      : [
          Skeletons.Note({
              content   : LOCALE.ACOUNT_DELETION_CONFIRM,
              className : `${pfx}__message`
          })          
        ]}),
      footer
    ]});

  return a; 
};

module.exports = __account_data_deletion_confirm;