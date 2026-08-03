/**
 * Screen 1 — Board (Figma 5:75112).
 *
 * Four status columns, each a header pill + count + mute button over a stack of
 * white cards (12px radius, 14px padding, 12px gutters). Cards carry a title,
 * an optional description, attachment chips, then a footer of priority pill +
 * date chip + avatar stack.
 */

const { STATUSES, byStatus } = require('./data');
const { statusPill, priorityPill, dateChip, fileChip, avatars, iconBtn } = require('./parts');

function taskCard(ui, pfx, task) {
  const files = task.files || [];
  const footer = [
    task.priority ? priorityPill(pfx, task.priority) : null,
    task.date ? dateChip(pfx, task.date) : null,
    avatars(pfx, task.people),
  ].filter(Boolean);

  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    // Screen 1's spotlight target — the card the design's connector points at.
    ...(task.focus ? { sys_pn: 'board-card', partHandler: ui } : {}),
    kids: [
      Skeletons.Note({ className: `${pfx}__card-title`, content: task.name }),
      task.desc
        ? Skeletons.Note({ className: `${pfx}__card-desc`, content: task.desc })
        : null,
      files.length
        ? Skeletons.Box.X({
          className: `${pfx}__card-files`,
          // Two chips per row. The "+n" is not a cell of its own — it rides
          // along in the LAST cell, beside the last filename, so it can never
          // wrap onto a row by itself.
          kids: files.map((f, i) => {
            const chip = fileChip(pfx, f);
            const last = i === files.length - 1;
            if (!last || !task.more) return chip;
            return Skeletons.Box.X({
              className: `${pfx}__card-files-cell`,
              kids: [
                chip,
                Skeletons.Note({
                  className: `${pfx}__chip file more`,
                  content: `+${task.more}`,
                }),
              ],
            });
          }),
        })
        : null,
      task.progress
        ? Skeletons.Box.Y({
          className: `${pfx}__card-progress`,
          kids: [
            Skeletons.Box.Y({
              className: `${pfx}__card-progress-fill`,
              styleOpt: { width: `${Math.round(task.progress * 100)}%` },
            }),
          ],
        })
        : null,
      footer.length
        ? Skeletons.Box.X({ className: `${pfx}__card-footer`, kids: footer })
        : null,
    ].filter(Boolean),
  });
}

function column(ui, pfx, status) {
  const tasks = byStatus(status.key);
  return Skeletons.Box.Y({
    className: `${pfx}__col`,
    dataset: { status: status.key },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__col-head`,
        kids: [
          statusPill(pfx, status.key),
          Skeletons.Note({ className: `${pfx}__col-count`, content: String(tasks.length) }),
          iconBtn(pfx, 'bell', 'mute'),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__col-body`,
        kids: tasks.map((t) => taskCard(ui, pfx, t)),
      }),
      Skeletons.Note({
        className: `${pfx}__col-add`,
        content: `+ ${LOCALE.NEW_TASK || 'New task'}`,
      }),
    ],
  });
}

module.exports = function board(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__board`,
    kids: STATUSES.map((s) => column(ui, pfx, s)),
  });
};
