// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : router/skeleton/popup-info
//   TYPE : 
// ==================================================================== *

// ==================================================
//
// ===========================================================
const __welcome_message = function(_ui_, data, type) {
  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.group}__acknowledge container`,
    debug     : __filename, 
    kids : [
      Skeletons.Note({
        className : `${_ui_.fig.group}__acknowledge title`,
        content   : (data.email.printf(LOCALE.VALIDATION_SENT_TO))
      }),

      Skeletons.Note({
        className : `${_ui_.fig.group}__acknowledge email`,
        content : data.email
      }),

      Skeletons.Note({
        className : `${_ui_.fig.group}__acknowledge tips`,
        content : LOCALE.MESSAGE_ACTIVATION
      }),

      Skeletons.Note({
        className : `${_ui_.fig.group}__acknowledge button`,
        content : "Ok",
        service : "close-tooltip"
      })
    ]});


  return a;
};
module.exports = __welcome_message;
