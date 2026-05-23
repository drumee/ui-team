function buildFileSearchDropdownContent(ui, scope, ctx = {}) {
  const pfx = ui.fig.family;
  const fileSearch = ui.getFileSearch();
  const isActiveScope = fileSearch && fileSearch.scope === scope;
  const query = isActiveScope ? fileSearch.query || "" : "";
  const results = isActiveScope ? fileSearch.results || [] : [];
  const { pendingFiles = [], existingFiles = [] } = ctx;
  const linkedNids = new Set([
    ...pendingFiles.map((f) => f.nid),
    ...existingFiles.map((f) => f.file_nid || f.nid),
  ]);

  const resultRow = (r) => {
    const linked = linkedNids.has(r.nid);
    return Skeletons.Box.X({
      className: `${pfx}__file-result-row`,
      dataset: { linked: linked ? 1 : 0 },
      bubble: 0,
      service: linked ? null : "link-search-result",
      uiHandler: linked ? null : [ui],
      fileNid: r.nid,
      fileName: r.filename,
      fileExt: r.ext,
      searchScope: scope,
      kids: [
        Skeletons.Image.Svg({ ico: "attachment", className: `${pfx}__file-result-ico` }),
        Skeletons.Note({
          className: `${pfx}__file-result-name`,
          content: `${r.filename || ""}${r.ext ? "." + r.ext : ""}`,
        }),
        linked
          ? Skeletons.Note({
              className: `${pfx}__file-result-status`,
              content: LOCALE.LINKED,
            })
          : null,
      ].filter(Boolean),
    });
  };

  if (results.length) {
    return [
      Skeletons.Box.Y({
        className: `${pfx}__file-search-results`,
        kids: results.map(resultRow),
      }),
    ];
  }
  if (query.length >= 2) {
    return [
      Skeletons.Note({
        className: `${pfx}__file-search-empty`,
        content: LOCALE.NO_FILE_RESULTS,
      }),
    ];
  }
  return [];
}

