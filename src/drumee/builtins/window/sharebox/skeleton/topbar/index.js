
const { button } = require("../../../../skeleton/toolkit/buttons");

const __skl_window_team_topbar = function (ui, icon) {
  let settings;
  const media = ui.mget(_a.media);
  const name = ui.model.get(_a.filename) || "";
  const logo = require("../../../skeleton/logo")(ui);
  const subtitle = require("../../../skeleton/subtitle")(ui);

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
      className: `${ui.fig.family}__settings icon`,
      service: "show-settings",
    });
  }

  const figname = "topbar";

  const nameWrapper = Skeletons.Box.Y({
    className: `${ui.fig.family}__name-wrapper`,
    kids: [
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: ui,
        partHandler: ui,
        className: _a.name,
        content: name.withoutTag(),
      }),
      ,
      subtitle,
    ],
  });

  const titleWrapper = Skeletons.Box.X({
    kids: [logo, nameWrapper],
  });

  const settingsButton = Skeletons.Box.X({
    className: `${ui.fig.family}__settings`,
    kids: [settings],
  });

  const buttons = Skeletons.Box.X({
    className: `${ui.fig.family}__buttons-wrapper`,
    kids: [
      button(ui, {
        label: LOCALE.UPLOAD,
        className: `${ui.fig.family}__upload-button`,
        service: _e.upload,
        priority: "primary",
      }),
      settingsButton,
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

      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });
  return a;
};
module.exports = __skl_window_team_topbar;
