module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__pending`,
    kids: [
      Skeletons.Note({ className: `${pfx}__pending-title`, content: LOCALE.PENDING_WORKSPACE_REQUEST }),
      Skeletons.List.Smart({
        className: `${pfx}__pending-list`,
        sys_pn: 'pending-list',
        flow: _a.none,
        spinner: true,
        spinnerWait: 300,
        api: ui.getPendingRequests.bind(ui),
        itemsOpt: {
          kind: 'admin_roles_request',
          uiHandler: [ui],
        },
        vendorOpt: Preset.List.Orange_e,
        evArgs: Skeletons.Note(LOCALE.NO_PENDING_REQUESTS, `${pfx}__empty`),
      }),
    ],
  });
};
