module.exports = function (ui) {
  const pfx = ui.fig.family;
  const filename = ui.mget(_a.filename) || '';
  const ext = ui.mget(_a.ext) ? `.${ui.mget(_a.ext)}` : '';
  const filetype = ui.mget(_a.filetype) || '';
  const modifier = ui.mget(_a.modifier) || 'me';
  const mtime = ui.mget(_a.mtime);

  const deletionDate = Dayjs.unix(mtime).format(Visitor.timeformat())

  const daysLeft = mtime
    ? Math.max(0, 30 - Math.ceil((Date.now() / 1000 - mtime) / 86400))
    : 30;


  return Skeletons.Box.X({
    className: `${pfx}__row`,
    kids: [
      Skeletons.Element({
        content: require('./template')(ui),
        className: `${pfx}__file-icon ${filetype}`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__info`,
        kids: [
          Skeletons.Note({ className: `${pfx}__name`, content: `${filename}${ext}` }),
          Skeletons.Box.X({
            className: `${pfx}__meta`,
            kids: [
              Skeletons.Note({ className: `${pfx}__deleted-by`, content: `${LOCALE.DELETED_BY}: ${modifier}` }),
              Skeletons.Note({ className: `${pfx}__date`, content: `${LOCALE.DATE}: ${deletionDate}` })
            ]
          }),
        ]
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__days-badge days-badge`,
            content: LOCALE.X_DAYS_LEFT.format(daysLeft)
          }),
          Skeletons.Note({
            className: `${pfx}__btn restore`,
            service: 'restore-to-desk',
            content: LOCALE.RESTORE,
            uiHandler: ui,
          }),
          Skeletons.Button.Svg({
            ico: 'trash',
            className: `${pfx}__btn delete`,
            service: 'delete-permanently',
            // tooltips: LOCALE.DELETE,
            uiHandler: ui,
          }),
        ],
      }),
    ],
  });
};
