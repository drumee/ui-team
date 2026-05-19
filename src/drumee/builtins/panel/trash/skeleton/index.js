module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__main ${ui.fig.group}__main`,
    debug: __filename,
    kids: [
      require("./topbar")(ui),
      Skeletons.List.Smart({
        className: `${pfx}__list`,
        sys_pn: _a.list,
        flow: _a.none,
        spinner: true,
        spinnerWait: 500,
        itemsOpt: {
          kind: "panel_trash_item",
          logicalParent: ui,
          uiHandler: ui,
        },
        vendorOpt: Preset.List.Orange_e,
        api: ui.getCurrentApi,
        placeholder: require("./placeholder")(ui),
      }),
      Skeletons.Box.X({
        className: `${pfx}__footer`,
        kids: [
          Skeletons.Note({
            content: LOCALE.TRASH_FOOTER,
          }),
        ],
      }),
      Skeletons.Wrapper.Y({
        className: `${pfx}__overlay`,
        sys_pn: "overlay"
      }),
    ],
  });
};
