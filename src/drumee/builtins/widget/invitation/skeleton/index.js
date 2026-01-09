
export default function (ui) {
  const members = Skeletons.List.Smart({
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
      Skeletons.Box.Y({
        className: `${ui.fig.family}__container`,
        kids: [
          members,
          require("./recipients")(ui),
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