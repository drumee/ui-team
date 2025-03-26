// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : account/current/profile/skeleton/main.coffee
//   TYPE :
// ==================================================================== *

const __account_footer = function(_ui_, txt) {
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.group}__footer ${_ui_.fig.family}__footer`});
    // kids: [
    //   Skeletons.Note
    //     content   : LOCALE.ACCOUNT_DELETE
    //     className : "#{_ui_.fig.group}__btn #{_ui_.fig.family}__btn delete"
    //     service   : _e.delete
    //   Skeletons.Note
    //     content   : LOCALE.BACK_UP_DATA#ACCOUNT_BACKUP
    //     className : "#{_ui_.fig.group}__btn #{_ui_.fig.family}__btn download"
    //     service   : 'prepare-backup'
    // ]
  
  return a;
};

module.exports = __account_footer;
