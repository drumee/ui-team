module.exports = function (ui) {
  const pfx = ui.fig.family;

  const iconCard = Skeletons.Box.Y({
    className: `${pfx}__placeholder-card`,
    kids: [
      Skeletons.Image.Svg({ ico: 'trash-list', className: `${pfx}__placeholder-card-icon` }),
      Skeletons.Image.Svg({ ico: 'check-circle', className: `${pfx}__placeholder-card-badge` }),
    ],
  });

  const content = Skeletons.Box.Y({
    className: `${pfx}__placeholder-content`,
    kids: [
      iconCard,
      Skeletons.Note({ className: `${pfx}__placeholder-title`, content: LOCALE.NOTHING_IN_TRASH }),
      Skeletons.Button.Label({
        className: `${pfx}__placeholder-refresh-btn`,
        ico: 'refresh',
        label: LOCALE.REFRESH_VIEW,
        service: 'refresh',
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${pfx}__placeholder-history`,
        content: LOCALE.VIEW_HISTORY,
        service: 'view-history',
        uiHandler: ui,
      }),
      Skeletons.Note({
        className: `${pfx}__placeholder-hint`,
        content: LOCALE.TRASH_EMPTY_HINT,
      }),
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${pfx}__placeholder-footer`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__placeholder-storage`,
        sys_pn: 'storage-info',
        content: LOCALE.STORAGE_USED,
      }),
      Skeletons.Note({
        className: `${pfx}__placeholder-policy`,
        content: LOCALE.CLEANUP_POLICY,
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__placeholder`,
    debug: __filename,
    kids: [content, footer],
  });
};
