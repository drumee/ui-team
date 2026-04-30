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
 * @param {Object} opts.style
 * @param {string} [opts.direction='north'] - which way the connector extends from the card:
 *   north = connector above card (dot at top, points to target above)
 *   south = connector below card (dot at bottom, points to target below)
 *   east  = connector right of card (dot at right, points to target right)
 *   west  = connector left of card (dot at left, points to target left)
 */
export function tooltipBadge(ui, { title, desc, badge_text, style, direction = 'north' }) {
  const fig = ui.fig.family;
  const p = `${ui.fig.group}__s1`;

  const isHorizontal = direction === 'east' || direction === 'west';
  // south/east: card comes first, connector (with dot at far end) comes second
  const isReversed = direction === 'south' || direction === 'east';

  const BoxContainer = isHorizontal ? Skeletons.Box.X : Skeletons.Box.Y;
  const BoxConnector = isHorizontal ? Skeletons.Box.X : Skeletons.Box.Y;

  // For reversed: line touches the card, dot is at the far end toward the target.
  // For default:  dot is at the near end (toward the target), line connects to the card.
  const connectorKids = isReversed
    ? [
      Skeletons.Box.Y({ className: `${p}-connector-line`, dataset: { direction } }),
      Skeletons.Box.Y({ className: `${p}-connector-dot` }),
    ]
    : [
      Skeletons.Box.Y({ className: `${p}-connector-dot` }),
      Skeletons.Box.Y({ className: `${p}-connector-line`, dataset: { direction } }),
    ];

  const connector = BoxConnector({
    className: `${p}-connector`,
    kids: connectorKids,
  });

  const card = Skeletons.Box.Y({
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
  });

  return BoxContainer({
    className: `${p}-tooltip`,
    sys_pn: 'badge-tooltip',
    partHandler: [ui],
    style,
    dataset: { direction },
    kids: isReversed ? [card, connector] : [connector, card],
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

export function workspaceContent(ui, opt = {}) {
  const fig = ui.fig.family;
  const p = `${fig}__wg`;
  const { aspect = "normal" } = opt;
  return Skeletons.Box.Y({
    className: `${p}-content`,
    dataset: { aspect },
    kids: [
      Skeletons.Box.X({
        className: `${p}-grid`,
        sys_pn: `workspace-container`,
        kids: WORKSPACES.map((ws, i) => workspaceCard(ui, ws, i)),
      }),
    ],
  });
};
