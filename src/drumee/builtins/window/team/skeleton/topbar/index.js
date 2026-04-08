const { meetingMenu } = require("../../../skeleton/toolkit/index");

const __skl_window_team_topbar = function (ui, icon) {
  let settings;
  const media = ui.mget(_a.media);
  const name = ui.model.get(_a.filename) || ui.model.get(_a.name) || "";
  const logo = require("../../../skeleton/logo")(ui);
  const cnWidowTopbarActions = "window-topbar-actions";
  const cnWidowTopbarTitle = "window-topbar-title";
  if (icon == null || ui.mget(_a.media) == null) {
    settings = { kind: KIND.wrapper };
  } else {
    if (!media.isGranted(_K.permission.admin)) {
      icon = "desktop_info";
    }

    settings = Skeletons.Button.Svg({
      ico: "setting",
      uiHandler: ui,
      part: ui,
      sys_pn: "ref-window-icon",
      className: `${cnWidowTopbarActions}__icon-button`,
      service: "show-settings",
    });
  }
  const figname = "topbar";

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
        kids: [
          Skeletons.Note({
            content: LOCALE.RESTRICTED,
          }),
          ,
        ],
      }),
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWidowTopbarActions}__buttons-wrapper`,
    kids: [
      meetingMenu(ui, {
        items: [
          {
            service: "meeting",
            ico: "logo-google",
            content: "Google Meet",
          },
          { service: "webinar", ico: "desktop_confcalls", content: "Zoom" },
          {
            service: "channel",
            ico: "desktop_confcalls",
            content: "Microsoft Teams",
          },
          {
            service: "channel",
            ico: "raw-logo-drumee-icon",
            content: "Drumee Call",
          },
        ],
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
