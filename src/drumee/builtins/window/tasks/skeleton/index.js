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

  if (results.length) {
    const rows = results.map(resultRow);
    // Footer shown while the next page is loading (infinite scroll).
    if (fileSearch && fileSearch.loadingMore) {
      rows.push(
        Skeletons.Note({
          className: `${pfx}__file-search-loading`,
          content: LOCALE.LOADING || "…",
        }),
      );
    }
    return [
      Skeletons.Box.Y({
        className: `${pfx}__file-search-results`,
        kids: rows,
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

const { stripMarkers: stripMentionMarkers } = require("../mention-markers");

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

  // @-mention support for the description fields. The description is a
  // contenteditable editor (not a textarea) so tagged members render as styled
  // inline chips and the dropdown can anchor to the live caret — the same
  // primitive Jira/Linear use. The panel owns the editor's content and events
  // via onPartReady; `scope` is "create" | "detail" so it targets the right
  // editor + dropdown.
  const descEditor = (scope) => mentionField(ui, scope);

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
    // Multi-assignee: overlapping avatars (up to 3) then a "+N" chip — sits
    // bottom-right of the card meta row (matches Figma 2021:117822).
    const uids = Array.isArray(task.assignee_uids)
      ? task.assignee_uids
      : task.assignee_uid
        ? [task.assignee_uid]
        : [];
    if (!uids.length) return null;
    const MAX = 3;
    const shown = uids.slice(0, MAX);
    const overflow = uids.length - shown.length;
    const items = shown.map((uid) => {
      const m = ui.getMember(uid) || {};
      return Skeletons.UserProfile({
        className: `${pfx}__task-avatar`,
        id: uid,
        firstname: m.firstname,
        lastname: m.lastname,
        auto_color: 1,
        live_status: 0,
      });
    });
    if (overflow > 0) {
      items.push(
        Skeletons.Note({
          className: `${pfx}__task-avatar-more`,
          content: `+${overflow}`,
        }),
      );
    }
    return Skeletons.Box.X({
      className: `${pfx}__task-avatars`,
      kids: items,
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

    // Linked-files preview — wrapping paperclip chips (first 3) + "+N".
    const visibleFiles = linkedFiles.slice(0, 3);
    const moreFiles = Math.max(0, linkedFiles.length - visibleFiles.length);
    const filesNode = visibleFiles.length
      ? Skeletons.Box.X({
          className: `${pfx}__task-files`,
          kids: [
            ...visibleFiles.map((f) =>
              Skeletons.Box.X({
                className: `${pfx}__task-file`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "app-attachment",
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
                  content: `+${moreFiles}`,
                })
              : null,
          ].filter(Boolean),
        })
      : null;

    // Footer: priority pill + due-date pill on the left, assignee avatars
    // pushed to the right (Figma 2021:117822).
    const priorityText = LOCALE[priority.label] || priority.key;
    // Meta row — priority pill (only when a priority is set, per Figma's
    // `visible:Priorities`) + due-date pill. Avatars are pushed right.
    const metaKids = [
      task.priority
        ? Skeletons.Note({
            className: `${pfx}__task-priority`,
            content: priorityText,
            attrOpt: { "data-priority": task.priority },
          })
        : null,
      task.due_date ? dueBadge(task) : null,
    ].filter(Boolean);
    const meta = metaKids.length
      ? Skeletons.Box.X({ className: `${pfx}__task-meta`, kids: metaKids })
      : null;
    const avatars = assigneeAvatar(task);
    // Status pill row (Figma 2040-106090: "● In Progress" + avatars at the
    // card bottom). Dot color comes from the live column set so custom
    // columns tint correctly.
    const cardCol =
      ui.getColumns().find((c) => c.key === (task.status || colKey)) || {};
    const statusPill = Skeletons.Box.X({
      className: `${pfx}__task-status`,
      dataset: { theme: cardCol.theme || "default" },
      kids: [
        Skeletons.Note({
          className: `${pfx}__task-status-dot`,
          styleOpt: { background: cardCol.color || "#AEAEB2" },
        }),
        Skeletons.Note({
          className: `${pfx}__task-status-label`,
          content: cardCol.name || LOCALE[cardCol.label] || task.status || "",
        }),
      ],
    });
    const footer = Skeletons.Box.X({
      className: `${pfx}__task-foot`,
      kids: [statusPill, avatars].filter(Boolean),
    });

    // Title + description sit in a tight header block (4px gap); the 12px card
    // gap then separates it from files / meta (Figma EL-b7a7a618 / EL-6d1b5341).
    const head = Skeletons.Box.Y({
      className: `${pfx}__task-head`,
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
          ].filter(Boolean),
        }),
        // Description preview (clamped via CSS; omitted when empty).
        task.description
          ? Skeletons.Note({
              className: `${pfx}__task-desc`,
              content: stripMentionMarkers(task.description),
            })
          : null,
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
      // Figma card order: labels, title+desc, files, priority+due row, then
      // the status-pill + avatars row.
      kids: [labelsStrip, head, filesNode, meta, footer].filter(Boolean),
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
          content: `+ ${LOCALE.NEW_TASK}`,
        }),
      ],
    });

  // Menu popover for a CUSTOM column: rename entry + palette swatches + delete.
  const columnMenu = (col) =>
    Skeletons.Box.Y({
      className: `${pfx}__col-menu`,
      bubble: 0,
      kids: [
        Skeletons.Entry({
          className: `${pfx}__col-menu-name`,
          name: "col_rename",
          value: col.name,
          placeholder: LOCALE.COLUMN_NAME,
          mode: "commit",
          service: "col-rename-submit",
          taskColumn: col.key,
          uiHandler: [ui],
        }),
        Skeletons.Box.X({
          className: `${pfx}__col-swatches`,
          kids: Object.keys(ui.getColumnThemes()).map((t) =>
            Skeletons.Note({
              className: `${pfx}__col-swatch`,
              styleOpt: { background: ui.getColumnThemes()[t] },
              dataset: { active: col.theme === t ? 1 : 0 },
              bubble: 0,
              service: "col-theme-set",
              uiHandler: [ui],
              taskColumn: col.key,
              colTheme: t,
            }),
          ),
        }),
        Skeletons.Box.X({
          className: `${pfx}__col-menu-actions`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__col-menu-rename`,
              content: LOCALE.RENAME,
              bubble: 0,
              service: "col-rename-submit",
              uiHandler: [ui],
              taskColumn: col.key,
            }),
            Skeletons.Note({
              className: `${pfx}__col-menu-delete`,
              content: LOCALE.DELETE,
              bubble: 0,
              service: "col-delete",
              uiHandler: [ui],
              taskColumn: col.key,
            }),
          ],
        }),
      ],
    });

  const column = (col) =>
    Skeletons.Box.Y({
      className: `${pfx}__column`,
      dataset: { column: col.key, theme: col.theme || "default" },
      // Per-column accent driven by the column color (getColumns in index.js)
      // so the SCSS theming (top strip, count pill, drop highlight) stays in
      // sync with the single source of truth instead of duplicating hex values.
      styleOpt: { "--col-accent": col.color },
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
                    Skeletons.Box.X({
                      className: `${pfx}__column-title-dot-group`,
                      kids: [
                        Skeletons.Element({
                          tagName: "span",
                          className: `${pfx}__column-dot`,
                          styleOpt: { background: col.color },
                        }),
                        Skeletons.Note({
                          className: `${pfx}__column-title`,
                          content: col.name || LOCALE[col.label] || col.key,
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
                // Custom columns are user-editable: "⋯" opens the rename/
                // recolor/delete popover. Built-ins stay fixed.
                col.custom
                  ? Skeletons.Note({
                      className: `${pfx}__col-menu-btn`,
                      content: "⋯",
                      bubble: 0,
                      service: "col-menu",
                      uiHandler: [ui],
                      taskColumn: col.key,
                    })
                  : null,
              ].filter(Boolean),
            }),
            col.custom && ui.getColMenuFor() === col.key
              ? columnMenu(col)
              : null,
            ...(state[col.key] || []).map((t) => taskCard(col.key, t)),
            // Empty-state drop hint. Keeps an empty column an obvious, valid
            // drop target. The surgical drag handler (_syncColumn) adds/removes
            // an equivalent node as cards enter/leave without a full re-render.
            (state[col.key] || []).length
              ? null
              : Skeletons.Note({
                  className: `${pfx}__column-empty`,
                  content: LOCALE.DROP_TASKS_HERE,
                }),
          ].filter(Boolean),
        }),
        addButton(col.key),
      ],
    });

  // Columns are added via the "New board" modal (add-board), launched from the
  // viewbar — see boardModal(). The board's right end no longer has an inline
  // ghost.

  // ── Reusable controls ─────────────────────────────────────────
  const priorityPills = (selected, serviceName, extra = {}) =>
    Skeletons.Box.X({
      className: `${pfx}__priority-pills`,
      kids: priorities.map((p) =>
        Skeletons.Note({
          className: `${pfx}__priority-pill`,
          content: LOCALE[p.label] || p.key,
          // Colors are driven by `data-priority` + `data-active` in the skin
          // (filled-when-selected, outline otherwise) to match Figma exactly.
          dataset: { active: selected === p.key ? 1 : 0, priority: p.key },
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
  const memberPicker = (selectedUids, serviceName, extra = {}) => {
    // Multi-select: selectedUids is the array of currently-assigned uids. Rows
    // toggle membership and the picker stays open; the "Unassigned" row clears
    // the whole set and is active only when nothing is selected.
    const selected = Array.isArray(selectedUids)
      ? selectedUids.map(String)
      : selectedUids
        ? [String(selectedUids)]
        : [];
    const items = [
      Skeletons.Box.X({
        className: `${pfx}__member-row`,
        dataset: { active: !selected.length ? 1 : 0, "member-uid": "" },
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
            active: selected.includes(String(m.id || m.uid)) ? 1 : 0,
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
    const assignees = Array.isArray(task.assignees)
      ? task.assignees
      : task.assignee_uid
        ? [task.assignee_uid]
        : [];
    return Skeletons.Box.X({
      className: `${pfx}__assignee-button`,
      sys_pn: `${kind}-button`,
      partHandler: ui,
      dataset: { open: pickerOpen === kind ? 1 : 0, "picker-kind": kind },
      bubble: 0,
      service: "toggle-picker",
      uiHandler: [ui],
      pickerKind: kind,
      kids: buildAssigneeButtonContent(
        ui,
        assignees,
        kind === "create-assignee" ? "create-assignee" : "set-assignee",
      ),
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

    const pendingRow = (f) => pendingRowDescriptor(ui, f);

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
        Skeletons.Box.X({
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
    const dAssignees = Array.isArray(dDraft.assignees)
      ? dDraft.assignees
      : Array.isArray(detail.assignee_uids)
        ? detail.assignee_uids
        : [];
    const dLabels = Array.isArray(dDraft.labels)
      ? dDraft.labels
      : detail.label_ids || [];
    const dLabelSet = new Set(dLabels);

    const statusSwitcher = Skeletons.Box.X({
      className: `${pfx}__detail-status`,
      kids: cols.map((c) =>
        Skeletons.Note({
          className: `${pfx}__detail-status-pill`,
          content: c.name || LOCALE[c.label] || c.key,
          // Selected/dot colors driven by `data-status` + `data-active` in skin.
          dataset: { active: dStatus === c.key ? 1 : 0, status: c.key },
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
        descEditor("detail"),
      ],
    });

    const assigneeRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.ASSIGNEE,
        }),
        assigneeButton({ assignees: dAssignees }, "detail-assignee"),
        memberPicker(dAssignees, "set-assignee", {
          pickerKind: "detail-assignee",
        }),
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
            dataset: {
              selected: dLabelSet.has(l.id) ? 1 : 0,
              "label-id": l.id,
            },
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

    // Due-date section is a stable sub-part so the Duration toggle can re-feed
    // just this block (swap single <-> range picker + flip the switch) without
    // a full-panel _render() that flickers and steals focus. Content lives in
    // buildDueSectionContent so the controller can re-feed it via ensurePart.
    const dueRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      sys_pn: "due-section",
      partHandler: ui,
      kids: buildDueSectionContent(ui),
    });

    const attachmentRow = (f) => attachmentRowDescriptor(ui, f, detail.id);

    // Rows live in a stable sub-part so unlink can re-feed just this list
    // without re-rendering the whole detail panel (which would steal focus
    // and wipe any unsaved title/description edits).
    const attachmentRowsContainer = Skeletons.Box.X({
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

    // Comments: flat feed (a re-feedable part) + an @-mention composer.
    // Activity header: title + All / Comments / History tabs. Tabs are
    // visual-only for now (no history backend) — "All" reads as active and the
    // comment feed below is the populated content.
    const activityTab = (label, active, icon) =>
      Skeletons.Box.X({
        className: `${pfx}__activity-tab`,
        dataset: { active: active ? 1 : 0 },
        kids: [
          icon
            ? Skeletons.Image.Svg({
                ico: icon,
                className: `${pfx}__activity-tab-ico`,
              })
            : null,
          Skeletons.Note({
            className: `${pfx}__activity-tab-label`,
            content: label,
          }),
        ].filter(Boolean),
      });

    const commentsSection = Skeletons.Box.Y({
      className: `${pfx}__comments`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__activity-head`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__activity-title`,
              content: LOCALE.ACTIVITY,
            }),
            Skeletons.Box.X({
              className: `${pfx}__activity-tabs`,
              kids: [
                activityTab(LOCALE.ALL, true),
                activityTab(LOCALE.COMMENTS, false, "message"),
                activityTab(LOCALE.HISTORY, false, "clock"),
              ],
            }),
          ],
        }),
        // Composer sits directly under the Activity tabs (Figma 2034-62457):
        // own avatar · "Write a comment…" field · paperclip / @ / send icons.
        Skeletons.Box.X({
          className: `${pfx}__comment-composer`,
          kids: [
            Skeletons.UserProfile({
              className: `${pfx}__composer-avatar`,
              id: Visitor.id,
              firstname: Visitor.get("firstname"),
              lastname: Visitor.get("lastname"),
              auto_color: 1,
              live_status: 0,
            }),
            mentionField(ui, "comment", {
              fieldClass: `${pfx}__comment-field`,
              editorClass: `${pfx}__comment-input`,
              placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
            }),
            Skeletons.Box.X({
              className: `${pfx}__composer-actions`,
              kids: [
                Skeletons.Image.Svg({
                  ico: "app-attachment",
                  className: `${pfx}__composer-ico`,
                }),
                Skeletons.Note({
                  className: `${pfx}__composer-at`,
                  content: "@",
                }),
                Skeletons.Button.Svg({
                  ico: "app-send",
                  className: `${pfx}__composer-send`,
                  bubble: 0,
                  service: "comment-submit",
                  uiHandler: [ui],
                }),
              ],
            }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__comment-list`,
          sys_pn: "comment-list",
          partHandler: ui,
          kids: buildCommentListContent(ui),
        }),
      ],
    });

    // Figma footer is a single full-width primary button; the header X closes.
    const actions = Skeletons.Box.X({
      className: `${pfx}__detail-actions`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-submit`,
          content: LOCALE.SAVE_CHANGE,
          bubble: 0,
          service: "commit-detail",
          uiHandler: [ui],
        }),
      ],
    });

    const header = Skeletons.Box.X({
      className: `${pfx}__detail-header`,
      kids: [
        // Textarea (not Entry) so a long title wraps and stays fully
        // visible in the update popup instead of being clipped past the
        // field width. `ignoreEnter` keeps it logically single-line.
        Skeletons.Textarea({
          className: `${pfx}__detail-title`,
          name: "title",
          value: dDraft.title || "",
          placeholder: LOCALE.TASK_TITLE,
          require: "any",
          rows: 1,
          ignoreEnter: true,
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
    });

    // Status pills get a label in the sidebar so the metadata column reads
    // as a consistent list of labeled fields (Jira "Details" panel).
    const statusRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.STATUS,
        }),
        statusSwitcher,
      ],
    });

    // Centered two-column modal (Jira issue view): description + attachments
    // on the left, the metadata sidebar on the right.
    return Skeletons.Box.Y({
      className: `${pfx}__detail-backdrop`,
      // No backdrop service — closing is explicit (X or Cancel), matching the
      // create modal and guarding against accidental loss of unsaved edits.
      bubble: 0,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__detail-panel`,
          bubble: 0,
          kids: [
            header,
            Skeletons.Box.X({
              className: `${pfx}__modal-body`,
              kids: [
                Skeletons.Box.Y({
                  className: `${pfx}__modal-main`,
                  kids: [
                    // Figma 2040-14173: Description and Files sit side-by-side
                    // on top; the Activity feed spans the full width below.
                    Skeletons.Box.X({
                      className: `${pfx}__detail-top`,
                      kids: [descriptionRow, attachmentsList],
                    }),
                    commentsSection,
                  ],
                }),
                Skeletons.Box.Y({
                  className: `${pfx}__modal-side`,
                  kids: [statusRow, priorityRow, assigneeRow, dueRow, actions],
                }),
              ],
            }),
            dropOverlay(ui),
          ],
        }),
      ],
    });
  };

  // ── Create modal ──────────────────────────────────────────────
  // "New board" modal (Figma 2040-53814) — creates a Kanban column: title +
  // 3×3 colour palette + "set as default" toggle.
  const THEME_LABELS = {
    default: LOCALE.COLOR_DEFAULT,
    orange: LOCALE.COLOR_ORANGE,
    yellow: LOCALE.COLOR_YELLOW,
    green: LOCALE.COLOR_GREEN,
    cyan: LOCALE.COLOR_CYAN,
    blue: LOCALE.COLOR_BLUE,
    purple: LOCALE.COLOR_PURPLE,
    pink: LOCALE.COLOR_PINK,
    red: LOCALE.COLOR_RED,
  };
  const boardModal = () => {
    const st = ui.getBoardModalState();
    const themes = ui.getColumnThemes();
    return Skeletons.Box.Y({
      className: `${pfx}__board-backdrop`,
      bubble: 0,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__board-modal`,
          bubble: 0,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__board-header`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__board-title-text`,
                  content: LOCALE.NEW_BOARD,
                }),
                Skeletons.Button.Svg({
                  className: `${pfx}__board-close`,
                  ico: "cross",
                  bubble: 0,
                  service: "board-cancel",
                  uiHandler: [ui],
                }),
              ],
            }),
            Skeletons.Box.Y({
              className: `${pfx}__board-field`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__board-label`,
                  content: LOCALE.BOARD_TITLE,
                }),
                Skeletons.Entry({
                  className: `${pfx}__board-input`,
                  name: "board_title",
                  placeholder: LOCALE.BOARD_TITLE,
                  mode: "commit",
                  service: "board-submit",
                  uiHandler: [ui],
                }),
              ],
            }),
            Skeletons.Box.Y({
              className: `${pfx}__board-field`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__board-label`,
                  content: LOCALE.COLORS,
                }),
                Skeletons.Box.G({
                  className: `${pfx}__board-colors`,
                  kids: Object.keys(themes).map((t) =>
                    Skeletons.Box.X({
                      className: `${pfx}__board-color`,
                      dataset: { active: st.theme === t ? 1 : 0 },
                      bubble: 0,
                      service: "board-theme",
                      uiHandler: [ui],
                      colTheme: t,
                      kids: [
                        Skeletons.Note({
                          className: `${pfx}__board-color-dot`,
                          styleOpt: { borderColor: themes[t] },
                        }),
                        Skeletons.Note({
                          className: `${pfx}__board-color-name`,
                          content: THEME_LABELS[t] || t,
                        }),
                      ],
                    }),
                  ),
                }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}__board-default-row`,
              bubble: 0,
              service: "board-default",
              uiHandler: [ui],
              kids: [
                Skeletons.Note({
                  className: `${pfx}__board-default-label`,
                  content: LOCALE.SET_AS_DEFAULT,
                }),
                Skeletons.Box.X({
                  className: `${pfx}__board-toggle`,
                  dataset: { on: st.isDefault ? 1 : 0 },
                  kids: [
                    Skeletons.Note({ className: `${pfx}__board-toggle-knob` }),
                  ],
                }),
              ],
            }),
            Skeletons.Note({
              className: `${pfx}__board-submit`,
              content: LOCALE.ADD_NEW_BOARD,
              bubble: 0,
              service: "board-submit",
              uiHandler: [ui],
            }),
          ],
        }),
      ],
    });
  };

  const createModal = () => {
    const cols = ui.getColumns();
    const selectedStatus = draft?.status || "todo";
    const selectedPriority = draft?.priority || "medium";
    const selectedAssignees = Array.isArray(draft?.assignees)
      ? draft.assignees
      : [];
    const selectedLabels = new Set(draft?.labels || []);

    const statusPicker = Skeletons.Box.X({
      className: `${pfx}__create-status`,
      kids: cols.map((c) =>
        Skeletons.Note({
          className: `${pfx}__create-status-pill`,
          content: c.name || LOCALE[c.label] || c.key,
          // `data-status` + `data-active` drive pill colors via the skin and
          // let the JS update them in place without a re-render.
          dataset: { active: selectedStatus === c.key ? 1 : 0, status: c.key },
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
              dataset: {
                selected: selectedLabels.has(l.id) ? 1 : 0,
                "label-id": l.id,
              },
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
      { assignees: selectedAssignees },
      "create-assignee",
    );

    // Labeled field shell. extraCn lets a field opt into grow/scroll behaviour.
    const field = (labelText, control, extraCn = "") =>
      Skeletons.Box.Y({
        className: `${pfx}__create-field${extraCn ? " " + extraCn : ""}`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__create-label`,
            content: labelText,
          }),
          control,
        ],
      });

    // Textarea (not Entry) so a long title wraps and stays fully visible
    // instead of being clipped. `ignoreEnter` keeps it logically single-line.
    const titleControl = Skeletons.Textarea({
      className: `${pfx}__create-input ${pfx}__create-title-input`,
      name: "title",
      value: draft?.title || "",
      placeholder: LOCALE.TASK_TITLE,
      require: "any",
      rows: 1,
      ignoreEnter: true,
      bubble: 0,
      uiHandler: [ui],
      watch: "task-input-changed",
    });

    const descControl = descEditor("create");

    const assigneeField = Skeletons.Box.Y({
      className: `${pfx}__create-field`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__create-label`,
          content: LOCALE.ASSIGNEE,
        }),
        assigneeButtonNode,
        memberPicker(selectedAssignees, "create-assignee", {
          pickerKind: "create-assignee",
        }),
      ],
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
        // Two-column body (Jira issue-modal layout): primary content on the
        // left, the metadata sidebar on the right. Stacks on narrow screens.
        Skeletons.Box.X({
          className: `${pfx}__modal-body`,
          kids: [
            Skeletons.Box.Y({
              className: `${pfx}__modal-main`,
              kids: [
                field(LOCALE.TASK_TITLE, titleControl),
                field(
                  LOCALE.TASK_DESCRIPTION,
                  descControl,
                  `${pfx}__create-field-grow`,
                ),
                field(
                  LOCALE.LINKED_FILES,
                  filePickerBlock("create", {
                    pendingFiles: draft?.pending_files || [],
                  }),
                ),
              ],
            }),
            Skeletons.Box.Y({
              className: `${pfx}__modal-side`,
              kids: [
                field(LOCALE.STATUS, statusPicker),
                field(
                  LOCALE.PRIORITY,
                  priorityPills(selectedPriority, "create-priority"),
                ),
                assigneeField,
                // Due-date section: same Duration UI as the detail panel. A
                // stable sub-part so the toggle re-feeds only this block.
                Skeletons.Box.Y({
                  className: `${pfx}__create-field`,
                  sys_pn: "create-due-section",
                  partHandler: ui,
                  kids: buildDueSectionContent(ui, "create"),
                }),
                // Primary action lives at the foot of the right column (Figma).
                Skeletons.Box.X({
                  className: `${pfx}__create-actions`,
                  kids: [
                    Skeletons.Note({
                      className: `${pfx}__create-submit`,
                      content: LOCALE.ADD_NEW_TASK,
                      bubble: 0,
                      service: "commit-task",
                      uiHandler: [ui],
                    }),
                  ],
                }),
              ],
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
          kids: [form, dropOverlay(ui)],
        }),
      ],
    });
  };

  // ── Member filter dropdown ────────────────────────────────────
  // The trigger button lives on the host window's tab bar (same line as
  // Files / Chat / Tasks); this panel owns the members + filter state and
  // renders the dropdown as a top-right overlay when opened via toggleFilter().
  const filterUids = (ui.getFilterUids() || []).map(String);
  const filterActive = filterUids.length > 0;
  const filterOpen = pickerOpen === "filter";

  const filterDropdown = Skeletons.Box.Y({
    className: `${pfx}__filter-picker`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__member-row`,
        dataset: { active: filterActive ? 0 : 1, "member-uid": "" },
        bubble: 0,
        service: "filter-member",
        uiHandler: [ui],
        memberUid: "",
        kids: [
          Skeletons.Note({
            className: `${pfx}__member-name`,
            content: LOCALE.ALL_MEMBERS,
          }),
        ],
      }),
      ...members.map((m) => {
        const uid = String(m.id || m.uid);
        return Skeletons.Box.X({
          className: `${pfx}__member-row`,
          dataset: {
            active: filterUids.includes(uid) ? 1 : 0,
            "member-uid": uid,
          },
          bubble: 0,
          service: "filter-member",
          uiHandler: [ui],
          memberUid: uid,
          kids: [
            Skeletons.UserProfile({
              className: `${pfx}__member-avatar`,
              id: uid,
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
        });
      }),
    ],
  });

  // Sub-views over the same folder-scoped task set. Board is rendered inline
  // (its columns + DnD); List/Summary are separate modules fed the same data.
  const view = ui.getView();
  const boardView = () =>
    Skeletons.Box.X({
      className: `${pfx}__main`,
      kids: ui.getColumns().map(column),
    });
  const viewContent =
    view === "calendar"
      ? require("./calendar")(ui)
      : view === "gantt"
        ? require("./gantt")(ui)
        : view === "list"
          ? require("./list")(ui)
          : view === "summary"
            ? require("./summary")(ui)
            : boardView();

  const viewTabs = Skeletons.Box.X({
    className: `${pfx}__viewbar-tabs`,
    kids: [
      ["board", LOCALE.TASK_VIEW_BOARD],
      ["calendar", LOCALE.TASK_VIEW_CALENDAR],
      ["gantt", LOCALE.TASK_VIEW_GANTT],
      ["list", LOCALE.TASK_VIEW_LIST],
      ["summary", LOCALE.TASK_VIEW_SUMMARY],
    ].map(([key, label]) =>
      Skeletons.Note({
        className: `${pfx}__viewbar-item`,
        content: label,
        attrOpt: { "data-active": view === key ? "1" : "0" },
        bubble: 0,
        service: "set-view",
        uiHandler: [ui],
        viewMode: key,
      }),
    ),
  });

  // Right-side controls (Figma 2040-53814): calendar/gantt granularity when
  // those views are active, then the create buttons, then the shared Filter.
  const newTaskBtn = Skeletons.Note({
    className: `${pfx}__viewbar-new`,
    content: `+ ${LOCALE.NEW_TASK}`,
    bubble: 0,
    service: "add-task",
    uiHandler: [ui],
  });
  const newBoardBtn = Skeletons.Box.X({
    className: `${pfx}__viewbar-board`,
    bubble: 0,
    service: "add-board",
    uiHandler: [ui],
    kids: [
      Skeletons.Image.Svg({ ico: "plus", className: `${pfx}__viewbar-board-ico` }),
      Skeletons.Note({
        className: `${pfx}__viewbar-board-label`,
        content: LOCALE.NEW_BOARD,
      }),
    ],
  });
  const filterBtn = Skeletons.Box.X({
    className: `${pfx}__viewbar-filter`,
    dataset: { active: filterActive ? 1 : 0 },
    bubble: 0,
    service: "toggle-filter",
    uiHandler: [ui],
    kids: [
      Skeletons.Image.Svg({ ico: "desktop_filter", className: `${pfx}__viewbar-filter-ico` }),
      Skeletons.Note({
        className: `${pfx}__viewbar-filter-label`,
        content: LOCALE.FILTER,
      }),
    ],
  });

  const subHeader = Skeletons.Box.X({
    className: `${pfx}__viewbar`,
    kids: [
      viewTabs,
      Skeletons.Box.X({
        className: `${pfx}__viewbar-right`,
        kids: [
          view === "calendar" ? require("./calendar").controls(ui) : null,
          view === "gantt" ? require("./gantt").controls(ui) : null,
          // "+ New task" for the task-list views (calendar/gantt add via their
          // own affordances — the day "+" / "+ Work").
          view === "board" || view === "list" || view === "summary"
            ? newTaskBtn
            : null,
          // "+ New board" adds a Kanban column — board view only.
          view === "board" ? newBoardBtn : null,
          filterBtn,
        ].filter(Boolean),
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    kids: [
      subHeader,
      viewContent,
      // Filter overlay (anchored top-right, below the tab bar's filter button).
      filterOpen ? filterDropdown : null,
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
        className: `${pfx}__board-wrapper`,
        name: "task-board-modal",
        partHandler: ui,
        kids: ui.getBoardModalState().open ? [boardModal()] : [],
      }),
      // sys_pn is hardcoded to "fileselector" by Skeletons.FileSelector;
      // ensurePart("fileselector") + onPartReady("fileselector") match it.
      Skeletons.FileSelector({
        accept: "*/*",
        partHandler: ui,
        uiHandler: [ui],
        bubble: 0,
      }),
    ].filter(Boolean),
  });
};

function buildAssigneeButtonContent(ui, assignees, removeService) {
  const pfx = ui.fig.family;
  // Accept an array of uids (multi-assignee); tolerate a single uid/null.
  const uids = Array.isArray(assignees)
    ? assignees
    : assignees
      ? [assignees]
      : [];
  const fullName = (m) =>
    [m.firstname, m.lastname].filter(Boolean).join(" ").trim() || m.email || "";

  // Empty → Figma "blank" state: a search-style placeholder. Clicking the row
  // still opens the member dropdown (no free-text typing).
  if (!uids.length) {
    return [
      Skeletons.Note({
        className: `${pfx}__assignee-placeholder`,
        content: LOCALE.SEARCH_PEOPLE,
      }),
    ];
  }

  // Selected members render as removable chips (avatar + name + ✕), then a
  // trailing "…" add affordance (Figma Assignee 01 / 02 / 2+ states).
  const MAX = 3;
  const shown = uids.slice(0, MAX);
  const overflow = uids.length - shown.length;
  const chips = shown.map((uid) => {
    const m = ui.getMember(uid) || {};
    return Skeletons.Box.X({
      className: `${pfx}__assignee-chip`,
      kids: [
        Skeletons.UserProfile({
          className: `${pfx}__assignee-chip-avatar`,
          id: uid,
          firstname: m.firstname,
          lastname: m.lastname,
          auto_color: 1,
          live_status: 0,
        }),
        Skeletons.Note({
          className: `${pfx}__assignee-chip-name`,
          content: fullName(m) || LOCALE.UNASSIGNED,
        }),
        // ✕ removes this assignee; bubble:0 so it doesn't open the dropdown.
        Skeletons.Button.Svg({
          className: `${pfx}__assignee-chip-remove`,
          ico: "cross",
          bubble: 0,
          service: removeService,
          uiHandler: [ui],
          memberUid: uid,
        }),
      ],
    });
  });
  if (overflow > 0) {
    chips.push(
      Skeletons.Note({
        className: `${pfx}__assignee-more`,
        content: `+${overflow}`,
      }),
    );
  }
  chips.push(
    Skeletons.Note({ className: `${pfx}__assignee-add`, content: "..." }),
  );
  return chips;
}

// Filtered member rows fed into the description @-mention dropdown. The panel
// wires native onclick on each row (the framework's click dispatch is
// unreliable for dynamically-fed rows — the chat mention list does the same),
// so these carry no service/uiHandler.
// The mention dropdown part (fed with member rows by the panel on @-input).
function mentionDropdown(ui, scope) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__mention-dropdown`,
    sys_pn: `${scope}-mention`,
    partHandler: ui,
    // dataset is dropped at render unless attrOpt is also set — use attrOpt.
    attrOpt: { "data-open": "0" },
    bubble: 0,
    kids: [],
  });
}

// Reusable contenteditable mention editor. `scope` keys the panel's editor
// logic + dropdown part; opt overrides the field/editor classes + placeholder
// so the description and the comment composer/editor each style their own.
function mentionField(ui, scope, opt = {}) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: opt.fieldClass || `${pfx}__desc-field`,
    kids: [
      Skeletons.Element({
        tagName: "div",
        className: opt.editorClass || `${pfx}__desc-editor`,
        sys_pn: `${scope}-desc-editor`,
        partHandler: ui,
        flow: "none", // block flow for contenteditable, not flex
        attrOpt: {
          contenteditable: "true",
          "data-placeholder":
            opt.placeholder || LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
        },
      }),
      mentionDropdown(ui, scope),
    ],
  });
}

