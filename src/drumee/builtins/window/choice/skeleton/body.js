// Based on window/info's message.js: the message stacks inside a __container
// between the topbar and the action row, replacing the old centered __body.
// `sys_pn: "content"` is kept so index.js's onPartReady keeps recognising this
// part.
module.exports = function (ui, txt) {
  const fig = ui.fig.family; // window-choice
  let content;
  const messageInput = txt || ui.mget(_a.message) || "";
  if (_.isString(messageInput)) {
    content = [
      Skeletons.Note({
        sys_pn: _a.content,
        className: `${fig}__message inner`,
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

  return Skeletons.Box.Y({
    className: `${fig}__container`,
    debug: __filename,
    service: _e.raise,
    kids: content
  });
};
