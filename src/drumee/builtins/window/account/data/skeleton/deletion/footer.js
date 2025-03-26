// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : account/current/profile/skeleton/main.coffee
//   TYPE :
// ==================================================================== *

const __account_deletion_footer = function(_ui_) {
  const pfx = `${_ui_.fig.family}-deletion`;
  const a = Skeletons.Box.X({
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
        content   : LOCALE.BACK_UP_DATA,//ACCOUNT_BACKUP
        className : `${pfx}__btn download`,
        service   : _e.save
      }),
      Skeletons.Note({
        content   : LOCALE.ACCOUNT_DELETE,
        className : `${pfx}__btn delete`,
        service   : "quick-delete"
      })
    ]});
  
  return a;
};

module.exports = __account_deletion_footer;
