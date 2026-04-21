module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./topbar')(ui),
      Skeletons.Box.Y({
        className: `${pfx}__table-wrap`,
        kids: [
          require('./table-header')(ui),
          Skeletons.List.Smart({
            className: `${pfx}__list`,
            sys_pn: 'log-list',
            flow: _a.none,
            spinner: true,
            spinnerWait: 300,
            api: ui.getLogs.bind(ui),
            itemsOpt: { kind: 'admin_log_item', uiHandler: [ui] },
            vendorOpt: Preset.List.Orange_e,
            evArgs: Skeletons.Note(LOCALE.NO_ENTRIES, `${pfx}__empty`),
          }),
          require('./table-footer')(ui),
        ],
      }),
      require('./stats')(ui),
    ],
  });
};
