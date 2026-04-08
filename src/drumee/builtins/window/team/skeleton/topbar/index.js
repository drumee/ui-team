const { button } = require("../../../../skeleton/toolkit/buttons");

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

  const area = ui.mget(_a.area);
  const badgeLabels = {
    [_a.private]: LOCALE.PRIVATE || "PRIVATE",
    [_a.share]: LOCALE.SHARED || "SHARED",
    [_a.dmz]: LOCALE.RESTRICTED || "RESTRICTED",
    [_a.restricted]: LOCALE.RESTRICTED || "RESTRICTED",
    [_a.public]: LOCALE.PUBLIC || "PUBLIC",
  };
  const badgeLabel = badgeLabels[area] || LOCALE.RESTRICTED;

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
    className: `${cnWidowTopbarActions}__buttons-wrapper`,
    kids: [
      require("../../../skeleton/topbar/meeting-menu")(ui),
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
