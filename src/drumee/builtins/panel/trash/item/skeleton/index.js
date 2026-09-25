const { filesize } = require('@drumee/ui-essentials');

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const filename = ui.mget(_a.filename) || "";
  const ext = ui.mget(_a.ext) ? `.${ui.mget(_a.ext)}` : "";
  const filetype = ui.mget(_a.filetype) || "";
  const modifier = ui.mget(_a.modifier) || "me";
  const mtime = ui.mget(_a.mtime);
  const daysLeft = Number.isFinite(Number(ui.mget('days_remaining')))
    ? Number(ui.mget('days_remaining'))
    : 30;

  // When the item was trashed (mfs_show_bin trashed_time). mtime is the upload
  // time, kept only as the fallback for a server still on the SP without that
  // column (or a legacy row stamped 0).
  const trashedTime = Number(ui.mget('trashed_time')) || 0;
  const when = trashedTime || mtime;
  const deletionDate = when ? Dayjs.unix(when).format(Visitor.timeformat()) : Dayjs().format(Visitor.timeformat());

  // Size: a folder's own filesize is meaningless (0, or 1024 when unzipped),
  // so it shows how many items it holds (mfs_show_bin items_count); a file
  // shows its size. Each is left out when the server does not send it.
  const isFolder = filetype === _a.folder || filetype === _a.hub;
  let sizeLabel = null;
  if (isFolder) {
    const items = Number(ui.mget('items_count'));
    if (Number.isFinite(items) && ui.mget('items_count') != null) {
      sizeLabel = items === 1 ? LOCALE.ONE_ITEM : LOCALE.X_ITEMS.format(items);
    }
  } else if (ui.mget(_a.filesize) != null) {
    sizeLabel = filesize(Number(ui.mget(_a.filesize)) || 0);
  }

  // Location: the workspace as the viewer names it (hub_name), or Home for
  // their own drive, then the folders above the item. "." is the parent_path
  // unzip writes for the workspace root. Absent on a server still on the SP
  // without parent_path, and then simply not shown.
  let location = null;
  const parentPath = ui.mget('parent_path');
  if (parentPath != null) {
    const segments = String(parentPath).split("/").filter((s) => s && s !== ".");
    location = [ui.mget('hub_name') || LOCALE.HOME, ...segments].join(" / ");
  }

  const metaKids = [
    Skeletons.Box.X({
      kids: [
        Skeletons.Note({
          className: `${pfx}__deleted-by`,

          content: `${LOCALE.DELETED_BY}:`,
        }),
        Skeletons.Note({
          className: `${pfx}__modifier`,
          content: `${modifier}`,
        }),
      ],
    }),
    // Skeletons.Note({ className: `${pfx}__deleted-by`, content: `${LOCALE.DELETED_BY}: ${modifier}` }),
    Skeletons.Note({
      className: `${pfx}__date`,
      content: `${LOCALE.DATE}: ${deletionDate}`,
    }),
  ];
  if (sizeLabel) {
    metaKids.push(Skeletons.Note({
      className: `${pfx}__size`,
      content: sizeLabel,
    }));
  }
  if (location) {
    metaKids.push(Skeletons.Box.X({
      className: `${pfx}__location`,
      // The line is ellipsized when the path is long; the full one on hover.
      attribute: { title: location },
      kids: [
        Skeletons.Image.Svg({ ico: 'folder', className: `${pfx}__location-ico` }),
        Skeletons.Note({
          className: `${pfx}__location-path`,
          content: location,
        }),
      ],
    }));
  }

  return Skeletons.Box.X({
    className: `${pfx}__row`,
    kids: [
      Skeletons.Element({
        content: require("./template")(ui),
        className: `${pfx}__file-icon ${filetype}`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__info`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__name`,
            content: `${filename}${ext}`,
          }),
          Skeletons.Box.X({
            className: `${pfx}__meta`,
            kids: metaKids,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__days-badge days-badge`,
            content: LOCALE.X_DAYS_LEFT.format(daysLeft),
          }),
          Skeletons.Note({
            className: `${pfx}__btn restore`,
            service: "restore-to-desk",
            content: LOCALE.RESTORE,
            tooltips: {
              content: `<svg class="${pfx}__restore-info-ico"><use href="#--icon-info"></use></svg><span>${LOCALE.RESTORE_HINT || "Restore to original location."}</span>`,
              className: `${pfx}__btn restore-info`,
            },
            uiHandler: ui,
          }),

          Skeletons.Button.Svg({
            ico: "trash-action",
            className: `${pfx}__btn delete`,
            service: "delete-permanently",
            // tooltips: LOCALE.DELETE,
            uiHandler: ui,
          }),
        ],
      }),
    ],
  });
};
