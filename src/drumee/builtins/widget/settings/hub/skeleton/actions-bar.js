
module.exports = function (ui) {
  return Skeletons.Box.X({
    className: `${ui.fig.group}__container-commands`,
    debug: __filename,
    sys_pn: "ref-actions-bar-footer",
    kids: [
      Skeletons.Box.X({
        className: "",
        debug: __filename,
        sys_pn: "ref-actions-bar",
        dataset: {
          active: ui.getState()
        },
        kids: [
          Skeletons.Note({
            className: "dialog__button--submit",
            uiHandler: ui,
            service: "add-members",
            editable: 1,
            content: LOCALE.SAVE
          })
        ]
      })
    ]
  });

};
