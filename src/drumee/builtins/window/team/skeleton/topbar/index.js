const {
  newFileMenu,
  visioMenu,
  getAreaLabel,
} = require("../../../skeleton/toolkit");

const __skl_window_team_topbar = function (ui, icon) {
  let settings;
  const media = ui.mget(_a.media);
  const name = ui.model.get(_a.filename) || ui.model.get(_a.name) || "";
  const logo = require("../../../skeleton/topbar/folder-icon")(
    ui.mget(_a.area),
  );
  const cnWindowButton = "window-button";
  const cnWidowTopbarTitle = "window-topbar-title";
  if (icon == null || ui.mget(_a.media) == null) {
    settings = { kind: KIND.wrapper };
  } else {
    if (!media.isGranted(_K.permission.admin)) {
      icon = "desktop_info";
    }

    settings = Skeletons.Button.Svg({
      ico: "folder-settings",
      uiHandler: ui,
      part: ui,
      sys_pn: "ref-window-icon",
      className: `${cnWindowButton}__icon-button`,
      service: "show-settings",
    });
  }
  const figname = "topbar";

  const area = ui.mget(_a.area);
  const badgeLabel = getAreaLabel(area) || LOCALE.RESTRICTED;

  const titleWrapper = Skeletons.Box.X({
    className: `${cnWidowTopbarTitle}__wrapper`,
    kids: [
      logo,
      Skeletons.Note({
        sys_pn: "ref-window-name",
        uiHandler: ui,
        partHandler: ui,
        className: _a.name,
        content: name.withoutTag(),
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__badge`,
        dataset: { area },
        kids: [
          Skeletons.Note({
            content: badgeLabel,
          }),
        ],
      }),
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      visioMenu(ui),
      Skeletons.Button.Svg({
        className: `${cnWindowButton}__icon-bg-button`,
        ico: "folder-meeting",
        uiHandler: ui,
        partHandler: ui,
        service: "start-meeting",
        attrOpt: { title: LOCALE.DRUMEE_CALL },
      }),
      newFileMenu(ui),
      Skeletons.Button.Label({
        className: `${cnWindowButton}__label-button`,
        label: LOCALE.UPLOAD,
        ico: "folder-upload",
        service: _e.upload,
        uiHandler: ui,
      }),
      settings,
      Skeletons.Button.Svg({
        ico: "folder-split-window",
        uiHandler: ui,
        part: ui,
        sys_pn: "ref-window-icon",
        className: `${cnWindowButton}__icon-button`,
        service: "",
      }),
      require("window/skeleton/topbar/control")(ui, "c"),
    ],
  });

  return Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container ${ui.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      // require("./left")(ui),
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title`,
        kids: [titleWrapper, buttons],
      }),
      Skeletons.Wrapper.Y({
        className: `${ui.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: ui,
        partHandler: ui,
      }),
    ],
  });
};
module.exports = __skl_window_team_topbar;
