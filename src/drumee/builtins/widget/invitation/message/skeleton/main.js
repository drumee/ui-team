const __skl_invitation_message = function (ui) {
  const message = ui.model.get(_a.message) || "";
  const entry = Skeletons.Entry({
    type: _a.textarea,
    kind: KIND.entry_text,
    placeholder: LOCALE.MESSAGE,
    className: `${ui.fig.family} ${ui.fig.family}__textarea input mb-15`,
    value: message,
    sys_pn: "ref-message",
    name: _a.message,
    content: "",
    // mode        : _a.interactive,
    service: _e.submit
  });

  const button = Skeletons.Box.X({
    service: _e.update,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        content: LOCALE.OK,
        className: `${ui.fig.family}__button dialog__button--submit`,
        service: _e.update,
        uiHandler: ui
      })
    ]
  });
  const a = [entry, button];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __skl_invitation_message;
