const { button } = require("../../../skeleton/toolkit/buttons");

const __skl_folder_topbar = function (ui) {
  const logo = require("../../skeleton/logo")(ui);
  const subtitle = require("../../skeleton/subtitle")(ui);


  let name = Skeletons.Note({
    className: "name",
    sys_pn: "ref-window-name",
    content: LOCALE.SEARCH_RESULTS,
  });

  const nameWrapper = Skeletons.Box.Y({
    className: `${ui.fig.family}__name-wrapper`,
    kids: [name, subtitle],
  });

  const titleWrapper = Skeletons.Box.X({
    kids: [logo, nameWrapper],
  });

  const settings = Skeletons.Box.X({
    className: `${ui.fig.family}__settings`,
    kids: [
      Skeletons.Button.Svg({
        ico: "setting",
        className: `${ui.fig.family}__settings icon`,
        service: _e.settings,
        uiHandler: ui,
      }),
    ],
  });

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container u-jc-sb`,
    sys_pn: 'browser-top-bar"',
    debug: __filename,
    service: _e.raise,
    dataset: {
      group: ui.fig.group,
    },
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__container ${ui.mget(
          _a.area
        )}`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.group}-${figname}__title`,
            sys_pn: "ref-window-title",
            kids: [
              titleWrapper,
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

      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });

  return a;
};

module.exports = __skl_folder_topbar;
