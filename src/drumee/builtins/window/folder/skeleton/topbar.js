const { getAreaLabel, newFileMenu, visioMenu } = require("../../skeleton/toolkit");

function folderLogo() {
  return Skeletons.Image.Svg({
    ico: "folder-header",
    className: "window-topbar-title__logo",
  });
}

function viewControl(ui) {
  const state = ui.getViewMode && ui.getViewMode() === _a.row ? 1 : 0;
  return Skeletons.Button.Svg({
    ico: "square-split-horizontal",
    className: `${ui.fig.family}__icon-button`,
    service: "change-view",
    sys_pn: "view-ctrl",
    uiHandler: [ui],
    state,
    icons: ["square-split-horizontal", "square-split-horizontal"],
  });
}

function closeControl(ui) {
  return Skeletons.Button.Svg({
    ico: "x-header",
    className: `${ui.fig.family}__icon-button`,
    service: _e.close,
    uiHandler: [ui],
  });
}

const __skl_folder_topbar = function (ui) {
  let name = ui.mget(_a.filename) || ui.mget(_a.name);
  const logo = folderLogo();
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnWidowTopbarTitle = `${ui.fig.group}-topbar-title`;

  name = Skeletons.Note({
    className: "name",
    sys_pn: "ref-window-name",
    content: name,
  });

  const area = ui.mget(_a.area);
  const badgeLabel = area === _a.private ? LOCALE.PRIVATE : getAreaLabel(area) || LOCALE.RESTRICTED;
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
    ico: "gear-header",
    className: `${ui.fig.family}__icon-button ${ui.fig.family}__settings-button`,
    service: _e.settings,
    uiHandler: [ui],
  });
  if (ui.mget(_a.area) == _a.personal) {
    settings = "";
  }
  const uploadActions = ui.canUpload() ? [
    visioMenu(ui, { triggerIco: "video-camera-header" }),
    Skeletons.Button.Label({
      className: `${cnWindowButton}__label-button`,
      label: LOCALE.UPLOAD,
      ico: "upload-header",
      service: _e.upload,
      uiHandler: [ui],
    }),
    newFileMenu(ui, { triggerIco: "plus-header" }),
  ] : [];

  const buttons = Skeletons.Box.X({
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      ...uploadActions,
      settings,
      viewControl(ui),
      closeControl(ui),
    ],
  });

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container`,
    sys_pn: 'browser-top-bar"',
    debug: __filename,
    service: _e.raise,
    dataset: {
      group: ui.fig.group,
    },
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__inner ${ui.mget(_a.area)}`,
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
