module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./topbar')(ui),
      require('./tabbar')(ui),
      Skeletons.Box.Y({
        className: `${pfx}__priority`,
        sys_pn: 'priority',
        partHandler: ui,
      }),
      Skeletons.List.Smart({
        className: `${pfx}__list`,
        sys_pn: _a.list,
        flow: _a.none,
        spinner: true,
        spinnerWait: 500,
        api: ui.getCurrentApi,
        itemsOpt: {
          kind: 'activity_item',
          uiHandler: [ui],
        },
        vendorOpt: Preset.List.Orange_e,
        evArgs: Skeletons.Note(LOCALE.NO_NOTIFICATIONS, `${pfx}__empty`),
      }),
    ],
  });
};
