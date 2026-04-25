const { getAreaLabel, newFileMenu, visioMenu } = require("../../skeleton/toolkit");

const __skl_folder_topbar = function (ui) {
  let name = ui.mget(_a.filename) || ui.mget(_a.name);
  const logo = require("../../skeleton/logo")(ui);
  const subtitle = require("../../skeleton/subtitle")(ui);
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnWidowTopbarTitle = `${ui.fig.group}-topbar-title`;

  name = Skeletons.Note({
    className: "name",
    sys_pn: "ref-window-name",
    content: name,
  });

  let downloadIcon = "";

  const area = ui.mget(_a.area);
  const badgeLabel = getAreaLabel(area) || LOCALE.RESTRICTED;
  let badge = "";
  if (area && badgeLabel) {
    badge = Skeletons.Box.X({
      className: `${ui.fig.family}__badge`,
      dataset: { area },
      kids: [
        Skeletons.Note({
          content: badgeLabel
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
    uiHandler: [ui],
  });
  if (ui.mget(_a.area) == _a.personal) {
    settings = "";
  }
  let buttons;
  if (ui.canUpload()) {
    buttons = Skeletons.Box.X({
      className: `${cnWindowButton}__buttons-wrapper`,
      kids: [
        visioMenu(ui),
        newFileMenu(ui),
        Skeletons.Button.Label({
          className: `${cnWindowButton}__label-button`,
          label: LOCALE.UPLOAD,
          ico: "desktop_upload",
          service: _e.upload,
          uiHandler: [ui],
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
