const __window_topbar = function (ui) {
  const name = ui.model.get(_a.filename) || "???";
  const cnWidowButton = "window-button";
  const cnWidowTopbarTitle = "window-topbar-title";
  let settings = { kind: KIND.wrapper };
  const logo = require("../../skeleton/logo")(ui);
  const subtitle = require("../../skeleton/subtitle")(ui);
  try {
    if (ui.mget(_a.media).mget(_a.privilege) & _K.privilege.owner) {
      settings = Skeletons.Button.Svg({
        ico: "setting",
        uiHandler: ui,
        partHandler: ui,
        sys_pn: "ref-window-icon",
        className: `${cnWidowButton}__icon-button`,
        service: "show-settings",
      });
    }
  } catch (error) {}

  const figname = "topbar";

  const nameWrapper = Skeletons.Box.Y({
    className: `${ui.fig.family}__name-wrapper`,
    kids: [
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: ui,
        partHandler: ui,
        className: _a.name,
        content: name,
      }),
      subtitle,
    ],
  });

  const titleWrapper = Skeletons.Box.X({
    className: `${cnWidowTopbarTitle}__wrapper`,
    kids: [
      logo,
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: ui,
        partHandler: ui,
        className: _a.name,
        content: name,
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__badge`,
        kids: [
          Skeletons.Note({
            content: "PUBLIC",
          }),
          ,
        ],
      }),
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWidowButton}__buttons-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        className: `${cnWidowButton}__icon-bg-button`,
        ico: "desktop_confcalls",
      }),
      Skeletons.Button.Label({
        className: `${cnWidowButton}__label-button`,
        label: LOCALE.UPLOAD,
        ico: "desktop_upload",
        service: _e.upload,
        uiHandler: ui,
      }),
      settings,
      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });

  const a = Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: "browser-top-bar",
    service: _e.raise,
    debug: __filename,
    kids: [
      // require("window/skeleton/topbar/breadcrumbs")(ui),
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title`,
        kids: [
          // settings,
          titleWrapper,
          buttons,
        ],
      }),
    ],
  });
  return a;
};
module.exports = __window_topbar;
