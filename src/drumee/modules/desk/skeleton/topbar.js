const { userMenu } = require('builtins/skeleton/toolkit/user');

/**
 * 
 */
function menuBar(ui) {
  const pfx = `${ui.fig.family}-topbar`;
  const icoClass = `${pfx}__icon`;
  const service = 'toggle-notification';
  return Skeletons.Box.X({
    className: `${pfx}__user-menu`,
    sys_pn: "user-menu",
    debug: __filename,
    active: 0,
    kids: [
      Skeletons.Box.X({
        kids: [
          Skeletons.Button.Svg({
            className: icoClass,
            service,
            ico: "bell",
            dataset: { service }
          }),
          Skeletons.Button.Svg({ className: icoClass, service: 'open-chat', ico: "message" }),
          Skeletons.Button.Svg({ className: icoClass, service: 'open-settings', ico: "settings" }),
          userMenu(ui)
        ]
      }),
    ]
  })
}


module.exports = function (ui) {
  const pfx = `${ui.fig.family}-topbar`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__main`,
    active: 0,
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${pfx}__logo-content`,
        kids: [
          Skeletons.Button.Svg({
            ico: "raw-logo-drumee-full",
            lassName: `${ui.fig.family}__logo-icon`,
          })
        ]
      }),
      menuBar(ui)
    ]
  });
};
