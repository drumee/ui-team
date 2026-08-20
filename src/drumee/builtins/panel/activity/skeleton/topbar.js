module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.NOTIFICATIONS }),
      // Mobile-only close button (hidden on desktop via CSS). Routes to the
      // panel's own `close-activity-panel` handler → _hide(). On mobile this
      // is the only way to dismiss the card (outside-tap close is disabled
      // there — see _onOutsideClick); desktop still closes via the sidebar
      // toggle / outside click.
      Skeletons.Button.Svg({
        ico: 'cross',
        className: `${pfx}__close-btn`,
        service: 'close-activity-panel',
        uiHandler: [ui],
      }),
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
          Skeletons.Box.X({
            className: `${pfx}__unread-toggle`,
            sys_pn: 'unread-toggle',
            service: 'toggle-unreads',
            state: ui._unreadsOnly ? 1 : 0,
            uiHandler: ui,
            partHandler: ui,
            // `active: 0` on EVERY descendant, not via `kidsOpt`, and not only on
            // the direct kids. kidsOpt is a no-op — ui-core's mergeKidsOptions
            // rebinds its local `item` and discards the map result — and `active`
            // does not cascade either: letc.js gates the binding per widget with
            // `if (!active) return`. Any active element in the click path binds
            // its own onclick, and __handleClick calls stopPropagation() BEFORE
            // triggerHandlers, so the click dies there and `toggle-unreads`
            // never fires. Before this, only the bare padding around the label
            // and track toggled Unreads. Same cause and fix as 97be5a4e (#510).
            kids: [
              Skeletons.Note({
                className: `${pfx}__unread-label`,
                content: LOCALE.UNREADS,
                active: 0,
              }),
              Skeletons.Box.X({
                className: `${pfx}__toggle-track`,
                active: 0,
                kids: [
                  Skeletons.Box.X({ className: `${pfx}__toggle-thumb`, active: 0 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
