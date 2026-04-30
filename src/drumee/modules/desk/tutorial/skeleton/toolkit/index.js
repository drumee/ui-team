const WORKSPACES = [
  { name: 'Workspace 01', area: _a.personal, variant: 'purple', state: 1 },
  { name: 'Workspace 02', area: _a.private, variant: 'salmon', state: 0 },
  { name: 'Workspace 03', area: _a.share, variant: 'pink', state: 0 },
];

/**
 * Shared tutorial badge skeleton.
 *
 * @param {Object} ui          - desk_tutorial widget instance
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.desc
 * @param {string} opts.badge_text
 */
export function tooltipBadge(ui, { title, desc, badge_text, style }) {
  const fig = ui.fig.family;
  const p = `${fig}__s1`;

  return Skeletons.Box.Y({
    className: `${p}-tooltip`,
    sys_pn: 'badge-tooltip',
    partHandler: [ui],
    style,
    kids: [
      // ── Connector ──────────────────────────────────────────────────────
      Skeletons.Box.Y({
        className: `${p}-connector`,
        kids: [
          Skeletons.Box.Y({ className: `${p}-connector-dot` }),
          Skeletons.Box.Y({ className: `${p}-connector-line` }),
        ],
      }),

      // ── Card ───────────────────────────────────────────────────────────
      Skeletons.Box.Y({
        className: `${p}-card`,
        kids: [
          Skeletons.Box.X({
            className: `${p}-badge`,
            kids: [
              Skeletons.Box.Y({ className: `${p}-badge-dot` }),
              Skeletons.Note({ className: `${p}-badge-text`, content: badge_text }),
            ],
          }),

          Skeletons.Note({ className: `${p}-title`, content: title }),
          Skeletons.Note({ className: `${p}-desc`, content: desc }),

          Skeletons.Box.X({
            className: `${p}-footer`,
            kids: [
              Skeletons.Note({
                className: `${p}-skip`,
                content: LOCALE.SKIP_TOUR || 'Skip tour',
                service: 'skip-tour',
                uiHandler: [ui],
              }),
              Skeletons.Note({
                className: `${p}-next`,
                content: `${LOCALE.NEXT || 'Next'} →`,
                service: 'next-step',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

/**
 * 
 */
export function workspaceIcon(ui, area) {
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

export function workspaceCard(ui, ws, index) {
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
      workspaceIcon(ui, area),
      Skeletons.Note({ className: `${p}-label`, content: name }),
    ],
  });
}

export function workspaceContent(ui) {
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
