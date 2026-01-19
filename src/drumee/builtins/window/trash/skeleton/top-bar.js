// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __skl_trash_topbar
//
// @param [Object] _ui_
//
// @return [Object]
//
// ===========================================================
const __skl_trash_topbar = function (_ui_) {
  const figname = "topbar";

  const toggleButton = Skeletons.Box.X({
    className: `${_ui_.fig.family}__toggle-button checkbox`,
    kidsOpt: { active: 0 },
    uiHandler: _ui_,
    state: 0,
    kids: [
      Skeletons.Button.Svg({
        className: `${_ui_.fig.family}__toggle-button icon`,
        ico: "checkbox",
        state: 0,
        sys_pn: "checkbox",
      }),
      Skeletons.Note({
        className: `${_ui_.fig.family}__toggle-button note`,
        content: "Automatically empty after 30 days.",
      }),
    ],
  });

  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}-${figname}__container u-jc-sb`,
    sys_pn: "browser-top-bar",
    debug: __filename,
    service: _e.raise,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}-${figname}__title u-ai-center`,
        kids: [Skeletons.Note(LOCALE.ARCHIVES)],
      }),

      Skeletons.Box.X({
        className: `${_ui_.fig.family}__buttons-wrapper`,
        kids: [
          toggleButton,

          !Visitor.isMimicActiveUser()
            ? Skeletons.Box.X({
                className: `${_ui_.fig.family}-${figname}__title purge`,
                kids: [
                  Skeletons.Note({
                    content: LOCALE.PURGE,
                    className: "purge",
                    service: "empty-bin",
                    uiHandler: _ui_,
                  }),
                ],
              })
            : undefined,
        ],
      }),
      require("window/skeleton/topbar/control")(_ui_, "c"),
    ],
  });

  return a;
};
module.exports = __skl_trash_topbar;
