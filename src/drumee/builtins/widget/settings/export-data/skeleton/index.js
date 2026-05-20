function exportItem(ui, { key, title, size }) {
  const pfx = ui.fig.family;
  const checked = ui._selected.has(key);
  return Skeletons.Box.X({
    className: `${pfx}__export-item${checked ? ` ${pfx}__export-item--checked` : ""}`,
    service: "export-toggle-item",
    uiHandler: [ui],
    item_key: key,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__checkbox${checked ? ` ${pfx}__checkbox--checked` : ""}`,
        kids: checked
          ? [
              Skeletons.Image.Svg({
                ico: "editbox_checkmark",
                className: `${pfx}__checkbox-mark`,
              }),
            ]
          : [],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__export-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}__export-title`, content: title }),
          Skeletons.Note({ className: `${pfx}__export-size`, content: size }),
        ],
      }),
    ],
  });
}

function footerButton(ui, opt) {
  const pfx = ui.fig.family;
  const { label, service, variant, kids, state, sys_pn } = opt;
  return Skeletons.Box.X({
    className: `${pfx}__btn ${pfx}__btn--${variant}`,
    service,
    state,
    sys_pn,
    uiHandler: [ui],
    kids: kids || [
      Skeletons.Note({ className: `${pfx}__btn-label`, content: label }),
    ],
  });
}

export default function export_data_skeleton(ui) {
  const pfx = ui.fig.family;

  const items = [
    {
      key: "files",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_FILES || "Files & Uploads",
      size: "240 MB",
    },
    {
      key: "chat",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_CHAT || "Chat history",
      size: "12 MB",
    },
    {
      key: "workspace",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_WORKSPACE || "Workspace data",
      size: "88 MB",
    },
    {
      key: "activity",
      title: LOCALE.DELETE_ACCOUNT_EXPORT_ACTIVITY || "Activity log",
      size: "2 MB",
    },
  ];

  const grid = Skeletons.Box.Y({
    className: `${pfx}__export-grid`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__export-row`,
        kids: [exportItem(ui, items[0]), exportItem(ui, items[1])],
      }),
      Skeletons.Box.X({
        className: `${pfx}__export-row`,
        kids: [exportItem(ui, items[2]), exportItem(ui, items[3])],
      }),
      Skeletons.Box.X({
        className: `${pfx}__export-download-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__download`,
            service: "export-download",
            state: ui._selected.size === 0 ? 0 : 1,
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "download",
                className: `${pfx}__download-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__download-label`,
                content: (LOCALE.DELETE_ACCOUNT_DOWNLOAD_SELECTED || "Download selected ({0})").format(ui._selected.size),
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__export-row`,
        sys_pn: "message",
      }),
    ],
  });

  const header = Skeletons.Box.Y({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.EXPORT_ALL_MY_DATA || "Export my data",
      }),
      Skeletons.Note({
        className: `${pfx}__subtitle`,
        content: LOCALE.EXPORT_SELECT_DATA || "Select the data you want to download",
      }),
      Skeletons.Note({
        className: `${pfx}__description`,
        content: LOCALE.EXPORT_DATA_DESC || "Choose what to include in your export archive.",
      }),
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      footerButton(ui, {
        variant: "cancel",
        label: LOCALE.CLOSE || "Close",
        service: "export-cancel",
      }),
      footerButton(ui, {
        variant: "continue",
        label: LOCALE.DOWNLOAD_ALL || "Download all",
        service: "export-download-all",
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    kids: [header, grid, footer],
  });
}
