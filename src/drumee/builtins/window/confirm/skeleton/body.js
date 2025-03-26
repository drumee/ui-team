// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


const __skl_window_confirm_body = function(_ui_) {
  let message;
  const pfx = `${_ui_.fig.group}-confirm`;
  const messageInput = _ui_.mget(_a.message) || "";
  if (_.isString(messageInput)) {
    message = [
      Skeletons.Note({
        sys_pn    : "message",
        className : `${pfx}__message delete-team`,
        content   : messageInput
      })
    ];
  } else if (_.isFunction(messageInput)) {
    message = messageInput(_ui_);
  } else if (_.isArray(messageInput)) {
    message = messageInput;
  } else { 
    message = [messageInput];
  }

  const a = Skeletons.Box.Y({
    className : `${pfx}__body`,
    debug     : __filename,
    service   : _e.raise,
    kids      : message
  });

  return a;
};
module.exports = __skl_window_confirm_body;
