const __skl_window_confirm_body = function (ui) {
  const pfx = `${ui.fig.group}-confirm`;
  const titleInput = ui.mget(_a.title) || "";
  const messageInput = ui.mget(_a.message) || "";
  const submessageInput = ui.mget(_a.submessage) || "";

  const kids = [];

  if (titleInput) {
    kids.push(
      Skeletons.Note({
        sys_pn: "title",
        className: `${pfx}__title`,
        content: titleInput,
      })
    );
  }

  if (_.isString(messageInput)) {
    if (messageInput) {
      kids.push(
        Skeletons.Note({
          sys_pn: "message",
          className: `${pfx}__message`,
          content: messageInput,
        })
      );
    }
    if (submessageInput) {
      kids.push(
        Skeletons.Note({
          sys_pn: "submessage",
          className: `${pfx}__submessage`,
          content: submessageInput,
        })
      );
    }
  } else if (_.isFunction(messageInput)) {
    const out = messageInput(ui);
    if (_.isArray(out)) kids.push(...out);
    else kids.push(out);
  } else if (_.isArray(messageInput)) {
    kids.push(...messageInput);
  } else if (messageInput) {
    kids.push(messageInput);
  }

  return Skeletons.Box.Y({
    className: `${pfx}__body`,
    debug: __filename,
    kids,
  });
};

module.exports = __skl_window_confirm_body;
