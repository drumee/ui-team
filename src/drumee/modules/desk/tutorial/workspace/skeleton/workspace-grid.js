const WORKSPACES = [
  { name: 'Workspace 01', area: _a.personal, variant: 'purple', state: 1 },
  { name: 'Workspace 02', area: _a.private, variant: 'salmon', state: 0 },
  { name: 'Workspace 03', area: _a.share, variant: 'pink', state: 0 },
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
    active: 0,
    service: "nop",
    mode: _a.vignette
  }
}

function workspaceCard(ui, ws, index) {
  const fig = ui.fig.family;
  const p = `${fig}__wg`;
  const { name, variant, area, state } = ws;
  const isFirst = index === 0;

  return Skeletons.Box.Y({
    className: `${p}-card`,
    sys_pn: `workspace-card-${index}`,
    partHandler: [ui],
    radio: `${ui._id}-badge`,
    state,
    active: 0,
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