const make = function (ui) {
  const pfx = ui.fig.family;
  const state = ui.getState();
  const creating = ui.isCreating();
  const draft = ui.getCreateDraft();
  const detail = ui.getDetailTask();
  const priorities = ui.getPriorities();
  const members = ui.getMembers();
  const allLabels = ui.getLabels();
  const labelMap = new Map(allLabels.map((l) => [l.id, l]));
  const pickerOpen = ui.getPickerOpen();
  const fileSearch = ui.getFileSearch();

  const formatDue = (d) => {
    if (!d) return "";
    try {
      return Dayjs(d).format("MMM D");
    } catch {
      return d;
    }
  };

  const isOverdue = (d) => {
    if (!d) return false;
    try {
      return Dayjs(d).isBefore(Dayjs(), "day");
    } catch {
      return false;
    }
  };

  const fullName = (m) => {
    if (!m) return "";
    const first = m.firstname || "";
    const last = m.lastname || "";
    return (first + " " + last).trim() || m.email || m.id || m.uid || "";
  };

  const priorityOf = (key) =>
    priorities.find((p) => p.key === key) || priorities[1];

  // ── Card pieces ───────────────────────────────────────────────
  // Title on the card is a plain Note: clicking it bubbles up to the card,
  // which fires `open-detail`. Title editing lives in the detail panel.
  const titleNode = (task) =>
    Skeletons.Note({
      className: `${pfx}__task-title`,
      content: task.title,
    });

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

  const taskCard = (colKey, task) => {
    const labels = (task.label_ids || [])
      .map((id) => labelMap.get(id))
      .filter(Boolean);
    const linkedFiles = Array.isArray(task.linked_files)
      ? task.linked_files
      : [];
    const fileCount = linkedFiles.length;
    const priority = priorityOf(task.priority || "medium");

    const labelsStrip = labels.length
      ? Skeletons.Box.X({
          className: `${pfx}__task-labels`,
          kids: labels.map((l) =>
            Skeletons.Note({
              className: `${pfx}__task-label-pill`,
              content: l.name,
              styleOpt: { background: l.color },
            }),
          ),
        })
      : null;

    // Compact linked-files preview — first 2 filenames + "+N more".
    const visibleFiles = linkedFiles.slice(0, 2);
    const moreFiles = Math.max(0, linkedFiles.length - visibleFiles.length);
    const filesNode = visibleFiles.length
      ? Skeletons.Box.Y({
          className: `${pfx}__task-files`,
          kids: [
            ...visibleFiles.map((f) =>
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
              }),
            ),
            moreFiles
              ? Skeletons.Note({
                  className: `${pfx}__task-files-more`,
                  content: `+${moreFiles} ${LOCALE.MORE || "more"}`,
                })
              : null,
          ].filter(Boolean),
        })
      : null;

    // Footer: priority dot + due date only. Attachment count badge removed
    // (the inline file rows above already convey the number visually).
    // Assignee avatar moves up to the title row (top-right of the card).
    const footer = Skeletons.Box.X({
      className: `${pfx}__task-foot`,
      kids: [
        Skeletons.Element({
          tagName: "span",
          className: `${pfx}__task-priority-dot`,
          styleOpt: { background: priority.color },
          attrOpt: { title: LOCALE[priority.label] || priority.key },
        }),
        task.due_date ? dueBadge(task) : null,
      ].filter(Boolean),
    });

    return Skeletons.Box.Y({
      className: `${pfx}__task-card`,
      attrOpt: { draggable: "true" },
      // Single-word lowercase dataset keys — `data-taskId` would be
      // lowercased to `data-taskid` by HTML and `dataset.taskId` would
      // be undefined (DOMStringMap only camelCase-maps from kebab-cased
      // attribute names). Drag-start uses `card.dataset.tid` to read this.
      dataset: {
        tid: task.id,
        status: task.status || colKey,
        priority: task.priority || "medium",
      },
      bubble: 0,
      service: "open-detail",
      uiHandler: [ui],
      taskId: task.id,
      kids: [
        labelsStrip,
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
        filesNode,
        footer,
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
          // single-word lowercase key — `dataset.dropcol` works on the DOM
          // side. (Camel-case keys are silently broken: setAttribute keeps
          // the cased name, HTML lowercases it, and DOMStringMap expects
          // hyphen-aware mapping which a single token can't satisfy.)
          dataset: { dropcol: col.key },
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
                      content: LOCALE[col.label] || col.key,
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
            ...(state[col.key] || []).map((t) => taskCard(col.key, t)),
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
          styleOpt:
            selected === p.key
              ? { borderColor: p.color, color: p.color }
              : null,
          bubble: 0,
          service: serviceName,
          uiHandler: [ui],
          taskPriority: p.key,
          ...extra,
        }),
      ),
    });

  // Always rendered; CSS hides via data-open. data-member-uid lets the JS
  // re-target data-active after an assignee selection.
  const memberPicker = (selectedUid, serviceName, extra = {}) => {
    const items = [
      Skeletons.Box.X({
        className: `${pfx}__member-row`,
        dataset: { active: !selectedUid ? 1 : 0, "member-uid": "" },
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
          dataset: {
            active: selectedUid === (m.id || m.uid) ? 1 : 0,
            "member-uid": m.id || m.uid,
          },
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
        }),
      ),
    ];
    const kind = extra.pickerKind || null;
    return Skeletons.Box.Y({
      className: `${pfx}__member-picker`,
      dataset: {
        "picker-kind": kind || "",
        open: kind && pickerOpen === kind ? 1 : 0,
      },
      kids: items,
    });
  };

  const assigneeButton = (task, kind) => {
    const m = task.assignee_uid ? ui.getMember(task.assignee_uid) : null;
    const label = m ? fullName(m) : LOCALE.UNASSIGNED;
    return Skeletons.Box.X({
      className: `${pfx}__assignee-button`,
      sys_pn: `${kind}-button`,
      partHandler: ui,
      dataset: { open: pickerOpen === kind ? 1 : 0, "picker-kind": kind },
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

  const buildDropdownContent = (results, query, resultRow) => {
    if (results && results.length) {
      return [
        Skeletons.Box.Y({
          className: `${pfx}__file-search-results`,
          kids: results.map(resultRow),
        }),
      ];
    }
    if (query && query.length >= 2) {
      return [
        Skeletons.Note({
          className: `${pfx}__file-search-empty`,
          content: LOCALE.NO_FILE_RESULTS,
        }),
      ];
    }
    return [];
  };

  // ── File picker (search bar + result rows + Link button) ─────
  const filePickerBlock = (scope, opt = {}) => {
    const { taskId = null, pendingFiles = [], existingFiles = [] } = opt;
    const isActiveScope = fileSearch && fileSearch.scope === scope;
    const query = isActiveScope ? fileSearch.query || "" : "";
    const results = isActiveScope ? fileSearch.results || [] : [];
    const linkedNids = new Set([
      ...pendingFiles.map((f) => f.nid),
      ...existingFiles.map((f) => f.file_nid || f.nid),
    ]);

    // Whole row is clickable — picking a suggestion adds it to the pending
    // list. No per-row Link button; the single Link button sits on the
    // search bar (see below).
    const resultRow = (r) => {
      const linked = linkedNids.has(r.nid);
      return Skeletons.Box.X({
        className: `${pfx}__file-result-row`,
        dataset: { linked: linked ? 1 : 0 },
        bubble: 0,
        service: linked ? null : "link-search-result",
        uiHandler: linked ? null : [ui],
        fileNid: r.nid,
        fileName: r.filename,
        fileExt: r.ext,
        searchScope: scope,
        kids: [
          Skeletons.Image.Svg({
            ico: "attachment",
            className: `${pfx}__file-result-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__file-result-name`,
            content: `${r.filename || ""}${r.ext ? "." + r.ext : ""}`,
          }),
          linked
            ? Skeletons.Note({
                className: `${pfx}__file-result-status`,
                content: LOCALE.LINKED,
              })
            : null,
        ].filter(Boolean),
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
            // Newly-picked uploads carry localKey (no nid yet); search-picked
            // entries carry nid. _removePendingFile matches on either.
            fileNid: f.nid,
            localKey: f.localKey,
          }),
        ],
      });

    // data-search-focused is flipped by the focusin/focusout handlers in
    // index.js so toggling the dropdown does not re-render the panel.
    const searchField = Skeletons.Box.Y({
      className: `${pfx}__file-search-field`,
      dataset: { "search-focused": 0 },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__file-search-bar`,
          kids: [
            Skeletons.Entry({
              className: `${pfx}__file-search-input`,
              name: `file-search-${scope}`,
              value: query,
              placeholder: LOCALE.SEARCH_FILES,
              require: "any",
              // `interactive:1` makes the service fire on every keystroke,
              // not just on Enter. _scheduleFileSearch already debounces
              // the actual API call, so this is safe.
              mode: "commit",
              interactive: 1,
              bubble: 0,
              service: "file-search-input",
              uiHandler: [ui],
              searchScope: scope,
              taskId,
            }),
            Skeletons.Button.Label({
              className: `${pfx}__file-search-upload-btn`,
              label: LOCALE.UPLOAD,
              ico: "desktop_upload",
              bubble: 0,
              service: _e.upload,
              uiHandler: [ui],
              searchScope: scope,
              taskId,
            }),
            // Link affordance attached to the search bar — text + icon,
            // matching the Figma. Clicking it forces a search submit so
            // it works as an Enter-equivalent for users who don't think
            // to press Enter.
            // Skeletons.Box.X({
            //   className: `${pfx}__file-search-link`,
            //   bubble: 0,
            //   service: "file-search-input",
            //   uiHandler: [ui],
            //   searchScope: scope,
            //   kids: [
            //     Skeletons.Note({
            //       className: `${pfx}__file-search-link-text`,
            //       content: LOCALE.LINK_FILE,
            //     }),
            //     Skeletons.Image.Svg({
            //       ico: "apps-link-simple",
            //       className: `${pfx}__file-search-link-ico`,
            //     }),
            //   ],
            // }),
          ],
        }),
        // sys_pn lets index.js re-feed only the dropdown on search results;
        // CSS hides via data-empty / data-search-focused.
        (() => {
          const content = buildDropdownContent(results, query, resultRow);
          return Skeletons.Box.Y({
            className: `${pfx}__file-search-dropdown`,
            sys_pn: `file-search-dropdown-${scope}`,
            partHandler: ui,
            dataset: { empty: content.length ? 0 : 1 },
            kids: content,
          });
        })(),
      ],
    });

    // Always mount the pending list with a sys_pn so add/remove can refeed
    // just this part via ensurePart — full _render() would blow away the
    // title/description inputs' focus and scroll position.
    //
    // Pending list sits ABOVE the search/upload bar so it stacks naturally
    // with the existing attachments above (detail panel) or with the form
    // fields above (create modal) — all "file rows" land together.
    return Skeletons.Box.Y({
      className: `${pfx}__file-picker`,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__file-pending-list`,
          sys_pn: `file-pending-list-${scope}`,
          partHandler: ui,
          dataset: { empty: pendingFiles.length ? 0 : 1 },
          kids: pendingFiles.map(pendingRow),
        }),
        searchField,
      ],
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
        }),
      ),
    });
  };

  // ── Detail panel ──────────────────────────────────────────────
  const detailPanel = () => {
    const attachments = ui.getDetailAttachments();
    const cols = ui.getColumns();
    // Render against the editable draft (seeded from the task on open).
    // Falls back to the task itself for safety.
    const dDraft = ui.getDetailDraft() || detail;
    const dStatus = dDraft.status || detail.status || "todo";
    const dPriority = dDraft.priority || detail.priority || "medium";
    const dAssignee =
      dDraft.assignee_uid != null ? dDraft.assignee_uid : detail.assignee_uid;
    const dLabels = Array.isArray(dDraft.labels)
      ? dDraft.labels
      : detail.label_ids || [];
    const dLabelSet = new Set(dLabels);

    const statusSwitcher = Skeletons.Box.X({
      className: `${pfx}__detail-status`,
      kids: cols.map((c) =>
        Skeletons.Note({
          className: `${pfx}__detail-status-pill`,
          content: LOCALE[c.label] || c.key,
          dataset: { active: dStatus === c.key ? 1 : 0, status: c.key },
          styleOpt:
            dStatus === c.key ? { borderColor: c.color, color: c.color } : null,
          bubble: 0,
          service: "set-status",
          uiHandler: [ui],
          taskStatus: c.key,
        }),
      ),
    });

    const priorityRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.PRIORITY,
        }),
        priorityPills(dPriority, "set-priority"),
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
          value: dDraft.description || "",
          placeholder: LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
          require: "any",
          rows: 3,
          ignoreEnter: true,
          removeOnEscape: false,
          bubble: 0,
          watch: "task-input-changed",
          uiHandler: [ui],
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
        assigneeButton({ assignee_uid: dAssignee }, "detail-assignee"),
        memberPicker(dAssignee, "set-assignee", { pickerKind: "detail-assignee" }),
      ],
    });

    // Detail-scope label chooser uses the draft's labels, not the task's.
    const detailLabelChooser = (() => {
      if (!allLabels.length) {
        return Skeletons.Note({
          className: `${pfx}__labels-empty`,
          content: LOCALE.NO_LABELS,
        });
      }
      return Skeletons.Box.X({
        className: `${pfx}__label-chooser`,
        kids: allLabels.map((l) =>
          Skeletons.Note({
            className: `${pfx}__label-option`,
            content: l.name,
            dataset: { selected: dLabelSet.has(l.id) ? 1 : 0, "label-id": l.id },
            styleOpt: dLabelSet.has(l.id)
              ? { background: l.color, borderColor: l.color }
              : { borderColor: l.color, color: l.color },
            bubble: 0,
            service: "toggle-task-label",
            uiHandler: [ui],
            labelId: l.id,
          }),
        ),
      });
    })();

    const labelsRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.LABELS,
        }),
        detailLabelChooser,
      ],
    });

    const dueRow = Skeletons.Box.X({
      className: `${pfx}__detail-due-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.DUE_DATE,
        }),
        {
          kind: "date_picker",
          className: `${pfx}__detail-due-input`,
          innerClass: `${pfx}__detail-due-input-inner`,
          name: "due_date",
          value: dDraft.due_date || "",
          service: "task-input-changed",
          uiHandler: [ui],
          // appendTo: body escapes the panel's overflow clip; onReady tags
          // the calendar so it can be themed without bleeding into other
          // date_picker usages.
          vendorOpt: {
            dateFormat: "Y-m-d",
            minDate: "today",
            appendTo: document.body,
            onReady: (_d, _s, instance) => {
              if (instance && instance.calendarContainer) {
                instance.calendarContainer.classList.add("tasks-panel__flatpickr");
              }
            },
          },
        },
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

    // Rows live in a stable sub-part so unlink can re-feed just this list
    // without re-rendering the whole detail panel (which would steal focus
    // and wipe any unsaved title/description edits).
    const attachmentRowsContainer = Skeletons.Box.Y({
      className: `${pfx}__attachment-rows`,
      sys_pn: "attachment-rows",
      partHandler: ui,
      dataset: { empty: attachments.length ? 0 : 1 },
      kids: attachments.length
        ? attachments.map(attachmentRow)
        : [
            Skeletons.Note({
              className: `${pfx}__attachments-empty`,
              content: LOCALE.NO_ATTACHMENTS,
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
          ],
        }),
        attachmentRowsContainer,
        filePickerBlock("detail", {
          taskId: detail.id,
          existingFiles: attachments,
          // Detail pending list — files queued for upload/link on Update.
          pendingFiles: dDraft.pending_files || [],
        }),
      ],
    });

    const actions = Skeletons.Box.X({
      className: `${pfx}__detail-actions`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-cancel`,
          content: LOCALE.CANCEL,
          bubble: 0,
          service: "cancel-detail",
          uiHandler: [ui],
        }),
        Skeletons.Note({
          className: `${pfx}__detail-submit`,
          content: LOCALE.UPDATE,
          bubble: 0,
          service: "commit-detail",
          uiHandler: [ui],
        }),
      ],
    });

    return Skeletons.Box.Y({
      className: `${pfx}__detail-panel`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__detail-header`,
          kids: [
            Skeletons.Entry({
              className: `${pfx}__detail-title`,
              name: "title",
              value: dDraft.title || "",
              placeholder: LOCALE.TASK_TITLE,
              require: "any",
              bubble: 0,
              watch: "task-input-changed",
              uiHandler: [ui],
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
        actions,
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
          content: LOCALE[c.label] || c.key,
          // `data-status` lets the JS update pills via DOM without
          // re-rendering (see _updateStatusPills).
          dataset: { active: selectedStatus === c.key ? 1 : 0, status: c.key },
          styleOpt:
            selectedStatus === c.key
              ? { borderColor: c.color, color: c.color }
              : null,
          bubble: 0,
          service: "create-status",
          uiHandler: [ui],
          taskStatus: c.key,
        }),
      ),
    });

    const labelChooser = allLabels.length
      ? Skeletons.Box.X({
          className: `${pfx}__label-chooser`,
          kids: allLabels.map((l) =>
            Skeletons.Note({
              className: `${pfx}__label-option`,
              content: l.name,
              dataset: { selected: selectedLabels.has(l.id) ? 1 : 0, "label-id": l.id },
              styleOpt: selectedLabels.has(l.id)
                ? { background: l.color, borderColor: l.color }
                : { borderColor: l.color, color: l.color },
              bubble: 0,
              service: "create-toggle-label",
              uiHandler: [ui],
              labelId: l.id,
            }),
          ),
        })
      : Skeletons.Note({
          className: `${pfx}__labels-empty`,
          content: LOCALE.NO_LABELS,
        });

    // Use the shared factory so the create-modal button registers
    // sys_pn:"create-assignee-button" + partHandler:ui — without that,
    // _applyAssigneeChange's ensurePart(...) never resolves and the button
    // stays blank until the next full render.
    const assigneeButtonNode = assigneeButton(
      { assignee_uid: selectedAssignee },
      "create-assignee",
    );

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
              name: "title",
              value: draft?.title || "",
              placeholder: LOCALE.TASK_TITLE,
              require: "any",
              mode: "commit",
              bubble: 0,
              service: "commit-task",
              uiHandler: [ui],
              watch: "task-input-changed",
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
              watch: "task-input-changed",
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
            memberPicker(selectedAssignee, "create-assignee", { pickerKind: "create-assignee" }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-label`,
              content: LOCALE.LABELS,
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
            {
              kind: "date_picker",
              className: `${pfx}__create-input`,
              innerClass: `${pfx}__create-input-inner`,
              name: "due_date",
              value: draft?.due_date || "",
              service: "task-input-changed",
              uiHandler: [ui],
              vendorOpt: {
                dateFormat: "Y-m-d",
                minDate: "today",
                appendTo: document.body,
                onReady: (_d, _s, instance) => {
                  if (instance && instance.calendarContainer) {
                    instance.calendarContainer.classList.add("tasks-panel__flatpickr");
                  }
                },
              },
            },
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__create-field`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__create-label`,
              content: LOCALE.LINKED_FILES,
            }),
            filePickerBlock("create", {
              pendingFiles: draft?.pending_files || [],
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
      // No service on the backdrop — closing the modal must be explicit
      // (the X button or the Cancel link in the form footer).
      bubble: 0,
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
      // sys_pn is hardcoded to "fileselector" by Skeletons.FileSelector;
      // ensurePart("fileselector") + onPartReady("fileselector") match it.
      Skeletons.FileSelector({
        accept: "*/*",
        partHandler: ui,
        uiHandler: [ui],
        bubble: 0,
      }),
    ],
  });
};

