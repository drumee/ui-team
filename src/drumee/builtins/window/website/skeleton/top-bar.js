
const { button } = require("../../../skeleton/toolkit/buttons");

const __window_topbar = function (_ui_) {
  const name = _ui_.model.get(_a.filename) || "???";
  let settings = { kind: KIND.wrapper };
  const logo = require("../../skeleton/logo")(_ui_);
  const subtitle = require("../../skeleton/subtitle")(_ui_);
  try {
    if (_ui_.mget(_a.media).mget(_a.privilege) & _K.privilege.owner) {
      settings = Skeletons.Button.Svg({
        ico: "setting",
        uiHandler: _ui_,
        partHandler: _ui_,
        sys_pn: "ref-window-icon",
        className: `${_ui_.fig.family}__settings icon`,
        service: "show-settings",
      });
    }
  } catch (error) { }

  const figname = "topbar";

  const nameWrapper = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__name-wrapper`,
    kids: [
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: _ui_,
        partHandler: _ui_,
        className: _a.name,
        content: name,
      }),

      ,
      subtitle,
    ],
  });

  const titleWrapper = Skeletons.Box.X({
    kids: [logo, nameWrapper],
  });

  const settingsButton = Skeletons.Box.X({
    className: `${_ui_.fig.family}__settings`,
    kids: [settings],
  });

  const buttons = Skeletons.Box.X({
    className: `${_ui_.fig.family}__buttons-wrapper`,
    kids: [
      button(_ui_, {
        label: LOCALE.UPLOAD,
        className: `${_ui_.fig.family}__upload-button`,
        service: _e.upload,
        priority: "primary",
      }),
      settingsButton,
    ],
  });

  const a = Skeletons.Box.X({
    className: `${_ui_.fig.group}-${figname}__container ${_ui_.mget(_a.area)}`,
    sys_pn: "browser-top-bar",
    service: _e.raise,
    debug: __filename,
    kids: [
      // require("window/skeleton/topbar/breadcrumbs")(_ui_),
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title`,
        kids: [
          // settings,
          titleWrapper,
          buttons,
        ],
      }),
      require("window/skeleton/topbar/control")(_ui_, "c"),
    ],
  });
  return a;
};
module.exports = __window_topbar;
