module.exports = function (ui) {
  const pfx = ui.fig.family;
  let dataCount = 0;
  if (ui.data !== null) {
    dataCount = ui.data.length;
  }

  // const notificationIcon = Skeletons.Box.X({
  //   debug     : __filename,
  //   className   : `${ui.fig.family}__container`,
  //   kids : [
  //     Skeletons.Button.Svg({
  //       ico       : 'bell',//desktop_delete'
  //       className : `${pfx}___ico_button notification-bell`, 
  //       service   : 'open-notification-panel',
  //       sys_pn    : "notification-bell-ico",
  //       uiHandler : ui
  //     }),

  //     Skeletons.Note({
  //       service    : 'counter',
  //       sys_pn     : 'notification-counter',
  //       className  : `${ui.fig.family}__digit `,
  //       innerClass : `${ui.fig.group}__btn-counter`,
  //       content    : dataCount,
  //       dataset    : { 
  //         state    : dataCount ? _a.open : _a.closed
  //       }
  //     })
  //   ]});

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    sys_pn: "notification-container",
    debug: __filename,
    kids: [
      // notificationIcon,
      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__overlay`,
        name: "notification_overlay"
      })
    ]
  });
};
