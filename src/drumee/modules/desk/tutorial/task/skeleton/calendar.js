/**
 * Screen 2 — Calendar (Figma 3202:123320).
 *
 * A Sun–Sat week strip: day letters over numbered cells, tasks placed in the
 * day they fall on. Each entry is a white card with a status dot, title,
 * optional description and a status pill. Day columns are separated by 1px
 * rules; the day number sits top-right.
 */

const { TASKS } = require('./data');
const { statusPill } = require('./parts');

const DAYS = [
  { label: 'Sun', date: 7 },
  { label: 'Mon', date: 8 },
  { label: 'Tue', date: 9 },
  { label: 'Wed', date: 10 },
  { label: 'Thu', date: 11 },
  { label: 'Fri', date: 12 },
  { label: 'Sat', date: 13 },
];

// The day the design's connector lands on carries the spotlight.
const FOCUS_DATE = 9;

function entry(pfx, task) {
  return Skeletons.Box.Y({
    className: `${pfx}__cal-entry`,
    kids: [
      Skeletons.Box.Y({ className: `${pfx}__cal-entry-dot`, dataset: { status: task.status } }),
      Skeletons.Note({ className: `${pfx}__cal-entry-title`, content: task.name }),
      task.desc
        ? Skeletons.Note({ className: `${pfx}__cal-entry-desc`, content: task.desc })
        : null,
      // A filled badge here, tinted by status — the design's calendar entries
      // carry the colour, unlike the list where the status is plain text.
      statusPill(pfx, task.status),
    ].filter(Boolean),
  });
}

function dayCell(ui, pfx, day) {
  const tasks = TASKS.filter((t) => t.day === day.date);
  const focus = day.date === FOCUS_DATE;
  return Skeletons.Box.Y({
    className: `${pfx}__cal-day`,
    ...(focus ? { sys_pn: 'cal-day', partHandler: ui } : {}),
    kids: [
      Skeletons.Note({ className: `${pfx}__cal-date`, content: String(day.date) }),
      Skeletons.Box.Y({
        className: `${pfx}__cal-entries`,
        kids: tasks.map((t) => entry(pfx, t)),
      }),
    ],
  });
}

module.exports = function calendar(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__cal`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__cal-head`,
        kids: DAYS.map((d) =>
          Skeletons.Note({ className: `${pfx}__cal-head-day`, content: d.label }),
        ),
      }),
      Skeletons.Box.X({
        className: `${pfx}__cal-grid`,
        kids: DAYS.map((d) => dayCell(ui, pfx, d)),
      }),
    ],
  });
};
