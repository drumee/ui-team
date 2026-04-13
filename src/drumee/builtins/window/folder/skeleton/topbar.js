const { dropdownMenuButton } = require("../../skeleton/toolkit");

const __skl_folder_topbar = function (ui) {
  let name = ui.mget(_a.filename) || ui.mget(_a.name);
  const logo = require("../../skeleton/logo")(ui);
  const subtitle = require("../../skeleton/subtitle")(ui);
  const cnWindowButton = "window-button";
  const cnWidowTopbarTitle = "window-topbar-title";

  name = Skeletons.Note({
    className: "name",
    sys_pn: "ref-window-name",
    content: name,
  });

  let downloadIcon = "";
  const nameWrapper = Skeletons.Box.Y({
    className: `${ui.fig.family}__name-wrapper`,
    kids: [name, subtitle],
  });

  const area = ui.mget(_a.area);
  const badgeLabels = {
    [_a.private]: "PRIVATE",
    [_a.share]: "SHARED",
    [_a.dmz]: "RESTRICTED",
    [_a.restricted]: "RESTRICTED",
    [_a.public]: "PUBLIC",
  };
  let badge = "";
  if (area && badgeLabels[area]) {
    badge = Skeletons.Box.X({
      className: `${ui.fig.family}__badge`,
      dataset: { area },
      kids: [
        Skeletons.Note({
          content: badgeLabels[area],
        }),
      ],
    });
  }

  const titleWrapper = Skeletons.Box.X({
    className: `${cnWidowTopbarTitle}__wrapper`,
    kids: [logo, name, badge],
  });

  let settings = Skeletons.Button.Svg({
    ico: "setting",
    className: `${ui.fig.family}__icon-button`,
    service: _e.settings,
    uiHandler: ui,
  });
  if (
    ui.mget(_a.area) == _a.personal ||
    ui.mget(_a.nid) !== !ui.mget(_a.home_id)
  ) {
    settings = "";
  }
  let buttons;
  if (ui.canUpload()) {
    buttons = Skeletons.Box.X({
      className: `${cnWindowButton}__buttons-wrapper`,
      kids: [
        dropdownMenuButton(ui, {
          className: cnWindowButton,

          trigger: Skeletons.Button.Svg({
            className: `${cnWindowButton}__icon-bg-button primary`,
            ico: "desktop_confcalls",
            uiHandler: ui,
            partHandler: ui,
          }),

          menuItems: [
            {
              service: "meeting",
              ico: "logo-google",
              content: "Google Meet",
            },
            { service: "webinar", ico: "desktop_confcalls", content: "Zoom" },
            {
              service: "channel",
              ico: "desktop_confcalls",
              content: "Microsoft Teams",
            },
            {
              service: "channel",
              ico: "raw-logo-drumee-icon",
              content: "Drumee Call",
            },
          ],
        }),

        Skeletons.Button.Label({
          className: `${cnWindowButton}__label-button`,
          label: LOCALE.UPLOAD,
          ico: "desktop_upload",
          service: _e.upload,
          uiHandler: ui,
        }),
        settings,
        require("window/skeleton/topbar/control")(ui, "c"),
      ],
    });
  }

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container u-jc-sb`,
    sys_pn: 'browser-top-bar"',
    debug: __filename,
    service: _e.raise,
    dataset: {
      group: ui.fig.group,
    },
    kids: [
      downloadIcon,
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__container ${ui.mget(_a.area)}`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.group}-${figname}__title`,
            sys_pn: "ref-window-title",
            kids: [
              // info,
              titleWrapper,
              buttons,
            ],
          }),
        ],
      }),

      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__wrapper-info`,
        name: "info",
        dataset: {
          state: _a.closed,
        },
      }),
    ],
  });

  return a;
};

module.exports = __skl_folder_topbar;
