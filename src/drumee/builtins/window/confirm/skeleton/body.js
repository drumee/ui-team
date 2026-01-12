const __skl_window_confirm_body = function (ui) {
  let message;
  const pfx = `${ui.fig.group}-confirm`;
  const messageInput = ui.mget(_a.message) || "";
  const submessageInput = ui.mget(_a.submessage) || "";

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
    message = messageInput(ui);
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
