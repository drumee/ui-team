module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./topbar')(ui),
      require('./tabbar')(ui),
      // Approve-access overlay (Figma 63) shown when the sender clicks an
      // access-request notification. Auto-hidden while empty / closed.
      Skeletons.Box.Z({
        className: `${pfx}__ar-overlay`,
        sys_pn: 'ar-overlay',
        dataset: { mode: _a.closed },
      }),
      // Single scroll container so priority items and the smart list
      // share the same scroll axis and horizontal padding. Previously
      // the priority Box.Y sat above an independently scrolling list,
      // so pinned items had no horizontal padding and the page-scroll
      // bypassed them.
      Skeletons.Box.Y({
        className: `${pfx}__feed`,
        kids: [
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
              uiHandler: ui,
              logicalParent: ui,
            },
            vendorOpt: Preset.List.Orange_e,
            evArgs: Skeletons.Note(LOCALE.NO_NOTIFICATIONS, `${pfx}__empty`),
          }),
        ],
      }),
    ],
  });
};