function commentTimeAgo(ts) {
  if (!ts) return "";
  try {
    return Dayjs.unix(ts).fromNow();
  } catch {
    return "";
  }
}

// Comment feed rows (flat, chronological). Bodies are populated read-only by
// the panel post-render (chip rendering reused from the editor); the row being
// edited renders an inline mention editor instead. Exported so the panel can
// surgically re-feed the list on a peer's WS change without a full re-render.
// Quick-react palette (also the set offered by the "add reaction" button).
const REACT_EMOJIS = ["👍", "❤️", "🎉", "👀", "✅"];

// Group a comment's raw [{emoji, uid}] reactions into [{emoji, count, own}].
function groupReactions(reactions) {
  const g = {};
  (reactions || []).forEach((x) => {
    const e = x && x.emoji;
    if (!e) return;
    if (!g[e]) g[e] = { emoji: e, count: 0, own: false };
    g[e].count++;
    if (String(x.uid) === String(Visitor.id)) g[e].own = true;
  });
  return Object.keys(g).map((k) => g[k]);
}

function buildCommentListContent(ui) {
  const pfx = ui.fig.family;
  const comments = ui.getComments() || [];
  if (!comments.length) {
    return [
      Skeletons.Note({
        className: `${pfx}__comments-empty`,
        content: LOCALE.NO_COMMENTS,
      }),
    ];
  }
  const editingId = ui.getEditingCommentId();
  const replyingTo = ui.getReplyingTo();
  const pickerFor = ui.getReactPickerFor();
  const fullName = (m) =>
    [m.firstname, m.lastname].filter(Boolean).join(" ").trim() || m.email || "";

  const reactBar = (c) => {
    const kids = groupReactions(c.reactions).map((g) =>
      Skeletons.Note({
        className: `${pfx}__react-chip`,
        content: `${g.emoji} ${g.count}`,
        attrOpt: { "data-own": g.own ? "1" : "0" },
        bubble: 0,
        service: "comment-react",
        uiHandler: [ui],
        commentId: c.id,
        emoji: g.emoji,
      }),
    );
    // Figma action row leads with a one-tap 👍 then the ☺ palette toggle.
    kids.push(
      Skeletons.Note({
        className: `${pfx}__react-add`,
        content: "👍",
        bubble: 0,
        service: "comment-react",
        uiHandler: [ui],
        commentId: c.id,
        emoji: "👍",
      }),
      Skeletons.Note({
        className: `${pfx}__react-add`,
        content: "☺",
        bubble: 0,
        service: "comment-react-toggle",
        uiHandler: [ui],
        commentId: c.id,
      }),
    );
    if (String(pickerFor || "") === String(c.id)) {
      REACT_EMOJIS.forEach((e) =>
        kids.push(
          Skeletons.Note({
            className: `${pfx}__react-pick`,
            content: e,
            bubble: 0,
            service: "comment-react",
            uiHandler: [ui],
            commentId: c.id,
            emoji: e,
          }),
        ),
      );
    }
    return Skeletons.Box.X({ className: `${pfx}__react-bar`, kids });
  };

  const commentBlock = (c, isReply) => {
    const m = ui.getMember(c.author_uid) || {};
    const isOwn = String(c.author_uid) === String(Visitor.id);
    const avatar = Skeletons.UserProfile({
      className: `${pfx}__comment-avatar`,
      id: c.author_uid,
      firstname: m.firstname,
      lastname: m.lastname,
      auto_color: 1,
      live_status: 0,
    });
    const head = Skeletons.Box.X({
      className: `${pfx}__comment-head`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__comment-author`,
          content: fullName(m) || c.author_uid,
        }),
        Skeletons.Note({
          className: `${pfx}__comment-time`,
          content:
            commentTimeAgo(c.ctime) + (c.edited ? ` · ${LOCALE.EDITED}` : ""),
        }),
      ],
    });

    // Inline edit mode for this comment.
    if (editingId && String(editingId) === String(c.id)) {
      return Skeletons.Box.X({
        className: `${pfx}__comment-row`,
        attrOpt: { "data-reply": isReply ? "1" : "0" },
        kids: [
          avatar,
          Skeletons.Box.Y({
            className: `${pfx}__comment-main`,
            kids: [
              head,
              mentionField(ui, "comment-edit", {
                fieldClass: `${pfx}__comment-field`,
                editorClass: `${pfx}__comment-edit-input`,
                placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
              }),
              Skeletons.Box.X({
                className: `${pfx}__comment-actions`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__comment-action ${pfx}__comment-action--primary`,
                    content: LOCALE.SAVE,
                    bubble: 0,
                    service: "comment-save",
                    uiHandler: [ui],
                  }),
                  Skeletons.Note({
                    className: `${pfx}__comment-action`,
                    content: LOCALE.CANCEL,
                    bubble: 0,
                    service: "comment-cancel",
                    uiHandler: [ui],
                  }),
                ],
              }),
            ],
          }),
        ],
      });
    }

    // Action row: Reply (root only) + Edit/Delete (own).
    const actions = [];
    if (!isReply)
      actions.push(
        Skeletons.Note({
          className: `${pfx}__comment-action`,
          content: LOCALE.REPLY,
          bubble: 0,
          service: "comment-reply",
          uiHandler: [ui],
          commentId: c.id,
        }),
      );
    if (isOwn) {
      actions.push(
        Skeletons.Note({
          className: `${pfx}__comment-action`,
          content: LOCALE.EDIT,
          bubble: 0,
          service: "comment-edit",
          uiHandler: [ui],
          commentId: c.id,
        }),
        Skeletons.Note({
          className: `${pfx}__comment-action`,
          content: LOCALE.DELETE,
          bubble: 0,
          service: "comment-delete",
          uiHandler: [ui],
          commentId: c.id,
        }),
      );
    }

    return Skeletons.Box.X({
      className: `${pfx}__comment-row`,
      attrOpt: { "data-reply": isReply ? "1" : "0" },
      kids: [
        avatar,
        Skeletons.Box.Y({
          className: `${pfx}__comment-main`,
          kids: [
            head,
            Skeletons.Element({
              tagName: "div",
              className: `${pfx}__comment-body`,
              flow: "none",
              attrOpt: { "data-comment-id": c.id },
            }),
            reactBar(c),
            actions.length
              ? Skeletons.Box.X({
                  className: `${pfx}__comment-actions`,
                  kids: actions,
                })
              : null,
          ].filter(Boolean),
        }),
      ],
    });
  };

  // 1-level threads: replies nest under their root; an orphaned reply (parent
  // deleted) falls back to the top level.
  const ids = new Set(comments.map((c) => String(c.id)));
  const repliesByParent = {};
  const roots = [];
  comments.forEach((c) => {
    if (c.parent_id && ids.has(String(c.parent_id))) {
      (repliesByParent[c.parent_id] = repliesByParent[c.parent_id] || []).push(
        c,
      );
    } else {
      roots.push(c);
    }
  });

  const out = [];
  roots.forEach((root) => {
    out.push(commentBlock(root, false));
    (repliesByParent[root.id] || []).forEach((rep) =>
      out.push(commentBlock(rep, true)),
    );
    if (String(replyingTo || "") === String(root.id)) {
      out.push(
        Skeletons.Box.Y({
          className: `${pfx}__comment-replybox`,
          kids: [
            mentionField(ui, "comment-reply", {
              fieldClass: `${pfx}__comment-field`,
              editorClass: `${pfx}__comment-reply-input`,
              placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
            }),
            Skeletons.Box.X({
              className: `${pfx}__comment-actions`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__comment-action ${pfx}__comment-action--primary`,
                  content: LOCALE.REPLY,
                  bubble: 0,
                  service: "comment-reply-submit",
                  uiHandler: [ui],
                }),
                Skeletons.Note({
                  className: `${pfx}__comment-action`,
                  content: LOCALE.CANCEL,
                  bubble: 0,
                  service: "comment-reply-cancel",
                  uiHandler: [ui],
                }),
              ],
            }),
          ],
        }),
      );
    }
  });
  return out;
}

function buildMentionItemsContent(ui, members) {
  const pfx = ui.fig.family;
  return (members || []).map((m) => {
    const uid = String(m.id || m.uid || "");
    const name =
      [m.firstname, m.lastname].filter(Boolean).join(" ").trim() ||
      m.email ||
      uid;
    return Skeletons.Box.X({
      className: `${pfx}__mention-item`,
      bubble: 0,
      kids: [
        Skeletons.UserProfile({
          className: `${pfx}__mention-avatar`,
          id: uid,
          firstname: m.firstname,
          lastname: m.lastname,
          auto_color: 1,
          live_status: 0,
        }),
        Skeletons.Note({ className: `${pfx}__mention-name`, content: name }),
      ],
    });
  });
}

// "Drop to attach" overlay, shown while data-file-drag="1" is set on the root.
function dropOverlay(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__drop-overlay`,
    bubble: 0,
    kids: [
      Skeletons.Image.Svg({
        ico: "desktop_upload",
        className: `${pfx}__drop-overlay-ico`,
      }),
      Skeletons.Note({
        className: `${pfx}__drop-overlay-text`,
        content: LOCALE.DROP_FILES_TO_ATTACH,
      }),
    ],
  });
}

// Preview leaf: an image thumbnail when we have a URL, else a type-icon.
function pendingPreview(ui, f) {
  const pfx = ui.fig.family;
  if (f.previewUrl) {
    return Skeletons.Element({
      tagName: "img",
      className: `${pfx}__file-pending-thumb`,
      attrOpt: { src: f.previewUrl },
    });
  }
  return Skeletons.Image.Svg({
    ico: f.iconChartId || "attachment",
    className: `${pfx}__file-pending-ico`,
  });
}

// Shared attachment card for committed and pending files. Opens on click when
// the file has a nid; opt.committed switches the ✕ between unlink and remove.
function fileCard(ui, f, opt = {}) {
  const pfx = ui.fig.family;
  const nid = f.file_nid || f.nid;
  const openable = !!nid;
  const filename = `${f.filename || ""}${f.extension ? "." + f.extension : ""}`;

  let preview;
  if (f.previewUrl) {
    preview = Skeletons.Element({
      tagName: "img",
      className: `${pfx}__attachment-thumb`,
      attrOpt: { src: f.previewUrl, loading: "lazy" },
    });
  } else {
    let ico = f.iconChartId;
    if (!ico) {
      try {
        ico = require("media/template/map")(
          String(f.extension || "").toLowerCase(),
        );
      } catch (_) {}
    }
    preview = Skeletons.Image.Svg({
      ico: ico || "attachment",
      className: `${pfx}__attachment-ico`,
    });
  }

  const removeBtn = opt.committed
    ? Skeletons.Button.Svg({
        className: `${pfx}__attachment-unlink`,
        ico: "cross",
        bubble: 0,
        service: "unlink-attachment",
        uiHandler: [ui],
        taskId: opt.taskId,
        fileNid: f.file_nid,
      })
    : Skeletons.Button.Svg({
        className: `${pfx}__attachment-unlink`,
        ico: "cross",
        bubble: 0,
        service: "remove-pending-file",
        uiHandler: [ui],
        fileNid: f.nid,
        localKey: f.localKey,
      });

  return Skeletons.Box.Y({
    className: `${pfx}__attachment-row has-preview`,
    service: openable ? "open-attachment" : null,
    uiHandler: openable ? [ui] : null,
    fileNid: nid,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__attachment-thumb-box`,
        kids: [preview],
      }),
      Skeletons.Note({
        className: `${pfx}__attachment-name`,
        content: filename,
      }),
      removeBtn,
    ],
  });
}

function pendingRowDescriptor(ui, f) {
  return fileCard(ui, f, { committed: false });
}

function buildPendingListContent(ui, pendingFiles) {
  return (pendingFiles || []).map((f) => pendingRowDescriptor(ui, f));
}

// Committed attachment on a task — same card as pending files.
function attachmentRowDescriptor(ui, f, taskId) {
  return fileCard(ui, f, { committed: true, taskId });
}

// Whole days a start..end span covers, inclusive (same day = 1); 0 if either
// endpoint is missing/invalid.
function dueDurationDays(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.round((e - s) / 86400000) + 1;
}

// "N day(s)" readout for a range; "" when the range is incomplete.
function dueSummaryText(startIso, endIso) {
  if (!startIso || !endIso) return "";
  const n = dueDurationDays(startIso, endIso);
  return `${n} ${n === 1 ? LOCALE.DURATION_DAY : LOCALE.DURATION_DAYS}`;
}

// Kids for a Due-date section (shared by the detail panel and the create
// modal — pass scope "detail" | "create"): the label row ("Due date" +
// "Duration" toggle), the picker, and (range mode) a live duration readout.
// Duration OFF → one date picker (due_date). ON → one range picker showing
// "start → end" in a single field (per Figma), storing ISO (Y-m-d) while
// displaying d/m/Y via altInput. New-user guidance: the range calendar shows a
// step hint ("Select start date" → "Select end date"), and a live "N days"
// readout beside the Duration label confirms the span. Kept standalone so the
// Duration toggle can re-feed just this sub-part in place.
function buildDueSectionContent(ui, scope = "detail") {
  const pfx = ui.fig.family;
  const isCreate = scope === "create";
  const draft = (isCreate ? ui.getCreateDraft() : ui.getDetailDraft()) || {};
  // New tasks can't be due in the past; existing tasks may keep any date.
  const minDate = isCreate ? "today" : undefined;

  // Tag the calendar for theming; when `withHint`, also inject a step hint that
  // guides the two-click range pick. The hint updates via a pushed onChange
  // hook (pushed, not assigned, so the widget's own publish still fires).
  const onReady = (withHint) => (_d, _s, instance) => {
    const cc = instance && instance.calendarContainer;
    if (!cc) return;
    cc.classList.add("tasks-panel__flatpickr");
    if (!withHint) return;
    let hint = cc.querySelector(".tasks-panel__dp-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "tasks-panel__dp-hint";
      cc.prepend(hint);
    }
    const sync = () => {
      const n = instance.selectedDates.length;
      hint.textContent =
        n === 1
          ? LOCALE.SELECT_END_DATE
          : n === 0
            ? LOCALE.SELECT_START_DATE
            : "";
    };
    sync();
    if (Array.isArray(instance.config.onChange)) {
      instance.config.onChange.push(sync);
    }
  };

  const picker = draft.duration_on
    ? {
        kind: "date_picker",
        className: `${pfx}__due-input ${pfx}__due-input--range`,
        innerClass: `${pfx}__due-input-inner`,
        name: "due_range",
        ranges: true,
        // Seed [start, end]; a lone due_date opens the range at that day.
        value: [draft.start_date, draft.due_date].filter(Boolean),
        service: "task-input-changed",
        uiHandler: [ui],
        vendorOpt: {
          dateFormat: "Y-m-d",
          altInput: true,
          altFormat: "d/m/Y",
          rangeSeparator: "  →  ",
          minDate,
          appendTo: document.body,
          onReady: onReady(true),
        },
      }
    : {
        kind: "date_picker",
        className: `${pfx}__due-input`,
        innerClass: `${pfx}__due-input-inner`,
        name: "due_date",
        value: draft.due_date || "",
        service: "task-input-changed",
        uiHandler: [ui],
        // appendTo: body escapes the panel's overflow clip; onReady tags the
        // calendar so it can be themed without bleeding into other pickers.
        vendorOpt: {
          dateFormat: "Y-m-d",
          altInput: true,
          altFormat: "d/m/Y",
          minDate,
          appendTo: document.body,
          onReady: onReady(false),
        },
      };

  return [
    Skeletons.Box.X({
      className: `${pfx}__due-head`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__${scope}-label`,
          content: LOCALE.DUE_DATE,
        }),
        Skeletons.Box.X({
          className: `${pfx}__due-duration`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__due-duration-label`,
              content: LOCALE.DURATION,
            }),
            // Live duration readout sits beside the label (range mode only);
            // the controller refreshes it on each pick.
            ...(draft.duration_on
              ? [
                  Skeletons.Note({
                    className: `${pfx}__due-summary`,
                    content: dueSummaryText(draft.start_date, draft.due_date),
                  }),
                ]
              : []),
            Skeletons.Box.X({
              className: `${pfx}__toggle`,
              attrOpt: { "data-on": draft.duration_on ? "1" : "0" },
              bubble: 0,
              service: "toggle-duration",
              uiHandler: [ui],
              kids: [Skeletons.Box.X({ className: `${pfx}__toggle-knob` })],
            }),
          ],
        }),
      ],
    }),
    picker,
  ];
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
  return attachments.map((f) => attachmentRowDescriptor(ui, f, taskId));
}

make.buildFileSearchDropdownContent = buildFileSearchDropdownContent;
make.buildAssigneeButtonContent = buildAssigneeButtonContent;
make.buildMentionItemsContent = buildMentionItemsContent;
make.buildCommentListContent = buildCommentListContent;
make.buildPendingListContent = buildPendingListContent;
make.buildAttachmentRowsContent = buildAttachmentRowsContent;
make.buildDueSectionContent = buildDueSectionContent;
make.dueSummaryText = dueSummaryText;
module.exports = make;
