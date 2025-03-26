// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


const __window_info_message = function(_ui_) {
  let message;
  const messageInput = _ui_.mget(_a.message);
  if (_.isString(messageInput)) {
    message = [Skeletons.Note(messageInput, `${_ui_.fig.family}__message inner`)];
  } else if (_.isFunction(messageInput)) {
    message = messageInput(_ui_);
  } else if (_.isArray(messageInput)) {
    message = messageInput;
  } else { 
    message = [messageInput];
  }

  const a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${_ui_.fig.family}__container`,
    kids      : message
  });

  return a;
};
module.exports = __window_info_message;
