
export default function (ui) {
  let { topbar, recipients } = require("../../../widget/settings/hub/skeleton/toolkit");
  let members = Skeletons.List.Smart({
    flow: _a.vertical,
    sys_pn: "existing-members",
    className: `${ui.fig.family}__members`,
    debug: __filename,
    itemsOpt: {
      kind: 'settings_member',
      uiHandler: [ui],
    },
    vendorOpt: Preset.List.Orange_d,
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      // Preset.Button.Close(ui),
      topbar(ui, "Manage members list"),
      Skeletons.Box.Y({
        className: `${ui.fig.family}__container`,
        kids: [
          members,
          // require("./recipients")(ui),
          recipients(ui),
          // require("./options-bar")(ui),
          require("./actions-bar")(ui),
        ]
      }),
      Skeletons.Wrapper.Y({
        sys_pn: "settings",
        className: `${ui.fig.family}__settings-overlay`
      }),
    ]
  })
}