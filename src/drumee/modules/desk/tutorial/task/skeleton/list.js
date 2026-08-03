/**
 * Screen 4 — List (Figma 3202:185461).
 *
 * A table: Task | Priority Level | Status | Due date | Attachments | Assignee.
 * Rows are 54px, separated by hairlines; unset fields show their muted
 * placeholder ("Priority ⌄", "Due date 🗓", "Unassigned") exactly as the design
 * does.
 */

const { TASKS } = require('./data');
const { statusPill, priorityPill, dateChip, fileChip, avatars } = require('./parts');

const COLUMNS = [
  { key: 'task', label: 'Task' },
  { key: 'priority', label: 'Priority Level' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Due date' },
  { key: 'files', label: 'Attachments' },
  { key: 'assignee', label: 'Assignee' },
];

function headRow(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__ls-row head`,
    kids: [
      Skeletons.Box.Y({ className: `${pfx}__ls-check` }),
      ...COLUMNS.map((c) =>
        Skeletons.Note({
          className: `${pfx}__ls-cell head`,
          dataset: { col: c.key },
          content: c.label,
        }),
      ),
    ],
  });
}

function cell(pfx, col, kid, extra = {}) {
  return Skeletons.Box.X({
    className: `${pfx}__ls-cell`,
    dataset: { col },
    ...extra,
    kids: [kid].filter(Boolean),
  });
}

function taskRow(ui, pfx, task) {
  const files = task.files || [];
  return Skeletons.Box.X({
    className: `${pfx}__ls-row`,
    kids: [
      Skeletons.Box.Y({ className: `${pfx}__ls-check` }),
      cell(pfx, 'task', Skeletons.Note({ className: `${pfx}__ls-name`, content: task.name })),
      cell(pfx, 'priority', priorityPill(pfx, task.priority)),
      // The status cell of the focused row anchors the callout: the table is
      // full-width, so pointing the badge at the whole body would push it off
      // the window. The hole is widened by a radius instead (task/index.js).
      cell(pfx, 'status', statusPill(pfx, task.status, { plain: true }),
        task.focus ? { sys_pn: 'list-focus', partHandler: ui } : {}),
      cell(pfx, 'date', dateChip(pfx, task.date)),
      Skeletons.Box.X({
        className: `${pfx}__ls-cell`,
        dataset: { col: 'files' },
        kids: files.slice(0, 2).map((f) => fileChip(pfx, f)).concat(
          task.more
            ? [Skeletons.Note({ className: `${pfx}__chip file more`, content: `+${task.more}` })]
            : [],
        ),
      }),
      cell(pfx, 'assignee', avatars(pfx, task.people, { unassigned: true })),
    ],
  });
}

module.exports = function list(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__ls`,
    kids: [
      headRow(ui, pfx),
      Skeletons.Box.Y({
        className: `${pfx}__ls-body`,
        sys_pn: 'list-body',
        partHandler: ui,
        kids: TASKS.map((t) => taskRow(ui, pfx, t)),
      }),
    ],
  });
};
