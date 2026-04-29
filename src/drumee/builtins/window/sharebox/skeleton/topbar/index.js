const { visioMenu, newFileMenu, getAreaLabel } = require("../../../skeleton/toolkit/index");

const __skl_window_team_topbar = function (ui, icon) {
  let settings;
  const media = ui.mget(_a.media);
  const name = ui.model.get(_a.filename) || "";
  const logo = require("../../../skeleton/topbar/folder-icon")(ui.mget(_a.area));
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnWidowTopbarTitle = `${ui.fig.group}-topbar-title`;

  if (icon == null || ui.mget(_a.media) == null) {
    settings = { kind: KIND.wrapper };
  } else {
    if (!media.isGranted(_K.permission.admin)) {
      icon = "desktop_info";
    }

    settings = Skeletons.Button.Svg({
      ico: "setting",
      uiHandler: ui,
      part: ui,
      sys_pn: "ref-window-icon",
      className: `${cnWindowButton}__icon-button`,
      service: "show-settings",
    });
  }

  const figname = "topbar";

  const titleWrapper = Skeletons.Box.X({
    className: `${cnWidowTopbarTitle}__wrapper`,
    kids: [
      logo,
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: ui,
        partHandler: ui,
        className: _a.name,
        content: name.withoutTag(),
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__badge`,
        kids: [
          Skeletons.Note({
            content: getAreaLabel(ui.mget(_a.area)),
          }),
          ,
        ],
      }),
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      visioMenu(ui),
      newFileMenu(ui),
      Skeletons.Button.Label({
        className: `${cnWindowButton}__label-button`,
        label: LOCALE.UPLOAD,
        ico: "desktop_upload",
        service: _e.upload,
        uiHandler: ui,
      }),
      settings,
      // Skeletons.Button.Svg({
      //   className: `${cnWindowButton}__icon-bg-button`,
      //   ico: "folder-meeting",
      //   uiHandler: ui,
      //   partHandler: ui,
      //   service: "open-call-panel",
      // }),
      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });
  const a = Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title`,
        kids: [
          // settings,
          titleWrapper,
          buttons,
        ],
      }),
      // require("./left")(ui),

      Skeletons.Wrapper.Y({
        className: `${ui.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: ui,
        partHandler: ui,
      }),
    ],
  });
  return a;
};
module.exports = __skl_window_team_topbar;
