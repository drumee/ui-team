// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *

const __account_data_deletion_goodbye = function(_ui_, data) {
    
  const message = Skeletons.Box.Y({
    className: `${pfx}__confirm`,
    kids: [
      Skeletons.Note({
        content   : LOCALE.ACCOUNT_DELETION_GOODBYE,
        className : `${pfx}__message`
      })
    ]});
    

  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug     : __filename,
    kids      : [
      message
    ]});

  return a; 
};

module.exports = __account_data_deletion_goodbye;
