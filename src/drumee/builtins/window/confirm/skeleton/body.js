// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_confirm_body = function (_ui_) {
  let message;
  const pfx = `${_ui_.fig.group}-confirm`;
  const messageInput = _ui_.mget(_a.message) || "";
  const submessageInput =
    _ui_.mget(_a.submessage) ||
    "Deleting your account will permanently remove your data and access to all features. If you’re sure you want to continue, please confirm below.";

  if (_.isString(messageInput)) {
    message = [
      Skeletons.Note({
        sys_pn: "message",
        className: `${pfx}__message delete-team`,
        content: messageInput,
      }),
      Skeletons.Note({
        sys_pn: "message",
        className: `${pfx}__submessage delete-team`,
        content: submessageInput,
      }),
    ];
  } else if (_.isFunction(messageInput)) {
    message = messageInput(_ui_);
  } else if (_.isArray(messageInput)) {
    message = messageInput;
  } else {
    message = [messageInput];
  }

  const a = Skeletons.Box.Y({
    className: `${pfx}__body`,
    debug: __filename,
    service: _e.raise,
    kids: message,
  });

  return a;
};
module.exports = __skl_window_confirm_body;
