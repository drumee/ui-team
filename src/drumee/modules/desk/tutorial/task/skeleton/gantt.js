/**
 * Screen 3 — Gantt (Figma 3202:185373).
 *
 * Left: a task list with checkbox, disclosure chevron, status dot, name and
 * row actions, under a "+ Work / Delete selected" bar. Right: a day-ruler
 * (Jun 7 → 15) with one gradient bar per task, a "today" line, an overdue
 * marker on late rows, and a date label on the selected row.
 */

const { TASKS } = require('./data');
const { iconBtn } = require('./parts');

const FIRST_DAY = 7;
const LAST_DAY = 15;
const DAYS = Array.from({ length: LAST_DAY - FIRST_DAY + 1 }, (_, i) => FIRST_DAY + i);
const TODAY = 10;

const pctOf = (day) => ((day - FIRST_DAY) / DAYS.length) * 100;

function taskRow(pfx, task) {
  return Skeletons.Box.X({
    className: `${pfx}__gt-row${task.selected ? ' selected' : ''}`,
    kids: [
      Skeletons.Box.Y({ className: `${pfx}__gt-check` }),
      Skeletons.Image.Svg({
        ico: task.selected ? 'carret-down' : 'apps-caret-down',
        className: `${pfx}__gt-caret${task.selected ? ' open' : ''}`,
      }),
      task.priority
        ? Skeletons.Box.Y({ className: `${pfx}__gt-dot`, dataset: { priority: task.priority } })
        : null,
      Skeletons.Note({ className: `${pfx}__gt-name`, content: task.name }),
      Skeletons.Note({ className: `${pfx}__gt-plus`, content: '+' }),
      Skeletons.Image.Svg({ ico: 'cross', className: `${pfx}__gt-remove` }),
    ].filter(Boolean),
  });
}

function bar(ui, pfx, task) {
  const [from, to] = task.span || [FIRST_DAY, FIRST_DAY + 1];
  const left = pctOf(from);
  const ends = pctOf(to + 1);
  const width = Math.max(ends - left, 4);
  // Overdue: a tinted band running from the end of the bar to the today line,
  // with the badge at its far end — the design does not put the marker on the
  // bar itself. A bar already past today keeps a stub band so the badge lands
  // just after it.
  const lateWidth = task.late ? Math.max(pctOf(TODAY) - ends, 3) : 0;
  return Skeletons.Box.X({
    className: `${pfx}__gt-lane${task.selected ? ' selected' : ''}`,
    kids: [
      task.late
        ? Skeletons.Box.X({
          className: `${pfx}__gt-late`,
          styleOpt: { left: `${ends}%`, width: `${lateWidth}%` },
          kids: [
            Skeletons.Box.Y({
              className: `${pfx}__gt-late-badge`,
              
            }),
          ],
        })
        : null,
      Skeletons.Box.X({
        className: `${pfx}__gt-bar`,
        // Percentage geometry: the lane is the ruler's width, whatever the
        // window ends up being.
        styleOpt: { left: `${left}%`, width: `${width}%` },
        ...(task.selected ? { sys_pn: 'gantt-bar', partHandler: ui } : {}),
      }),
      
    ].filter(Boolean),
  });
}

module.exports = function gantt(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__gt`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__gt-list`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__gt-list-head`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__gt-add`,
                content: `+ ${LOCALE.WORK || 'Work'}`,
              }),
              Skeletons.Note({
                className: `${pfx}__gt-delete`,
                content: LOCALE.DELETE_SELECTED || 'Delete selected',
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__gt-rows`,
            kids: TASKS.map((t) => taskRow(pfx, t)),
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__gt-chart`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__gt-ruler`,
            kids: DAYS.map((d) =>
              Skeletons.Box.Y({
                className: `${pfx}__gt-tick`,
                kids: [
                  d === FIRST_DAY || d === 8
                    ? Skeletons.Note({ className: `${pfx}__gt-month`, content: 'Jun' })
                    : null,
                  Skeletons.Note({ className: `${pfx}__gt-tick-day`, content: String(d) }),
                ].filter(Boolean),
              }),
            ),
          }),
          Skeletons.Box.Y({
            className: `${pfx}__gt-lanes`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__gt-today`,
                styleOpt: { left: `${pctOf(TODAY)}%` },
              }),
              ...TASKS.map((t) => bar(ui, pfx, t)),
            ],
          }),
        ],
      }),
    ],
  });
};
