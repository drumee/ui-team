module.exports = function (ui) {
  const pfx = ui.fig.family;

  const alertMsg = ui.mget('alert_workspace') || '';
  const alertPct = ui.mget('alert_pct')       || '';

  return Skeletons.Box.Y({
    className: `${pfx}__side-panel`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__alert-card`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__alert-icon-wrap`,
            kids: [Skeletons.Image.Svg({ ico: 'warning', className: `${pfx}__alert-ico` })],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__alert-body`,
            kids: [
              Skeletons.Note({ className: `${pfx}__alert-title`, content: LOCALE.LOW_STORAGE_ALERT }),
              Skeletons.Note({
                className: `${pfx}__alert-desc`,
                content: alertMsg
                  ? `${alertMsg} ${LOCALE.IS_AT} ${alertPct}% ${LOCALE.CAPACITY}.`
                  : LOCALE.LOW_STORAGE_ALERT_DESC,
                sys_pn: 'alert-desc',
              }),
              Skeletons.Note({
                className: `${pfx}__alert-action`,
                content: LOCALE.ACTION_REQUIRED,
                service: 'storage-action-required',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__opt-card`,
        kids: [
          Skeletons.Note({ className: `${pfx}__opt-label`, content: LOCALE.OPTIMIZATION }),
          Skeletons.Box.X({
            className: `${pfx}__opt-row`,
            kids: [
              Skeletons.Image.Svg({ ico: 'cache', className: `${pfx}__opt-ico` }),
              Skeletons.Note({ className: `${pfx}__opt-name`, content: LOCALE.CLEAR_CACHE_FILES }),
              Skeletons.Note({
                className: `${pfx}__opt-value`,
                content: ui.mget('cache_size') || '—',
                sys_pn: 'cache-size',
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__opt-row`,
            kids: [
              Skeletons.Image.Svg({ ico: 'archive', className: `${pfx}__opt-ico` }),
              Skeletons.Note({ className: `${pfx}__opt-name`, content: LOCALE.ARCHIVE_OLD_PROJECTS }),
              Skeletons.Note({
                className: `${pfx}__opt-browse`,
                content: LOCALE.BROWSE,
                service: 'browse-archive',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
