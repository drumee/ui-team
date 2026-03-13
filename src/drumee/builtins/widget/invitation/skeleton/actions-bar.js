
module.exports = function (ui) {
  return Skeletons.Box.X({
    className: `${ui.fig.group}__container-commands`,
    sys_pn: "ref-actions-bar",
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: "dialog__button--submit",
        uiHandler: ui,
        service: "add-members",
        sys_pn: "add-member-button",
        content: LOCALE.INVITE || "Invite",
        state: 0,
      }),
    ]
  });
};
