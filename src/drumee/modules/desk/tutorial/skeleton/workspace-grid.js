const WORKSPACES = [
  { name: 'Workspace 01', area: _a.personal, variant: 'purple' },
  { name: 'Workspace 02', area: _a.private, variant: 'salmon' },
  { name: 'Workspace 03', area: _a.share, variant: 'pink', faded: true },
];
/**
 * 
 */
function workspaceicon(ui, area) {
  const pfx = `${ui.fig.family}__folder`;
  return {
    kind: 'media_grid',
    className: `${pfx}-item-icon`,
    filetype: _a.hub,
    role: "desk",
    area,
    mode: _a.vignette
  }
}

function workspaceCard(ui, ws, index) {
  const fig = ui.fig.family;
  const p = `${fig}__wg`;
  const { name, variant, area, faded = false } = ws;
  const isFirst = index === 0;

  return Skeletons.Box.Y({
    className: `${p}-card`,
    dataset: { faded: faded ? 1 : 0 },
    sys_pn: `workspace-card-${index}`,
    partHandler: [ui],
    kids: [
      workspaceicon(ui, area),
      Skeletons.Note({ className: `${p}-label`, content: name }),
    ],
  });
}

module.exports = function (ui) {
  const fig = ui.fig.family;
  const p = `${fig}__wg`;

  return Skeletons.Box.Y({
    className: `${p}-content`,
    kids: [
      Skeletons.Box.X({
        className: `${p}-grid`,
        sys_pn: `workspace-container`,
        kids: WORKSPACES.map((ws, i) => workspaceCard(ui, ws, i)),
      }),
    ],
  });
};
