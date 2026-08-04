/**
 * Screen 5 — Project Health (Figma 3202:185481).
 *
 * Four stat tiles over three panels: Status overview (donut + legend), Priority
 * breakdown (bars) and Team workload (member rows), with an activity rail on
 * the right.
 *
 * The donut is a conic-gradient built from the derived status split, so the
 * chart, the legend and the other four views can never disagree.
 */

const { statusBreakdown, priorityBreakdown, TOTAL } = require('./data');
const { avatars } = require('./parts');

const TILES = [
  { ico: 'ctxmenu-copy', value: `${TOTAL} created`, sub: 'in the last 7 days' },
  { ico: 'checked-circle', value: '4 completed', sub: 'in the last 7 days' },
  { ico: 'apps-timer', value: '3.3 days/task', sub: 'average cycle time' },
  { ico: 'calendar', value: '3 overdue', sub: 'in the last 7 days' },
];

const MEMBERS = [1, 2, 3, 4, 5, 6].map((n) => ({
  name: `Member ${n}`,
  load: [1, 0.78, 0.55, 0.62, 0.2, 0.46][n - 1],
}));

function tile(pfx, t) {
  return Skeletons.Box.X({
    className: `${pfx}__ph-tile`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__ph-tile-icon`,
        kids: [Skeletons.Image.Svg({ ico: t.ico, className: `${pfx}__ph-tile-svg` })],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__ph-tile-body`,
        kids: [
          Skeletons.Note({ className: `${pfx}__ph-tile-value`, content: t.value }),
          Skeletons.Note({ className: `${pfx}__ph-tile-sub`, content: t.sub }),
        ],
      }),
    ],
  });
}

function panelHead(pfx, title, sub, link) {
  return Skeletons.Box.Y({
    className: `${pfx}__ph-head`,
    kids: [
      Skeletons.Note({ className: `${pfx}__ph-title`, content: title }),
      Skeletons.Box.X({
        className: `${pfx}__ph-sub`,
        kids: [
          Skeletons.Note({ className: `${pfx}__ph-sub-text`, content: sub }),
          link ? Skeletons.Note({ className: `${pfx}__ph-link`, content: link }) : null,
        ].filter(Boolean),
      }),
    ],
  });
}

/** Donut via conic-gradient — no SVG arithmetic, and it scales with the box. */
function donut(pfx, split) {
  let at = 0;
  const stops = split.map((s) => {
    const from = at;
    at += s.pct;
    return `${s.tint} ${from}% ${at}%`;
  });
  return Skeletons.Box.Y({
    className: `${pfx}__ph-donut`,
    styleOpt: { background: `conic-gradient(${stops.join(', ')})` },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__ph-donut-hole`,
        kids: [
          Skeletons.Note({ className: `${pfx}__ph-donut-value`, content: String(TOTAL) }),
          Skeletons.Note({
            className: `${pfx}__ph-donut-label`,
            content: LOCALE.TOTAL_WORK_ITEMS || 'Total work items',
          }),
        ],
      }),
    ],
  });
}

function statusOverview(ui, pfx) {
  const split = statusBreakdown();
  return Skeletons.Box.Y({
    className: `${pfx}__ph-panel`,
    // Screen 5's spotlight target.
    sys_pn: 'health-status',
    partHandler: ui,
    kids: [
      panelHead(
        pfx,
        LOCALE.STATUS_OVERVIEW || 'Status overview',
        'Get a snapshot of the status of your work items.',
        LOCALE.VIEW_ALL_WORK_ITEMS || 'View all work items',
      ),
      Skeletons.Box.X({
        className: `${pfx}__ph-donut-row`,
        kids: [
          donut(pfx, split),
          Skeletons.Box.Y({
            className: `${pfx}__ph-legend`,
            kids: split.map((s) =>
              Skeletons.Box.X({
                className: `${pfx}__ph-legend-row`,
                kids: [
                  Skeletons.Box.Y({
                    className: `${pfx}__ph-legend-swatch`,
                    styleOpt: { background: s.tint },
                  }),
                  Skeletons.Note({
                    className: `${pfx}__ph-legend-label`,
                    content: `${s.label}: ${s.count}`,
                  }),
                  Skeletons.Note({ className: `${pfx}__ph-legend-pct`, content: `${s.pct}%` }),
                ],
              }),
            ),
          }),
        ],
      }),
    ],
  });
}

function priorityPanel(pfx) {
  const bars = priorityBreakdown();
  const max = Math.max(...bars.map((b) => b.count), 5);
  return Skeletons.Box.Y({
    className: `${pfx}__ph-panel`,
    kids: [
      panelHead(
        pfx,
        LOCALE.PRIORITY_BREAKDOWN || 'Priority breakdown',
        'Get a holistic view of how work is being prioritized.',
        'How to manage priorities for spaces',
      ),
      Skeletons.Box.X({
        className: `${pfx}__ph-bars`,
        kids: bars.map((b) =>
          Skeletons.Box.Y({
            className: `${pfx}__ph-bar-col`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__ph-bar`,
                styleOpt: { height: `${Math.round((b.count / max) * 100)}%` },
              }),
              Skeletons.Box.X({
                className: `${pfx}__ph-bar-label`,
                kids: [
                  Skeletons.Box.Y({
                    className: `${pfx}__ph-bar-dot`,
                    dataset: { priority: b.key },
                  }),
                  Skeletons.Note({ className: `${pfx}__ph-bar-name`, content: b.label }),
                ],
              }),
            ],
          }),
        ),
      }),
    ],
  });
}

