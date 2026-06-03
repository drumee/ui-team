const _build_mobile_topbar = (ui) => {
  const fig = ui.fig.family;

  return Skeletons.Box.X({
    className: `${fig}__mobile-topbar`,
    sys_pn: "mobile-topbar",
    kids: [
      Skeletons.Box.X({
        className: `${fig}__mobile-topbar-logo`,
        kids: [
          Skeletons.Image.Svg({
            ico: "raw-logo-drumee-full",
            className: `${fig}__mobile-topbar-logo-icon`,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__mobile-topbar-wrapper`,
        kids: [
          Skeletons.Button.Svg({
            ico: "add",
            className: `${fig}__mobile-topbar-btn add`,
            service: "mobile-show-add",
            uiHandler: [ui],
            sys_pn: "mobile-add-btn",
          }),
          Skeletons.Button.Svg({
            ico: "bars",
            className: `${fig}__mobile-topbar-btn menu`,
            service: "mobile-show-menu",
            uiHandler: [ui],
            sys_pn: "mobile-menu-btn",
          }),
        ],
      }),
    ],
  });
};

const _desk_main = function (ui) {
  const isMobile = Visitor.isMobile();

  const bodyKids = [
    require("./sidebar")(ui),
    Skeletons.Box.Y({
      sys_pn: "panel",
      className: `${ui.fig.family}__panel-container left`,
      kids: [
        Skeletons.Box.Y({
          sys_pn: "trash-panel",
          className: `${ui.fig.family}__panel-inner`,
        }),
        Skeletons.Box.Y({
          className: `${ui.fig.family}__panel-inner`,
          kids: [
            {
              kind: "panel_activity",
              sys_pn: "activity-panel",
              state: 0,
              uiHandler: [ui],
            },
          ],
        }),
        Skeletons.Box.Y({
          sys_pn: "settings-panel",
          className: `${ui.fig.family}__panel-inner`,
        }),
      ],
    }),
    Skeletons.Box.Y({
      sys_pn: "desk-body",
      className: `${ui.fig.family}__right-side`,
      kids: [
        Skeletons.Box.Y({
          sys_pn: "top-bar",
          className: `${ui.fig.family}__topbar`,
          kids: [require("./topbar")(ui)],
        }),
        Skeletons.Box.X({
          sys_pn: "desk-wrapper",
          className: `${ui.fig.family}__wm-container`,
          kids: [
            {
              kind: "window_manager",
              sys_pn: "desk-content",
            },
            Skeletons.Box.Y({
              sys_pn: "settings-main-slot",
              className: `${ui.fig.family}__settings-main-slot`,
            }),
          ],
        }),
      ],
    }),
    Skeletons.Box.Y({
      sys_pn: "chat-panel",
      className: `${ui.fig.family}__panel-container right`,
    }),
    Skeletons.Wrapper.Y({
      sys_pn: "overlay",
      className: `${ui.fig.family}__overlay`,
      // On mobile the overlay doubles as the tap-to-close backdrop for
      // the sidebar drawer. Service routing is wired at construction
      // so the very first tap fires (no async listener binding race).
      ...(isMobile ? { uiHandler: [ui], service: "mobile-close-drawer" } : {}),
    }),
  ];

  const mainKids = [
    Skeletons.Box.X({
      className: `${ui.fig.family}__body`,
      kids: bodyKids,
    }),
  ];

  if (isMobile) {
    mainKids.unshift(_build_mobile_topbar(ui));
  }

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    debug: __filename,
    sys_pn: "main",
    dataset: {
      wallpaper: ui._wallpaper,
    },
    kids: mainKids,
  });
};

module.exports = _desk_main;
