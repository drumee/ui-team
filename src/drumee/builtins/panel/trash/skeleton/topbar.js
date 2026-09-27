// Header as drawn in Figma 43:34212: "Trash" on the left; on the right
// "Empty trash" with its bin, then the filter dropdown and the close button
// (neither is in the frame; both were asked for separately).
module.exports = function (ui) {
  const pfx = ui.fig.family;

  const emptyTrash = Skeletons.Box.X({
    className: `${pfx}__empty-trash`,
    service: 'empty-bin',
    uiHandler: ui,
    // Inert kids: a live child would take the click meant for this box.
    kids: [
      Skeletons.Note({ active: 0, className: `${pfx}__empty-trash-label`, content: LOCALE.PURGE }),
      Skeletons.Image.Svg({ active: 0, ico: 'ph-trash', className: `${pfx}__empty-trash-ico` }),
    ],
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
