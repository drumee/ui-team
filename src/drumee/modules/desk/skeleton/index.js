const _desk_main = function (ui) {


  const a = Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    debug: __filename,

    kids: [
      Skeletons.Wrapper.Y({
        // name: "popup",
        sys_pn: "wrapper-popup",
        className: `${ui.fig.family}__modal-container`,
        flow: _a.none,
        wrapper: 1,
        uiHandler: ui
      }),

      Skeletons.Box.Y({
        sys_pn: "top-bar",
        className: `${ui.fig.family}__topbar`,
        kids: [require('./topbar')(ui)]
      }),

      // Skeletons.Box.Y({
      //   sys_pn: "user-container",
      //   className: `${ui.fig.family}__topbar-user-container`,
      //   kids: [require('desk/skeleton/common/topbar/user')(ui)],
      //   uiHandler: ui,
      //   partHandler: [ui]
      // }),

      Skeletons.Box.Y({
        sys_pn: "notification-container",
        className: `${ui.fig.family}__notification-container`,
        kids: [
          {
            sys_pn: "notification-panel",
            kind: 'notification_panel',
            uiHandler: [ui],
            partHandler: [ui]
          }
        ],
        uiHandler: ui,
        partHandler: [ui]
      }),

      // Skeletons.Wrapper.Y({
      //   name: "module",
      //   uiHandler: ui,
      //   className: `u-jc-center absolute ${ui.fig.family}__wrapper --module am-wrapper desk-account`
      // }),

      // Skeletons.Wrapper.Y({
      //   name: "chat",
      //   uiHandler: ui,
      //   className: "desk-chat"
      // }),

      Skeletons.Box.X({
        sys_pn: "desk-wrapper",
        className: `${ui.fig.family}__wm-container`,
        kids: [{
          kind: 'window_manager',
          sys_pn: "desk-content",
        }]
      }),

      Skeletons.Box.Y({
        className: "desk__tooltip",
        sys_pn: "desk-tooltip",
        wrapper: 1
      })
    ]
  });


  return a;
};
module.exports = _desk_main;
