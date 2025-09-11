
module.exports = function (ui, txt) {
  let content;
  const pfx = `${ui.fig.group}-choice`;
  const messageInput = txt || ui.mget(_a.message) || "";
  if (_.isString(messageInput)) {
    content = [
      Skeletons.Note({
        sys_pn: "content",
        className: `${pfx}__message delete-team`,
        content: messageInput
      })
    ];
  } else if (_.isFunction(messageInput)) {
    content = messageInput(ui);
  } else if (_.isArray(messageInput)) {
    content = messageInput;
  } else {
    content = [messageInput];
  }

  const a = Skeletons.Box.Y({
    className: `${pfx}__body`,
    debug: __filename,
    service: _e.raise,
    kids: content
  });

  return a;
};;
