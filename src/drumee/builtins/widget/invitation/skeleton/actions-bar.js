const { button } = require("../../../../builtins/skeleton/toolkit/buttons");

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
      button(ui, {
        label: "Invite contacts",
        className: `drumee-buttons--primary`,
        service: "invite-contacts",
      }),
    ],
  });
};
