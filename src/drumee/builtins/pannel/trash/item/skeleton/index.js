module.exports = function (ui) {
  const pfx = ui.fig.family;
  const filename = ui.mget(_a.filename) || '';
  const ext = ui.mget(_a.ext) ? `.${ui.mget(_a.ext)}` : '';
  const filetype = ui.mget(_a.filetype) || 'file';
  const modifier = ui.mget(_a.modifier) || ui.mget('deleted_by') || '';
  const mtime = ui.mget(_a.mtime);

  const deletionDate = mtime
    ? new Date(mtime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  const daysLeft = mtime
    ? Math.max(0, 30 - Math.ceil((Date.now() / 1000 - mtime) / 86400))
    : 30;

  const fileIcon = filetype === _a.hub ? 'folder' : `file`;

  return Skeletons.Box.X({
    className: `${pfx}__row`,
    kids: [
      Skeletons.Image.Svg({
        ico: fileIcon,
        className: `${pfx}__file-icon ${filetype}`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__info`,
        kids: [
          Skeletons.Note({ className: `${pfx}__name`, content: `${filename}${ext}` }),
          Skeletons.Box.X({
            className: `${pfx}__meta`,
            kids: [
              modifier
                ? Skeletons.Note({ className: `${pfx}__deleted-by`, content: `${LOCALE.DELETED_BY}: ${modifier}` })
                : null,
              deletionDate
                ? Skeletons.Note({ className: `${pfx}__date`, content: `${LOCALE.DATE}: ${deletionDate}` })
                : null,
            ].filter(Boolean),
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          Skeletons.Note({ className: `${pfx}__days-badge`, content: `${daysLeft} ${LOCALE.DAYS_LEFT}` }),
          Skeletons.Button.Svg({
            ico: 'restore',
            className: `${pfx}__btn restore`,
            service: 'restore-to-desk',
            tooltips: LOCALE.RESTORE,
            uiHandler: ui,
          }),
          Skeletons.Button.Svg({
            ico: 'trash',
            className: `${pfx}__btn delete`,
            service: 'delete-permanently',
            tooltips: LOCALE.DELETE,
            uiHandler: ui,
          }),
        ],
      }),
    ],
  });
};
