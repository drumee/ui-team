const { filesize } = require('@drumee/ui-essentials');

// One label/value line; rows with no value are dropped (feed filters null).
const row = (pfx, label, value) => {
  if (value == null || value === '') return null;
  return Skeletons.Box.X({
    className: `${pfx}__row`,
    kids: [
      Skeletons.Note({ content: label, className: `${pfx}__label` }),
      Skeletons.Note({ content: String(value), className: `${pfx}__value` }),
    ],
  });
};

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const fmt = (ts) => (ts ? Dayjs(ts * 1000).format('DD/MM/YYYY HH:mm') : null);

  const ext = (ui.mget(_a.ext) || ui.mget('extension') || '').toUpperCase();
  const mimetype = ui.mget('mimetype');
  const type = [ext, mimetype].filter(Boolean).join(' · ');
  const size = ui.mget(_a.filesize) ? filesize(ui.mget(_a.filesize)) : null;
  const name = (typeof ui.fullname === 'function' && ui.fullname()) || ui.mget(_a.filename);
  const location = ui.mget('file_path') || ui.mget(_a.filepath) || ui.mget('parent_path');

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({ content: LOCALE.DETAILS, className: `${pfx}__title` }),
          Skeletons.Button.Svg({
            ico: 'cross',
            service: _e.close,
            uiHandler: [ui],
            className: `${pfx}__close`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__body`,
        kids: [
          row(pfx, LOCALE.FILENAME, name),
          row(pfx, LOCALE.TYPE, type),
          row(pfx, LOCALE.SIZE, size),
          row(pfx, LOCALE.CREATED, fmt(ui.mget('ctime'))),
          row(pfx, LOCALE.MODIFIED, fmt(ui.mget('mtime'))),
          row(pfx, LOCALE.OWNER, ui.mget('username')),
          row(pfx, LOCALE.LOCATION, location),
        ].filter(Boolean),
      }),
    ],
  });
};
