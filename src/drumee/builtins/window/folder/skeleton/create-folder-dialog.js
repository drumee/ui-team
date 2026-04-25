module.exports = function createFolderDialog(ui) {
  const pfx = `${ui.fig.family}__create-folder`;

  return Skeletons.Box.Y({
    className: `${pfx}-dialog`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-title`,
            content: LOCALE.CREATE_NEW_FOLDER,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}-close`,
            ico: _a.cross,
            service: "close-folder-dialog",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.EntryBox({
        className: `${pfx}-entry`,
        sys_pn: "create-folder-name",
        placeholder: LOCALE.NEW_FOLDER,
        value: LOCALE.NEW_FOLDER,
        require: _a.text,
        mode: _a.commit,
        service: "create-folder-submit",
        interactive: 1,
        preselect: 1,
        uiHandler: [ui],
        partHandler: ui,
        errorHandler: ui,
      }),
      Skeletons.Box.X({
        className: `${pfx}-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-button secondary`,
            content: LOCALE.CANCEL,
            service: "close-folder-dialog",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}-button primary`,
            content: LOCALE.CREATE,
            service: "create-folder-submit",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
