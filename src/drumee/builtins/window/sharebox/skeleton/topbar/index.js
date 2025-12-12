
const { button } = require("../../../../skeleton/toolkit/buttons");

const __skl_window_team_topbar = function (_ui_, icon) {
  let settings;
  const media = _ui_.mget(_a.media);
  const name = _ui_.model.get(_a.filename) || "";
  const logo = require("../../../skeleton/logo")(_ui_);
  const subtitle = require("../../../skeleton/subtitle")(_ui_);

  if (icon == null || _ui_.mget(_a.media) == null) {
    settings = { kind: KIND.wrapper };
  } else {
    if (!media.isGranted(_K.permission.admin)) {
      icon = "desktop_info";
    }

    settings = Skeletons.Button.Svg({
      ico: "setting",
      uiHandler: _ui_,
      part: _ui_,
      sys_pn: "ref-window-icon",
      className: `${_ui_.fig.family}__settings icon`,
      service: "show-settings",
    });
  }

  const figname = "topbar";

  const nameWrapper = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__name-wrapper`,
    kids: [
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: _ui_,
        partHandler: _ui_,
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
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title`,
        kids: [
          // settings,
          titleWrapper,
          buttons,
        ],
      }),
      // require("./left")(_ui_),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: _ui_,
        partHandler: _ui_,
      }),

      require("window/skeleton/topbar/control")(_ui_, "c"),
    ],
  });
  return a;
};
module.exports = __skl_window_team_topbar;
