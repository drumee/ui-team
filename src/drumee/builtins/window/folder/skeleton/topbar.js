const { button } = require("../../../skeleton/toolkit/buttons");

const __skl_folder_topbar = function (ui) {
  let name = ui.mget(_a.filename) || ui.mget(_a.name);
  const logo = require("../../skeleton/logo")(ui);
  const subtitle = require("../../skeleton/subtitle")(ui);


  name = Skeletons.Note({
    className: "name",
    sys_pn: "ref-window-name",
    content: name,
  });

  let downloadIcon = "";
  // ui.debug("AAA:16", ui)
  // if (Visitor.parseModule().includes(_a.dmz)) {
  //   if (ui.canDownload()) {
  //     downloadIcon = Skeletons.Button.Svg({
  //       ico: "download",
  //       className: `${ui.fig.family}__icon download link`,
  //       sys_pn: "download-button",
  //       service: _e.download,
  //       token: ui.mget(_a.token) || "",
  //     });
  //   }
  // }

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

  let buttons;
  if (ui.canUpload()) {
    buttons = Skeletons.Box.X({
      className: `${ui.fig.family}__buttons-wrapper`,
      kids: [
        button(ui, {
          label: LOCALE.UPLOAD,
          className: `${ui.fig.family}__upload-button`,
          service: _e.upload,
          priority: "primary",
        }),
        settings,
      ],
    });
  }

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
      // require("window/skeleton/topbar/breadcrumbs")(ui),

      downloadIcon,

      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__container ${ui.mget(
          _a.area
        )}`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.group}-${figname}__title`,
            sys_pn: "ref-window-title",
            kids: [
              // info,
              titleWrapper,
              buttons,
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
