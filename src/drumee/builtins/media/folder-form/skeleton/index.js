module.exports = function (ui) {
  const pfx = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__header-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.NEW_FOLDER || "Create new folder",
          }),
          Skeletons.Note({
            className: `${pfx}__subtitle`,
            content: LOCALE.SUB_FOLDER_HINT || "Specify a name for your new folder.",
          }),
        ],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: "close",
        uiHandler: [ui],
      }),
    ],
  });

  const nameField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.FOLDER_NAME || "Folder name",
      }),
      Skeletons.Entry({
        className: `${pfx}__input`,
        sys_pn: "folder-name",
        formItem: "filename",
        placeholder: LOCALE.FOLDER_NAME || "Folder name",
        require: "text",
        mode: "commit",
        preselect: 1,
        service: "create-folder",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        sys_pn: "error",
        partHandler: [ui],
        className: `${pfx}__field-error`,
        state: 0,
        content: "",
      }),
    ],
  });

  const footer = Skeletons.Box.Y({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Button.Label({
        className: `${pfx}__submit`,
        label: LOCALE.CREATE,
        service: "create-folder",
        uiHandler: [ui],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [header, nameField, footer],
  });
};
