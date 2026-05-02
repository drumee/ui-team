module.exports = function (ui) {
  const pfx = ui.fig.family;
  const state = ui.getState();
  const creating = ui.isCreating();
  const draft = ui.getCreateDraft();
  const editingId = ui.getEditingId();
  const detail = ui.getDetailTask();
  const priorities = ui.getPriorities();
  const members = ui.getMembers();
  const allLabels = ui.getLabels();
  const labelMap = new Map(allLabels.map((l) => [l.id, l]));
  const pickerOpen = ui.getPickerOpen();
  const managingLabels = ui.isManagingLabels();
  const labelDraft = ui.getLabelDraft();
  const fileSearch = ui.getFileSearch();

  const formatDue = (d) => {
    if (!d) return "";
    try { return Dayjs(d).format("MMM D"); } catch { return d; }
  };

  const isOverdue = (d) => {
    if (!d) return false;
    try { return Dayjs(d).isBefore(Dayjs(), "day"); } catch { return false; }
  };

  const fullName = (m) => {
    if (!m) return "";
    const first = m.firstname || "";
    const last = m.lastname || "";
    return (first + " " + last).trim() || m.email || m.id || m.uid || "";
  };

  const priorityOf = (key) => priorities.find((p) => p.key === key) || priorities[1];

  // ── Card pieces ───────────────────────────────────────────────
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

  const labelPill = (labelId, taskId) => {
    const l = labelMap.get(labelId);
    if (!l) return null;
    return Skeletons.Note({
      className: `${pfx}__task-label-pill`,
      content: l.name,
      styleOpt: { background: l.color },
      dataset: taskId ? { taskId } : null,
    });
  };

  const assigneeAvatar = (task) => {
    if (!task.assignee_uid) return null;
    const m = ui.getMember(task.assignee_uid);
    return Skeletons.UserProfile({
      className: `${pfx}__task-assignee`,
      id: task.assignee_uid,
      firstname: m?.firstname,
      lastname: m?.lastname,
      auto_color: 1,
      live_status: 0,
    });
  };

  const fileNameRow = (f) =>
    Skeletons.Box.X({
      className: `${pfx}__task-file`,
      kids: [
        Skeletons.Image.Svg({
          ico: "attachment",
          className: `${pfx}__task-file-ico`,
        }),
        Skeletons.Note({
          className: `${pfx}__task-file-name`,
          content: `${f.filename || ""}${f.extension ? "." + f.extension : ""}`,
        }),
      ],
    });

  const taskCard = (colKey, task) => {
    const labels = (task.label_ids || [])
      .map((id) => labelPill(id, task.id))
      .filter(Boolean);
    const linkedFiles = Array.isArray(task.linked_files) ? task.linked_files : [];
    const visibleFiles = linkedFiles.slice(0, 3);
    const moreFiles = Math.max(0, linkedFiles.length - visibleFiles.length);
    return Skeletons.Box.Y({
      className: `${pfx}__task-card`,
      dataset: {
        taskId: task.id,
        status: task.status || colKey,
        priority: task.priority || "medium",
      },
      bubble: 0,
      service: editingId === task.id ? null : "open-detail",
      uiHandler: editingId === task.id ? null : [ui],
      taskId: task.id,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__task-card-row`,
          kids: [
            titleNode(task),
            assigneeAvatar(task),
            Skeletons.Button.Svg({
              className: `${pfx}__task-remove`,
              ico: "cross",
              bubble: 0,
              service: "remove-task",
              uiHandler: [ui],
              taskId: task.id,
            }),
          ].filter(Boolean),
        }),
        labels.length
          ? Skeletons.Box.X({
              className: `${pfx}__task-labels`,
              kids: labels,
            })
          : null,
        visibleFiles.length
          ? Skeletons.Box.Y({
              className: `${pfx}__task-files`,
              kids: [
                ...visibleFiles.map(fileNameRow),
                moreFiles
                  ? Skeletons.Note({
                      className: `${pfx}__task-files-more`,
                      content: `+${moreFiles}`,
                    })
                  : null,
              ].filter(Boolean),
            })
          : null,
        task.due_date
          ? Skeletons.Box.X({
              className: `${pfx}__task-meta`,
              kids: [dueBadge(task)],
            })
          : null,
      ].filter(Boolean),
    });
  };

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

  // ── Reusable controls ─────────────────────────────────────────
  const priorityPills = (selected, serviceName, extra = {}) =>
    Skeletons.Box.X({
      className: `${pfx}__priority-pills`,
      kids: priorities.map((p) =>
        Skeletons.Note({
          className: `${pfx}__priority-pill`,
          content: LOCALE[p.label] || p.key,
          dataset: { active: selected === p.key ? 1 : 0, priority: p.key },
          styleOpt: selected === p.key
            ? { borderColor: p.color, color: p.color }
            : null,
          bubble: 0,
          service: serviceName,
          uiHandler: [ui],
          taskPriority: p.key,
          ...extra,
        })
      ),
    });

  const memberPicker = (selectedUid, serviceName, extra = {}) => {
    const items = [
      Skeletons.Box.X({
        className: `${pfx}__member-row`,
        dataset: { active: !selectedUid ? 1 : 0 },
        bubble: 0,
        service: serviceName,
        uiHandler: [ui],
        memberUid: "",
        ...extra,
        kids: [
          Skeletons.Note({
            className: `${pfx}__member-name`,
            content: LOCALE.UNASSIGNED,
          }),
        ],
      }),
      ...members.map((m) =>
        Skeletons.Box.X({
          className: `${pfx}__member-row`,
          dataset: { active: selectedUid === (m.id || m.uid) ? 1 : 0 },
          bubble: 0,
          service: serviceName,
          uiHandler: [ui],
          memberUid: m.id || m.uid,
          ...extra,
          kids: [
            Skeletons.UserProfile({
              className: `${pfx}__member-avatar`,
              id: m.id || m.uid,
              firstname: m.firstname,
              lastname: m.lastname,
              auto_color: 1,
              live_status: 0,
            }),
            Skeletons.Note({
              className: `${pfx}__member-name`,
              content: fullName(m),
            }),
          ],
        })
      ),
    ];
    return Skeletons.Box.Y({
      className: `${pfx}__member-picker`,
      kids: items,
    });
  };

  const assigneeButton = (task, kind) => {
    const m = task.assignee_uid ? ui.getMember(task.assignee_uid) : null;
    const label = m ? fullName(m) : LOCALE.UNASSIGNED;
    return Skeletons.Box.X({
      className: `${pfx}__assignee-button`,
      dataset: { open: pickerOpen === kind ? 1 : 0 },
      bubble: 0,
      service: "toggle-picker",
      uiHandler: [ui],
      pickerKind: kind,
      kids: [
        m
          ? Skeletons.UserProfile({
              className: `${pfx}__assignee-button-avatar`,
              id: m.id || m.uid,
              firstname: m.firstname,
              lastname: m.lastname,
              auto_color: 1,
              live_status: 0,
            })
          : Skeletons.Note({
              className: `${pfx}__assignee-button-placeholder`,
              content: "?",
            }),
        Skeletons.Note({
          className: `${pfx}__assignee-button-label`,
          content: label,
        }),
      ],
    });
  };

  // ── File picker (search bar + result rows + Link button) ─────
  const filePickerBlock = (scope, opt = {}) => {
    const { taskId = null, pendingFiles = [], existingFiles = [] } = opt;
    const isActiveScope = fileSearch && fileSearch.scope === scope;
    const query = isActiveScope ? (fileSearch.query || "") : "";
    const results = isActiveScope ? (fileSearch.results || []) : [];
    const linkedNids = new Set([
      ...pendingFiles.map((f) => f.nid),
      ...existingFiles.map((f) => f.file_nid || f.nid),
    ]);

    const resultRow = (r) => {
      const linked = linkedNids.has(r.nid);
      return Skeletons.Box.X({
        className: `${pfx}__file-result-row`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__file-result-name`,
            content: `${r.filename || ""}${r.ext ? "." + r.ext : ""}`,
          }),
          Skeletons.Note({
            className: `${pfx}__file-result-link`,
            content: linked ? LOCALE.LINKED : LOCALE.LINK_FILE,
            dataset: { linked: linked ? 1 : 0 },
            bubble: 0,
            service: linked ? null : "link-search-result",
            uiHandler: linked ? null : [ui],
            fileNid: r.nid,
            fileName: r.filename,
            fileExt: r.ext,
            searchScope: scope,
          }),
        ],
      });
    };

    const pendingRow = (f) =>
      Skeletons.Box.X({
        className: `${pfx}__file-pending-row`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__file-result-name`,
            content: `${f.filename || ""}${f.extension ? "." + f.extension : ""}`,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__attachment-unlink`,
            ico: "cross",
            bubble: 0,
            service: "remove-pending-file",
            uiHandler: [ui],
            fileNid: f.nid,
          }),
        ],
      });

    return Skeletons.Box.Y({
      className: `${pfx}__file-picker`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__file-search-bar`,
          kids: [
            Skeletons.Entry({
              className: `${pfx}__file-search-input`,
              value: query,
              placeholder: LOCALE.SEARCH_FILES,
              require: "any",
              mode: "commit",
              bubble: 0,
              service: "file-search-input",
              uiHandler: [ui],
              searchScope: scope,
              taskId,
            }),
          ],
        }),
        results.length
          ? Skeletons.Box.Y({
              className: `${pfx}__file-search-results`,
              kids: results.map(resultRow),
            })
          : (query.length >= 2
              ? Skeletons.Note({
                  className: `${pfx}__file-search-empty`,
                  content: LOCALE.NO_FILE_RESULTS,
                })
              : null),
        pendingFiles.length
          ? Skeletons.Box.Y({
              className: `${pfx}__file-pending-list`,
              kids: pendingFiles.map(pendingRow),
            })
          : null,
      ].filter(Boolean),
    });
  };

  const taskLabelChooser = (task) => {
    if (!allLabels.length) {
      return Skeletons.Note({
        className: `${pfx}__labels-empty`,
        content: LOCALE.NO_LABELS,
      });
    }
    const taskLabelIds = new Set(task.label_ids || []);
    return Skeletons.Box.X({
      className: `${pfx}__label-chooser`,
      kids: allLabels.map((l) =>
        Skeletons.Note({
          className: `${pfx}__label-option`,
          content: l.name,
          dataset: { selected: taskLabelIds.has(l.id) ? 1 : 0 },
          styleOpt: taskLabelIds.has(l.id)
            ? { background: l.color, borderColor: l.color }
            : { borderColor: l.color, color: l.color },
          bubble: 0,
          service: "toggle-task-label",
          uiHandler: [ui],
          taskId: task.id,
          labelId: l.id,
        })
      ),
    });
  };

  // ── Detail panel ──────────────────────────────────────────────
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

    const priorityRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.PRIORITY,
        }),
        priorityPills(detail.priority || "medium", "set-priority", {
          taskId: detail.id,
        }),
      ],
    });

    const descriptionRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.TASK_DESCRIPTION,
        }),
        Skeletons.Textarea({
          className: `${pfx}__detail-description`,
          name: "description",
          value: detail.description || "",
          placeholder: LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
          require: "any",
          mode: "commit",
          rows: 3,
          ignoreEnter: true,
          removeOnEscape: false,
          bubble: 0,
          service: "commit-description",
          uiHandler: [ui],
          taskId: detail.id,
        }),
      ],
    });

    const assigneeRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.ASSIGNEE,
        }),
        assigneeButton(detail, "detail-assignee"),
        pickerOpen === "detail-assignee"
          ? memberPicker(detail.assignee_uid, "set-assignee", { taskId: detail.id })
          : null,
      ].filter(Boolean),
    });

    const labelsRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__detail-row-header`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__detail-label`,
              content: LOCALE.LABELS,
            }),
            Skeletons.Note({
              className: `${pfx}__detail-manage`,
              content: LOCALE.MANAGE_LABELS,
              bubble: 0,
              service: "manage-labels",
              uiHandler: [ui],
            }),
          ],
        }),
        taskLabelChooser(detail),
      ],
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
        filePickerBlock("detail", { taskId: detail.id, existingFiles: attachments }),
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
        priorityRow,
        descriptionRow,
        assigneeRow,
        labelsRow,
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

  // ── Create modal ──────────────────────────────────────────────
  const createModal = () => {
    const cols = ui.getColumns();
    const selectedStatus = draft?.status || "todo";
    const selectedPriority = draft?.priority || "medium";
    const selectedAssignee = draft?.assignee_uid || null;
    const selectedLabels = new Set(draft?.labels || []);

    const statusPicker = Skeletons.Box.X({
      className: `${pfx}__create-status`,
      kids: cols.map((c) =>
        Skeletons.Note({
          className: `${pfx}__create-status-pill`,
          content: c.label,
          dataset: { active: selectedStatus === c.key ? 1 : 0 },
          styleOpt: selectedStatus === c.key
            ? { borderColor: c.color, color: c.color }
            : null,
          bubble: 0,
          service: "create-status",
          uiHandler: [ui],
          taskStatus: c.key,
        })
      ),
    });

    const labelChooser = allLabels.length
      ? Skeletons.Box.X({
          className: `${pfx}__label-chooser`,
          kids: allLabels.map((l) =>
            Skeletons.Note({
              className: `${pfx}__label-option`,
              content: l.name,
              dataset: { selected: selectedLabels.has(l.id) ? 1 : 0 },
              styleOpt: selectedLabels.has(l.id)
                ? { background: l.color, borderColor: l.color }
                : { borderColor: l.color, color: l.color },
              bubble: 0,
              service: "create-toggle-label",
              uiHandler: [ui],
              labelId: l.id,
            })
          ),
        })
      : Skeletons.Note({
          className: `${pfx}__labels-empty`,
          content: LOCALE.NO_LABELS,
        });

    const assigneeButtonNode = (() => {
      const m = selectedAssignee ? ui.getMember(selectedAssignee) : null;
      return Skeletons.Box.X({
        className: `${pfx}__assignee-button`,
        dataset: { open: pickerOpen === "create-assignee" ? 1 : 0 },
        bubble: 0,
        service: "toggle-picker",
        uiHandler: [ui],
        pickerKind: "create-assignee",
        kids: [
          m
            ? Skeletons.UserProfile({
                className: `${pfx}__assignee-button-avatar`,
                id: m.id || m.uid,
                firstname: m.firstname,
                lastname: m.lastname,
                auto_color: 1,
                live_status: 0,
              })
            : Skeletons.Note({
                className: `${pfx}__assignee-button-placeholder`,
                content: "?",
              }),
          Skeletons.Note({
            className: `${pfx}__assignee-button-label`,
            content: m ? fullName(m) : LOCALE.UNASSIGNED,
          }),
        ],
      });
    })();

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
              content: LOCALE.TASK_DESCRIPTION,
            }),
            Skeletons.Textarea({
              className: `${pfx}__create-textarea`,
              formItem: "description",
              name: "description",
              value: draft?.description || "",
              placeholder: LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
              require: "any",
              rows: 3,
              ignoreEnter: true,
              bubble: 0,
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
              content: LOCALE.PRIORITY,
            }),
            priorityPills(selectedPriority, "create-priority"),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-label`,
              content: LOCALE.ASSIGNEE,
            }),
            assigneeButtonNode,
            pickerOpen === "create-assignee"
              ? memberPicker(selectedAssignee, "create-assignee")
              : null,
          ].filter(Boolean),
        }),
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__detail-row-header`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__create-label`,
                  content: LOCALE.LABELS,
                }),
                Skeletons.Note({
                  className: `${pfx}__detail-manage`,
                  content: LOCALE.MANAGE_LABELS,
                  bubble: 0,
                  service: "manage-labels",
                  uiHandler: [ui],
                }),
              ],
            }),
            labelChooser,
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
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-label`,
              content: LOCALE.LINKED_FILES,
            }),
            filePickerBlock("create", { pendingFiles: draft?.pending_files || [] }),
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

  // ── Label management modal ────────────────────────────────────
  const COLOR_SWATCHES = [
    "#54B684", "#65D0EA", "#E8A13B", "#d65f59",
    "#AEAEB2", "#FA8540", "#7B61FF", "#0B0A21",
  ];

  const labelManagerModal = () => {
    const draftRow = labelDraft
      ? Skeletons.Box.Y({
          className: `${pfx}__label-draft`,
          kids: [
            Skeletons.Entry({
              className: `${pfx}__create-input`,
              formItem: "label_name",
              value: labelDraft.name || "",
              placeholder: LOCALE.LABEL_NAME,
              require: "any",
              mode: "commit",
              autofocus: 1,
              bubble: 0,
              service: "commit-new-label",
              uiHandler: [ui],
            }),
            Skeletons.Box.X({
              className: `${pfx}__color-swatches`,
              kids: COLOR_SWATCHES.map((c) =>
                Skeletons.Note({
                  className: `${pfx}__color-swatch`,
                  content: "",
                  dataset: { active: labelDraft.color === c ? 1 : 0 },
                  styleOpt: { background: c },
                  bubble: 0,
                  service: "pick-label-color",
                  uiHandler: [ui],
                  labelColor: c,
                })
              ),
            }),
            Skeletons.Box.X({
              className: `${pfx}__create-actions`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__create-cancel`,
                  content: LOCALE.CANCEL,
                  bubble: 0,
                  service: "cancel-new-label",
                  uiHandler: [ui],
                }),
                Skeletons.Note({
                  className: `${pfx}__create-submit`,
                  content: LOCALE.CREATE,
                  bubble: 0,
                  service: "commit-new-label",
                  uiHandler: [ui],
                }),
              ],
            }),
          ],
        })
      : Skeletons.Note({
          className: `${pfx}__add-new-label`,
          content: `+ ${LOCALE.NEW_LABEL}`,
          bubble: 0,
          service: "new-label-form",
          uiHandler: [ui],
        });

    const labelRow = (l) =>
      Skeletons.Box.X({
        className: `${pfx}__label-row`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__task-label-pill`,
            content: l.name,
            styleOpt: { background: l.color },
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__attachment-unlink`,
            ico: "cross",
            bubble: 0,
            service: "delete-label",
            uiHandler: [ui],
            labelId: l.id,
          }),
        ],
      });

    return Skeletons.Box.Y({
      className: `${pfx}__create-backdrop`,
      bubble: 0,
      service: "close-manage-labels",
      uiHandler: [ui],
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__create-modal`,
          bubble: 0,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__create-header`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__create-title`,
                  content: LOCALE.MANAGE_LABELS,
                }),
                Skeletons.Button.Svg({
                  className: `${pfx}__create-close`,
                  ico: "cross",
                  bubble: 0,
                  service: "close-manage-labels",
                  uiHandler: [ui],
                }),
              ],
            }),
            Skeletons.Box.Y({
              className: `${pfx}__label-list`,
              kids: allLabels.length
                ? allLabels.map(labelRow)
                : [Skeletons.Note({
                    className: `${pfx}__attachments-empty`,
                    content: LOCALE.NO_LABELS,
                  })],
            }),
            draftRow,
          ],
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
      Skeletons.Wrapper.Y({
        className: `${pfx}__label-manager-wrapper`,
        name: "label-manager",
        partHandler: ui,
        kids: managingLabels ? [labelManagerModal()] : [],
      }),
    ],
  });
};
