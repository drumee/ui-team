module.exports = function (ui) {
  const pfx = 'media-context-menu';

  const item = (service, ico, content) =>
    Skeletons.Box.X({
      className: `${pfx}__item`,
      uiHandler: [ui],
      service,
      kids: [
        Skeletons.Button.Svg({ ico, className: `${pfx}__item-icon` }),
        Skeletons.Note({ content, className: `${pfx}__item-label` }),
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__dropdown`,
    sys_pn: 'context-menu',
    dataset: { state: '0' },
    kids: [
      item(_e.download,  'desktop_download', LOCALE.DOWNLOAD    ),
      item(_e.rename,    'desktop_edit',     LOCALE.RENAME      ),
      item('organize',   'dock-folder',      LOCALE.ORGANIZE    ),
      item(_a.duplicate, 'desktop_copy',     LOCALE.MAKE_A_COPY ),
      item(_a.chat,      'tchat',            LOCALE.CHAT        ),
      item(_e.remove,    'desktop_delete',   LOCALE.DELETE      ),
    ],
  });
};
