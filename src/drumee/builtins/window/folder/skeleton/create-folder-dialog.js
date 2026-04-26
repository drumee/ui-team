module.exports = function createFolderDialog(ui, opt = {}) {
  const pfx = opt.prefix || `${ui.fig.family}__create-folder`;

  return Skeletons.Box.Y({
    className: `${pfx}-dialog`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}-heading`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-title`,
                content: LOCALE.CREATE_NEW_FOLDER,
              }),
              Skeletons.Note({
                className: `${pfx}-subtitle`,
                content: LOCALE.CREATE_FOLDER_DESCRIPTION,
              }),
            ],
          }),
          Skeletons.Button.Svg({
            className: `${pfx}-close`,
            ico: _a.cross,
            service: "close-folder-dialog",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-content`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-label`,
            content: LOCALE.FOLDER_NAME,
          }),
          Skeletons.EntryBox({
            className: `${pfx}-entry`,
            sys_pn: "create-folder-name",
            placeholder: LOCALE.NEW_FOLDER,
            require: _a.text,
            mode: _a.commit,
            service: "create-folder-submit",
            interactive: 1,
            preselect: 1,
            uiHandler: [ui],
            partHandler: ui,
            errorHandler: ui,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-footer`,
        kids: [
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
