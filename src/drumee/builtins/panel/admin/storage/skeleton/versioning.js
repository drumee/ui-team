module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__versioning`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__versioning-header`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__versioning-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__versioning-title`,
                content: LOCALE.FILE_VERSIONING,
              }),
              Skeletons.Note({
                className: `${pfx}__versioning-desc`,
                content: LOCALE.FILE_VERSIONING_DESC,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__versioning-controls`,
            kids: [
              Skeletons.Button.Label({
                className: `${pfx}__ws-filter`,
                label: LOCALE.ALL_WORKSPACE,
                ico: "desktop_filter",
                service: "filter-workspace",
                uiHandler: [ui],
              }),
              Skeletons.Entry({
                className: `${pfx}__file-search`,
                sys_pn: "file-search",
                placeholder: LOCALE.SEARCH_FILE,
                mode: "commit",
                service: "search-files",
                uiHandler: [ui],
              }),
              Skeletons.Button.Label({
                className: `${pfx}__retention-btn`,
                ico: "settings",
                label: LOCALE.RETENTION_POLICY,
                service: "retention-policy",
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__files-header`,
        kids: [
          Skeletons.Button.Svg({
            className: `${pfx}__select-all`,
            icons: ["editbox_shapes-roundsquare", "available"],
            sys_pn: "select-all",
            state: 0,
            service: "select-all-files",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__fcol file`,
            content: LOCALE.FILE,
          }),
          Skeletons.Note({
            className: `${pfx}__fcol folder`,
            content: LOCALE.FOLDER,
          }),
          Skeletons.Note({
            className: `${pfx}__fcol workspace`,
            content: LOCALE.WORKSPACE,
          }),
          Skeletons.Note({
            className: `${pfx}__fcol size`,
            content: LOCALE.SIZE,
          }),
          Skeletons.Note({
            className: `${pfx}__fcol versions`,
            content: LOCALE.VERSIONS,
          }),
          Skeletons.Note({
            className: `${pfx}__fcol actions`,
            content: LOCALE.ACTIONS,
          }),
        ],
      }),
      Skeletons.List.Smart({
        className: `${pfx}__files-list`,
        sys_pn: "files-list",
        flow: _a.none,
        spinner: true,
        spinnerWait: 300,
        api: ui.getFiles.bind(ui),
        itemsOpt: { kind: "admin_storage_file", uiHandler: [ui] },
        vendorOpt: Preset.List.Orange_e,
        evArgs: Skeletons.Note(LOCALE.NO_FILES, `${pfx}__empty`),
      }),
      Skeletons.Box.X({
        className: `${pfx}__files-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__view-all`,
            content: LOCALE.VIEW_ALL,
            service: "view-all-files",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__delete-selected`,
            content: LOCALE.DELETE_SELECTED,
            service: "delete-selected-files",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