function buildAssigneeButtonContent(ui, assigneeUid) {
  const pfx = ui.fig.family;
  const m = assigneeUid ? ui.getMember(assigneeUid) : null;
  const label = m
    ? [m.firstname, m.lastname].filter(Boolean).join(" ").trim() || m.email || ""
    : LOCALE.UNASSIGNED;
  return [
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
  ];
}

function buildPendingListContent(ui, pendingFiles) {
  const pfx = ui.fig.family;
  return (pendingFiles || []).map((f) =>
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
          localKey: f.localKey,
        }),
      ],
    }),
  );
}

function buildAttachmentRowsContent(ui, attachments, taskId) {
  const pfx = ui.fig.family;
  if (!attachments || !attachments.length) {
    return [
      Skeletons.Note({
        className: `${pfx}__attachments-empty`,
        content: LOCALE.NO_ATTACHMENTS,
      }),
    ];
  }
  return attachments.map((f) =>
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
          taskId,
          fileNid: f.file_nid,
        }),
      ],
    }),
  );
}

make.buildFileSearchDropdownContent = buildFileSearchDropdownContent;
make.buildAssigneeButtonContent = buildAssigneeButtonContent;
make.buildPendingListContent = buildPendingListContent;
make.buildAttachmentRowsContent = buildAttachmentRowsContent;
module.exports = make;