function workloadPanel(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__ph-panel`,
    kids: [
      panelHead(
        pfx,
        LOCALE.TEAM_WORKLOAD || 'Team workload',
        'Monitor the capacity of your team.',
        'Reassign work items to get the right balance',
      ),
      Skeletons.Box.Y({
        className: `${pfx}__ph-workload`,
        kids: MEMBERS.map((m) =>
          Skeletons.Box.X({
            className: `${pfx}__ph-member`,
            kids: [
              Skeletons.Box.Y({ className: `${pfx}__avatar`, dataset: { tone: 0 } }),
              Skeletons.Note({ className: `${pfx}__ph-member-name`, content: m.name }),
              Skeletons.Box.Y({
                className: `${pfx}__ph-member-track`,
                kids: [
                  Skeletons.Box.Y({
                    className: `${pfx}__ph-member-fill`,
                    styleOpt: { width: `${Math.round(m.load * 100)}%` },
                  }),
                ],
              }),
            ],
          }),
        ),
      }),
    ],
  });
}

function activityPanel(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__ph-panel activity`,
    kids: [
      panelHead(pfx, LOCALE.ACTIVITY || 'Activity', 'Latest updates in the space.'),
      Skeletons.Box.Y({
        className: `${pfx}__ph-activity`,
        kids: [1, 2, 3].map((n) =>
          Skeletons.Box.X({
            className: `${pfx}__ph-act-row`,
            kids: [
              Skeletons.Box.Y({ className: `${pfx}__avatar`, dataset: { tone: n % 3 } }),
              Skeletons.Box.Y({
                className: `${pfx}__ph-act-body`,
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}__ph-act-line`,
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}__ph-act-who`,
                        content: 'Username',
                      }),
                      Skeletons.Note({
                        className: `${pfx}__ph-act-what`,
                        content: n === 1 ? 'created' : 'updated',
                      }),
                      Skeletons.Note({ className: `${pfx}__ph-act-task`, content: 'Task Title' }),
                    ],
                  }),
                  Skeletons.Note({
                    className: `${pfx}__ph-act-when`,
                    content: `${n * 15} minutes ago`,
                  }),
                ],
              }),
            ],
          }),
        ),
      }),
    ],
  });
}

module.exports = function health(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__ph`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ph-tiles`,
        kids: TILES.map((t) => tile(pfx, t)),
      }),
      Skeletons.Box.X({
        className: `${pfx}__ph-cols`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__ph-main`,
            kids: [statusOverview(ui, pfx), priorityPanel(pfx)],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__ph-side`,
            kids: [activityPanel(pfx), workloadPanel(pfx)],
          }),
        ],
      }),
    ],
  });
};
