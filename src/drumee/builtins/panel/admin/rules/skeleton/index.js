/* ==================================================================== *
* Widget skeleton automatically generated on 2026-04-17T03:03:26.841Z
* npm run add-widget -- --fig=admin.rules --dest=src/drumee/builtins/panel/admin/rules
* ==================================================================== */

/**
 * 
 * @param {*} ui 
 * @returns 
 */

module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      require('./creation-rules')(ui),
      require('./invite-rules')(ui),
    ],
  });
};