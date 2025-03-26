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
      Skeletons.Button.Svg({
        ico       : 'available',//'account_check'
        className : "icon"
      }),

      Skeletons.Note({
        className : "text",
        content   : LOCALE.MEETING_LINK_READY
      })
    ]});


  return a;
};
module.exports = __acknowledge;
