/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const { button } = require("../../../../skeleton/toolkit/buttons");

const __skl_window_team_topbar = function (_ui_, icon) {
  let settings;
  const media = _ui_.mget(_a.media);
  const name = _ui_.model.get(_a.filename) || "";
  const logo = require("../../../folder/skeleton/logo")(_ui_);
  const subtitle = require("../../../folder/skeleton/subtitle")(_ui_);

  if (icon == null || _ui_.mget(_a.media) == null) {
    settings = { kind: KIND.wrapper };
  } else {
    if (!media.isGranted(_K.permission.admin)) {
      icon = "desktop_info";
    }

    settings = Skeletons.Button.Svg({
      ico: "editbox_cog",
      uiHandler: _ui_,
      part: _ui_,
      sys_pn: "ref-window-icon",
      className: "icon",
      service: "show-settings",
    });
  }

  const figname = "topbar";

  const titleWrapper = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__title-wrapper`,
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
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.group}-${figname}__container ${_ui_.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title`,
        kids: [
          logo,
          // Skeletons.Note({
          //   sys_pn: "ref-window-name",
          //   uiHandler: _ui_,
          //   partHandler: _ui_,
          //   className: _a.name,
          //   content: name.withoutTag(),
          // }),
          titleWrapper,
          settings,
          button(_ui_, {
            label: "Upload new File",
            className: `${_ui_.fig.family}__upload-button`,
            service: "",
            priority: "primary",
          }),
        ],
      }),
      require("./left")(_ui_),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: _ui_,
        partHandler: _ui_,
      }),

      require("window/skeleton/topbar/control")(_ui_),
    ],
  });
  return a;
};
module.exports = __skl_window_team_topbar;
