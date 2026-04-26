/**
 * Sidebar workpace item (refactored)
 */

// ---------- Export ----------
module.exports = function (ui) {
  const fig = ui.fig.family;
  const level = ui.mget("level") || 0;
  const nodeRole = ui.mget("nodeRole") || (level ? "folder" : "workspace");
  const hasChevron = nodeRole === "folder";

  return [
    Skeletons.Box.X({
      className: `${fig}__row`,
      service: ui.mget(_a.service),
      uiHandler: [ui],
      radio: ui.mget(_a.radio),
      dataset: { level, role: nodeRole },
      kids: [
        hasChevron ? Skeletons.Note({
          className: `${fig}__chevron`,
          service: "toggle-tree",
          uiHandler: [ui],
          bubble: 0,
        }) : null,
        Skeletons.Note({ className: `${fig}__name`, content: ui.mget(_a.filename) }),
      ],
    }),
    Skeletons.Box.Y({
      className: `${fig}__children`,
      sys_pn: "children",
      partHandler: ui,
      dataset: { level },
    }),
  ];
};
