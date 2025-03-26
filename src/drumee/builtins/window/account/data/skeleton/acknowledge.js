// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : router/skeleton/popup-info
//   TYPE : 
// ==================================================================== *

// ==================================================
//
// ===========================================================
const __acknowledge = function(_ui_, data) {
  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__acknowledge`,
    debug     : __filename, 
    kids : [
      Skeletons.Note({
        className : `${_ui_.fig.family}__acknowledge-text`,
        content   : (data.recipient.printf(LOCALE.VALIDATION_SENT_TO))
      })
    ]});


  return a;
};
module.exports = __acknowledge;
