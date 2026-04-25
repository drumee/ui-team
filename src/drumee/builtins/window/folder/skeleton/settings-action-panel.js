const actions = [
  { service: "open-advanced-settings", label: LOCALE.SETTINGS, ico: "editbox_cog" },
  { service: _e.download, label: LOCALE.DOWNLOAD, ico: "desktop_download" },
  { service: "folder-rename", label: LOCALE.RENAME, ico: "editbox_pencil" },
  { service: "folder-organize", label: LOCALE.ORGANIZE, ico: "desktop_copy" },
  { service: "folder-duplicate", label: LOCALE.DUPLICATE, ico: "desktop_copy" },
  { service: "folder-delete", label: LOCALE.DELETE, ico: "desktop_delete", destructive: 1 },
];

module.exports = function settingsActionPanel(ui) {
  const pfx = `${ui.fig.family}__settings-action`;

  return Skeletons.Box.Y({
    className: `${pfx}-panel`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-title`,
            content: LOCALE.FOLDER_SETTING,
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
        className: `${pfx}-list`,
        kids: actions.map(({ service, label, ico, destructive }) =>
          Skeletons.Box.X({
            className: `${pfx}-item${destructive ? " destructive" : ""}`,
            service,
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}-label`,
                content: label,
              }),
              Skeletons.Button.Svg({
                className: `${pfx}-icon`,
                ico,
              }),
            ],
          }),
        ),
      }),
    ],
  });
};
