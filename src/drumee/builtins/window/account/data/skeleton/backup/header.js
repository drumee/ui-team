// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *

const __account_data_backup_header = function(_ui_) {
  const pfx = `${_ui_.fig.family}-deletion`;
  const a = Skeletons.Box.X({
    className : `${pfx}__title`,
    kids      : [
      Skeletons.Note({
        className: `${pfx}__title text`,
        content : LOCALE.BACK_UP_DATA
      })
    ]});

  return a; 
};

module.exports = __account_data_backup_header;
