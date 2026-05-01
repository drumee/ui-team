module.exports = function renameFolderDialog(ui, opt = {}) {
  const pfx = `${ui.fig.family}__rename-folder`;

  return Skeletons.Box.Y({
    className: `${pfx}-dialog`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-title`,
            content: LOCALE.RENAME,
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
          Skeletons.EntryBox({
            className: `${pfx}-entry`,
            sys_pn: "rename-folder-name",
            value: opt.value,
            require: _a.text,
            mode: _e.commit,
            service: "folder-rename-submit",
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
            content: LOCALE.SAVE,
            service: "folder-rename-submit",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
