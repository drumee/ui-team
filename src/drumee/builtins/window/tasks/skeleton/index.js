module.exports = function (ui) {
  const pfx = ui.fig.family;
  const state = ui.getState();
  const creating = ui.isCreating();
  const draft = ui.getCreateDraft();
  const editingId = ui.getEditingId();
  const detail = ui.getDetailTask();

  const formatDue = (d) => {
    if (!d) return "";
    try { return Dayjs(d).format("MMM D"); } catch { return d; }
  };

  const isOverdue = (d) => {
    if (!d) return false;
    try { return Dayjs(d).isBefore(Dayjs(), "day"); } catch { return false; }
  };

  const titleNode = (task) => {
    if (editingId === task.id) {
      return Skeletons.Entry({
        className: `${pfx}__edit-input`,
        formItem: "title",
        value: task.title,
        require: "text",
        mode: "commit",
        preselect: 1,
        autofocus: 1,
        removeOnEscape: true,
        bubble: 0,
        service: "commit-title",
        uiHandler: [ui],
        taskId: task.id,
      });
    }
    return Skeletons.Note({
      className: `${pfx}__task-title`,
      content: task.title,
      bubble: 0,
      service: "edit-title",
      uiHandler: [ui],
      taskId: task.id,
    });
  };

  const dueBadge = (task) =>
    Skeletons.Note({
      className: `${pfx}__task-due`,
      content: formatDue(task.due_date),
      dataset: { overdue: isOverdue(task.due_date) ? 1 : 0 },
    });

  const taskCard = (colKey, task) =>
    Skeletons.Box.Y({
      className: `${pfx}__task-card`,
      dataset: { taskId: task.id, status: task.status || colKey },
      bubble: 0,
      service: editingId === task.id ? null : "open-detail",
      uiHandler: editingId === task.id ? null : [ui],
      taskId: task.id,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__task-card-row`,
          kids: [
            titleNode(task),
            Skeletons.Button.Svg({
              className: `${pfx}__task-remove`,
              ico: "cross",
              bubble: 0,
              service: "remove-task",
              uiHandler: [ui],
              taskId: task.id,
            }),
          ],
        }),
        task.due_date
          ? Skeletons.Box.X({
              className: `${pfx}__task-meta`,
              kids: [dueBadge(task)],
            })
          : null,
      ].filter(Boolean),
    });

  const addButton = (colKey) =>
    Skeletons.Box.X({
      className: `${pfx}__add-btn`,
      bubble: 0,
      service: "add-task",
      uiHandler: [ui],
      taskColumn: colKey,
      kids: [
        Skeletons.Note({
          className: `${pfx}__add-label`,
          content: LOCALE.ADD_TASK,
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
        addButton(col.key),
      ],
    });

  const detailPanel = () => {
    const attachments = ui.getDetailAttachments();
    const cols = ui.getColumns();

    const statusSwitcher = Skeletons.Box.X({
      className: `${pfx}__detail-status`,
      kids: cols.map((c) =>
        Skeletons.Note({
          className: `${pfx}__detail-status-pill`,
          content: c.label,
          dataset: { active: detail.status === c.key ? 1 : 0 },
          styleOpt: detail.status === c.key
            ? { borderColor: c.color, color: c.color }
            : null,
          bubble: 0,
          service: "set-status",
          uiHandler: [ui],
          taskId: detail.id,
          taskStatus: c.key,
        })
      ),
    });

    const dueRow = Skeletons.Box.X({
      className: `${pfx}__detail-due-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.DUE_DATE,
        }),
        Skeletons.Entry({
          className: `${pfx}__detail-due-input`,
          attribute: { type: "date" },
          value: detail.due_date || "",
          mode: "commit",
          bubble: 0,
          service: "commit-due-date",
          uiHandler: [ui],
          taskId: detail.id,
        }),
      ],
    });

    const attachmentRow = (f) =>
      Skeletons.Box.X({
        className: `${pfx}__attachment-row`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__attachment-name`,
            content: `${f.filename || ""}${f.extension ? "." + f.extension : ""}`,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__attachment-unlink`,
            ico: "cross",
            bubble: 0,
            service: "unlink-attachment",
            uiHandler: [ui],
            taskId: detail.id,
            fileNid: f.file_nid,
          }),
        ],
      });

    const attachmentsList = Skeletons.Box.Y({
      className: `${pfx}__attachments`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__attachments-header`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__detail-label`,
              content: LOCALE.ATTACHMENTS,
            }),
            Skeletons.Note({
              className: `${pfx}__attachment-add`,
              content: `+ ${LOCALE.ATTACH_FILE}`,
              bubble: 0,
              service: "pick-attachment",
              uiHandler: [ui],
            }),
          ],
        }),
        ...(attachments.length
          ? attachments.map(attachmentRow)
          : [Skeletons.Note({
              className: `${pfx}__attachments-empty`,
              content: LOCALE.NO_ATTACHMENTS,
            })]),
      ],
    });

    return Skeletons.Box.Y({
      className: `${pfx}__detail-panel`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__detail-header`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__detail-title`,
              content: detail.title,
            }),
            Skeletons.Button.Svg({
              className: `${pfx}__detail-close`,
              ico: "cross",
              bubble: 0,
              service: "close-detail",
              uiHandler: [ui],
            }),
          ],
        }),
        statusSwitcher,
        dueRow,
        attachmentsList,
        Skeletons.FileSelector({
          sys_pn: "task-fileselector",
          accept: "*/*",
          partHandler: ui,
          uiHandler: [ui],
          bubble: 0,
        }),
      ],
    });
  };

  const createModal = () => {
    const cols = ui.getColumns();
    const selected = draft?.status || "todo";

    const statusPicker = Skeletons.Box.X({
      className: `${pfx}__create-status`,
      kids: cols.map((c) =>
        Skeletons.Note({
          className: `${pfx}__create-status-pill`,
          content: c.label,
          dataset: { active: selected === c.key ? 1 : 0 },
          styleOpt: selected === c.key
            ? { borderColor: c.color, color: c.color }
            : null,
          bubble: 0,
          service: "create-status",
          uiHandler: [ui],
          taskStatus: c.key,
        })
      ),
    });

    const form = Skeletons.Box.Y({
      className: `${pfx}__create-form`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__create-header`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-title`,
              content: LOCALE.NEW_TASK,
            }),
            Skeletons.Button.Svg({
              className: `${pfx}__create-close`,
              ico: "cross",
              bubble: 0,
              service: "cancel-add",
              uiHandler: [ui],
            }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-label`,
              content: LOCALE.TASK_TITLE,
            }),
            Skeletons.Entry({
              className: `${pfx}__create-input`,
              formItem: "title",
              value: draft?.title || "",
              placeholder: LOCALE.TASK_TITLE,
              require: "any",
              mode: "commit",
              autofocus: 1,
              preselect: 1,
              bubble: 0,
              service: "commit-task",
              uiHandler: [ui],
            }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-label`,
              content: LOCALE.STATUS,
            }),
            statusPicker,
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-label`,
              content: LOCALE.DUE_DATE,
            }),
            Skeletons.Entry({
              className: `${pfx}__create-input`,
              formItem: "due_date",
              attribute: { type: "date" },
              value: draft?.due_date || "",
              require: "any",
              bubble: 0,
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__create-actions`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-cancel`,
              content: LOCALE.CANCEL,
              bubble: 0,
              service: "cancel-add",
              uiHandler: [ui],
            }),
            Skeletons.Note({
              className: `${pfx}__create-submit`,
              content: LOCALE.CREATE,
              bubble: 0,
              service: "commit-task",
              uiHandler: [ui],
            }),
          ],
        }),
      ],
    });

    return Skeletons.Box.Y({
      className: `${pfx}__create-backdrop`,
      bubble: 0,
      service: "cancel-add",
      uiHandler: [ui],
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__create-modal`,
          bubble: 0,
          kids: [form],
        }),
      ],
    });
  };

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__main`,
        kids: ui.getColumns().map(column),
      }),
      Skeletons.Wrapper.Y({
        className: `${pfx}__detail-wrapper`,
        name: "task-detail",
        partHandler: ui,
        kids: detail ? [detailPanel()] : [],
      }),
      Skeletons.Wrapper.Y({
        className: `${pfx}__create-wrapper`,
        name: "task-create",
        partHandler: ui,
        kids: creating ? [createModal()] : [],
      }),
    ],
  });
};
