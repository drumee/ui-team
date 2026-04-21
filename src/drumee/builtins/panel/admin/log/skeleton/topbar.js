module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.AUDIT_LOGS }),
      Skeletons.Box.X({
        className: `${pfx}__topbar-actions`,
        kids: [
          Skeletons.Entry({
            className: `${pfx}__search`,
            sys_pn: 'search-input',
            placeholder: LOCALE.SEARCH_USERNAME,
            mode: 'commit',
            service: 'search',
            uiHandler: [ui],
          }),
          Skeletons.Button.Label({
            className: `${pfx}__date-filter`,
            ico: 'calendar',
            label: LOCALE.LAST_30_DAYS,
            service: 'pick-date-range',
            uiHandler: [ui],
          }),
          Skeletons.Button.Label({
            className: `${pfx}__export-btn`,
            ico: 'download',
            label: LOCALE.EXPORT_CSV,
            service: 'export-csv',
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
