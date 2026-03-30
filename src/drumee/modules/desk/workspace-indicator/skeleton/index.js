/* ==================================================================== *
 * desk_workspace-indicator skeleton
 * Displays the current workspace label + active workspace name with dot.
 * ==================================================================== */

function skl_desk_workspace_indicator(ui) {
  const pfx = ui.fig.family;
  const orgName = Organization.name() || "";

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      // "CURRENT WORKSPACE" label
      Skeletons.Note({
        className: `${pfx}__label`,
        content: LOCALE.CURRENT_WORKSPACE || "CURRENT WORKSPACE",
      }),

      // Workspace name with status dot
      Skeletons.Box.X({
        className: `${pfx}__workspace-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__dot`,
          }),
          Skeletons.Note({
            className: `${pfx}__name`,
            content: orgName,
          }),
        ],
      }),
    ],
  });
}

module.exports = skl_desk_workspace_indicator;
