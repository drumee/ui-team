const { button } = require("../../../skeleton/toolkit/buttons");
const { breadcrumbs } = require("../../skeleton/toolkit");

const __window_topbar = function (ui) {
  const name = ui.model.get(_a.filename) || "???";
  const cnWidowUploadBtn = "window-button—upload";
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
        className: `${ui.fig.family}__settings icon`,
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
    kids: [logo, nameWrapper],
  });

  const settingsButton = Skeletons.Box.X({
    className: `${cnWidowUploadBtn}__settings`,
    sys_pn: "settings-box",
    kids: [settings],
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWidowUploadBtn}__buttons-wrapper`,
    kids: [
      button(ui, {
        label: LOCALE.UPLOAD,
        className: `${cnWidowUploadBtn}__upload-button`,
        service: _e.upload,
        priority: "primary",
      }),
      settingsButton,
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
      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });
  return a;
};
module.exports = __window_topbar;
