module.exports = function (ui) {
  const pfx = ui.fig.family;
  const state = ui.getState();
  const adding = ui.getAddingColumn();

  const taskCard = (colKey, task) =>
    Skeletons.Box.X({
      className: `${pfx}__task-card`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__task-title`,
          content: task.title,
        }),
        Skeletons.Button.Svg({
          className: `${pfx}__task-remove`,
          ico: "cross",
          service: "remove-task",
          uiHandler: [ui],
          taskColumn: colKey,
          taskId: task.id,
        }),
      ],
    });

  const addInput = () =>
    Skeletons.Box.Y({
      className: `${pfx}__add-input-wrapper`,
      kids: [
        Skeletons.Entry({
          className: `${pfx}__add-input`,
          formItem: "title",
          placeholder: LOCALE.TASK_TITLE || "Task title…",
          require: "text",
          mode: "commit",
          preselect: 1,
          autofocus: 1,
          removeOnEscape: true,
          service: "commit-task",
          uiHandler: [ui],
        }),
      ],
    });

  const addButton = (colKey) =>
    Skeletons.Box.X({
      className: `${pfx}__add-btn`,
      service: "add-task",
      uiHandler: [ui],
      taskColumn: colKey,
      kids: [
        Skeletons.Note({
          className: `${pfx}__add-label`,
          content: LOCALE.ADD_TASK || "+ Add",
        }),
      ],
    });

  const column = (col) =>
    Skeletons.Box.Y({
      className: `${pfx}__column`,
      dataset: { column: col.key },
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__column-body`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__column-header`,
              kids: [
                Skeletons.Box.X({
                  className: `${pfx}__column-title-group`,
                  kids: [
                    Skeletons.Element({
                      tagName: "span",
                      className: `${pfx}__column-dot`,
                      styleOpt: { background: col.color },
                    }),
                    Skeletons.Note({
                      className: `${pfx}__column-title`,
                      content: col.label,
                    }),
                  ],
                }),
                Skeletons.Box.X({
                  className: `${pfx}__column-count`,
                  kids: [
                    Skeletons.Note({
                      className: `${pfx}__column-count-text`,
                      content: String((state[col.key] || []).length),
                    }),
                  ],
                }),
              ],
            }),
            ...((state[col.key] || []).map((t) => taskCard(col.key, t))),
          ],
        }),
        adding === col.key ? addInput() : addButton(col.key),
      ],
    });

  return Skeletons.Box.X({
    className: `${pfx}__main`,
    debug: __filename,
    kids: ui.getColumns().map(column),
  });
};
