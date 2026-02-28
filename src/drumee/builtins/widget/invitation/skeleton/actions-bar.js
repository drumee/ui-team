const { button } = require("../../../../builtins/skeleton/toolkit/buttons");

module.exports = function (ui) {
  return Skeletons.Box.X({
    className: `${ui.fig.group}__container-commands`,
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: "dialog__button--submit",
        uiHandler: ui,
        service: "add-members",
        sys_pn: "add-member-button",
        content: "Add members",
        state: 0,
      }),
      // Skeletons.Note({
      //   className: "dialog__button--submit",
      //   uiHandler: ui,
      //   service: "invite-contacts",
      //   content: "Invite contacts"
      // }),
      button(ui, {
        label: "Invite contacts",
        className: `drumee-buttons--primary`,
        service: "invite-contacts",
      }),
      // Skeletons.Note({
      //   className: `${ui.fig.group}__container--secondary-btn`,
      //   uiHandler: [ui],
      //   service: 'cancel-share',
      //   editable: 1,
      //   content: LOCALE.CLOSE
      // }),
      // Skeletons.Box.X({
      //   className: "",
      //   debug: __filename,
      //   sys_pn: "ref-actions-bar",
      //   state: 0,
      //   dataset: {
      //     active: ui.getState()
      //   },
      //   kids: [
      //     Skeletons.Note({
      //       className: "dialog__button--submit",
      //       uiHandler: ui,
      //       service: "add-members",
      //       editable: 1,
      //       content: "Add members"
      //     })
      //   ]
      // })
    ],
  });
};
