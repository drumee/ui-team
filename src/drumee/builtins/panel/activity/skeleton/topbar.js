module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.NOTIFICATIONS }),
      Skeletons.Box.X({
        className: `${pfx}__topbar-actions`,
        kids: [
          Skeletons.Button.Label({
            className: `${pfx}__mark-read-btn`,
            // Figma header (58187:81144) uses the DOUBLE tick `Checks`, not the
            // single `desktop_check` — "mark as all read" is a read-receipt
            // gesture, and one tick reads as a plain confirm.
            ico: 'noti-checks',
            label: LOCALE.MARK_ALL_READ,
            service: 'clear-all',
            uiHandler: [ui],
          }),
          // Filter button + popup (All / Unread / Bookmarked). Replaces the
          // Unreads toggle: its ON state is the `unread` filter.
          require('./view-filter')(ui),
        ],
      }),
      // Close button, on every device. LAST, so on desktop it sits at the end
      // of the header after the actions; on mobile the skin pins it to the
      // card's corner out of flow, where source order does not matter. Routes to
      // the panel's `close-activity-panel` handler. On mobile it is the only way
      // to dismiss the card (outside-tap close is disabled there — see
      // _onOutsideClick).
      Skeletons.Button.Svg({
        ico: 'cross',
        className: `${pfx}__close-btn`,
        service: 'close-activity-panel',
        uiHandler: [ui],
      }),
    ],
  });
};
