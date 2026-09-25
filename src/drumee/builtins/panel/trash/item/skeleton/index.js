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

  // Size. A folder's own filesize is meaningless (0, or 1024 when unzipped):
  // it shows what it held instead, "9.33 MB (6 items)" — content_size is the
  // total of the files trashed inside it, items_count its direct children.
  // A file shows its size. Each part is left out when the server does not
  // send it (an SP from before those columns).
  const isFolder = filetype === _a.folder || filetype === _a.hub;
  let sizeLabel = null;
  if (isFolder) {
    const items = ui.mget('items_count') != null ? Number(ui.mget('items_count')) : NaN;
    const itemsLabel = Number.isFinite(items)
      ? (items === 1 ? LOCALE.ONE_ITEM : LOCALE.X_ITEMS.format(items))
      : null;
    const size = ui.mget('content_size') != null ? Number(ui.mget('content_size')) : NaN;
    if (Number.isFinite(size)) {
      sizeLabel = itemsLabel ? `${filesize(size)} (${itemsLabel})` : filesize(size);
    } else {
      sizeLabel = itemsLabel;
    }
  } else if (ui.mget(_a.filesize) != null) {
    sizeLabel = filesize(Number(ui.mget(_a.filesize)) || 0);
  }

  // Location: the workspace, then the folders above the item. For a shared
  // workspace that is its name as the viewer sees it (hub_name). On the
  // viewer's own drive every top-level folder IS a personal workspace, so the
  // path's first segment already names it; an item with no segment was one
  // of those workspaces itself, and lived under "Personal" — the heading the
  // switcher files them under (libs/workspace-groups). "." is the
  // parent_path unzip writes for the workspace root. Absent on a server still
  // on the SP without parent_path, and then simply not shown.
  let location = null;
  const parentPath = ui.mget('parent_path');
  if (parentPath != null) {
    const segments = String(parentPath).split("/").filter((s) => s && s !== ".");
    const hubName = ui.mget('hub_name');
    const parts = hubName ? [hubName, ...segments] : segments;
    location = parts.length ? parts.join(" / ") : LOCALE.PERSONAL;
  }

  const metaKids = [
    Skeletons.Box.X({
      className: `${pfx}__deleted`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__deleted-by`,

          content: `${LOCALE.DELETED_BY}`,
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
        Skeletons.Image.Svg({ ico: 'app-folder', className: `${pfx}__location-ico` }),
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
