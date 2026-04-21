/* ==================================================================== *
* Widget skeleton automatically generated on 2026-04-17T03:11:41.830Z
* npm run add-widget -- --fig=admin.permissions --dest=src/drumee/builtins/panel/admin/permissions
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
      require('./topbar')(ui),
      require('./stats')(ui),
      {
        kind: 'admin_rules',
        className: `${pfx}__rules`,
        sys_pn: 'rules',
        partHandler: ui,
        uiHandler: [ui],
        creation_rule:    ui.mget('creation_rule'),
        collab_rule:      ui.mget('collab_rule'),
        sender_rule:      ui.mget('sender_rule'),
        require_approval: ui.mget('require_approval'),
      },
      require('./pending')(ui),
    ],
  });
};