const { button } = require("../../../skeleton/toolkit/buttons");
const { breadcrumbs } = require("../../skeleton/toolkit");

const __window_topbar = function (ui) {
  const name = ui.model.get(_a.filename) || "???";
  const cnWidowTopbarActions = "window-topbar-actions";
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
        className: `${cnWidowTopbarActions}__icon-button`,
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
    className: `${ui.fig.family}__title-wrapper`,
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
            content: "SHARED",
          }),
          ,
        ],
      }),
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWidowTopbarActions}__buttons-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        className: `${cnWidowTopbarActions}__icon-bg-button`,
        ico: "desktop_confcalls",
      }),
      Skeletons.Button.Label({
        className: `${cnWidowTopbarActions}__label-button`,
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
