

const __window_info_message = function (ui) {
  let message;
  const messageInput = ui.mget(_a.message);
  if (_.isString(messageInput)) {
    message = [Skeletons.Note(messageInput, `${ui.fig.family}__message inner`)];
  } else if (_.isFunction(messageInput)) {
    message = messageInput(ui);
  } else if (_.isArray(messageInput)) {
    message = messageInput;
  } else {
    message = [messageInput];
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__container`,
    kids: message
  });
};
module.exports = __window_info_message;
