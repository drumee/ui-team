/* ==================================================================== *
* Widget skeleton automatically generated on 2026-04-17T03:26:09.142Z
* npm run add-widget -- --fig=admin.security --dest=src/drumee/builtins/panel/admin/security
* ==================================================================== */

/**
 * 
 * @param {*} ui 
 * @returns 
 */

module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      Skeletons.Note({ className: `${pfx}__page-title`, content: LOCALE.SECURITY_GOVERNANCE }),
      Skeletons.Box.X({
        className: `${pfx}__top-row`,
        kids: [
          require('./tfa')(ui),
          require('./sso')(ui),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__overview`,
        kids: [
          Skeletons.Note({ className: `${pfx}__overview-title`, content: LOCALE.WORKSPACE_SECURITY_OVERVIEW }),
          Skeletons.List.Smart({
            className: `${pfx}__ws-grid`,
            sys_pn: 'ws-grid',
            flow: 'wrap',
            spinner: true,
            spinnerWait: 300,
            api: ui.getWorkspaces.bind(ui),
            itemsOpt: {
              kind: 'admin_security_workspace',
              uiHandler: [ui],
            },
            vendorOpt: Preset.List.Orange_e,
            evArgs: Skeletons.Note(LOCALE.NO_WORKSPACES, `${pfx}__empty`),
          }),
        ],
      }),
    ],
  });
};