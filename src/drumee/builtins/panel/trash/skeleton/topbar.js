// Header as drawn in Figma 43:34212: "Trash" on the left; on the right
// "Empty trash" with its bin, then the filter dropdown and the close button
// (neither is in the frame; both were asked for separately).
module.exports = function (ui) {
  const pfx = ui.fig.family;

  // The toolkit's own button (icon + label); the skin draws it as the filter
  // trigger's twin and puts the label before the bin, as in the design.
  const emptyTrash = Skeletons.Button.Label({
    className: `${pfx}__empty-trash`,
    ico: 'ph-trash',
    label: LOCALE.PURGE,
    service: 'empty-bin',
    uiHandler: ui,
  });

  const header = Skeletons.Box.X({
    className: `${pfx}__header ${ui.fig.group}__header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header-left`,
        kids: [
          Skeletons.Note({ className: `${pfx}__header-title`, content: LOCALE.TRASH }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__header-actions`,
        kids: [
          emptyTrash,
          require("./filters")(ui),
          Skeletons.Image.Svg({
            ico: 'cross',
            className: `${pfx}__header-icon`,
            service: "toggle-trash",
            uiHandler: [Desk]
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__topbar`,
    debug: __filename,
    kids: [header],
  });
};
