/**
 * The "Create department" card, centred in the desk's modal host
 * (Wm.__wrapperModal). It used to be an inline entry at the foot of the org
 * view, below every workspace, which on a large organisation left it below the
 * fold: the user clicked "New department" and nothing visible happened.
 *
 * The create-folder card's layout (window/folder/skeleton/create-folder-dialog):
 * title + close, a labelled name field, then the footer, with Cancel added
 * beside Create.
 *
 * @param {Object} ui the org view; every control reports to it
 */
module.exports = function deptDialog(ui) {
  const pfx = `${ui.fig.family}__dept-dialog`;

  return Skeletons.Box.Y({
    className: `${pfx}`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-title`,
            content: LOCALE.CREATE_DEPARTMENT,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}-close`,
            ico: _a.cross,
            service: "close-department-dialog",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-content`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-label`,
            content: LOCALE.DEPARTMENT_NAME,
          }),
          Skeletons.Entry({
            className: `${pfx}-entry`,
            sys_pn: "dept-dialog-name",
            placeholder: LOCALE.DEPARTMENT_NAME,
            mode: _a.commit,
            service: "commit-new-department",
            require: "any",
            uiHandler: [ui],
            partHandler: ui,
          }),
          // Where a refusal the server names (DEPARTMENT_EXISTS, …) is shown.
          // Inline rather than Wm.alert: the alert goes through this same modal
          // host and would replace the card, losing what the user typed.
          Skeletons.Box.Y({
            className: `${pfx}-error`,
            sys_pn: "dept-dialog-error",
            partHandler: ui,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-button secondary`,
            content: LOCALE.CANCEL,
            service: "close-department-dialog",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}-button primary`,
            content: LOCALE.CREATE,
            service: "submit-new-department",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
