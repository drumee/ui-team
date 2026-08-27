const { isTaskViewAllowed } = require("libs/billing");

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
// formatDue is aliased: `make` declares its own closure const of that name, and
// the subtask builders below live at module scope where that one isn't visible.
const {
  mayCreateTask,
  subtaskBadge,
  formatDue: formatDueDate,
} = require("./helpers");

const make = function (ui) {
  const pfx = ui.fig.family;
  // Phone flag stamped directly onto the popups / list / gantt roots (see
  // `data-mobile` below). Driven from JS rather than a CSS media/container
  // query because the panel lives in a resizable window — the viewport is
  // never the panel width — and container queries aren't supported in the
  // target runtime. The modal bodies also switch to a column (Box.Y) on
  // mobile so the two-column issue layout stacks structurally.
  const isMobile = Visitor.isMobile();
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

  // Due label for a task: a duration task (start_date set) shows the span
  // "start → due"; a single-date task shows just the due date.
  const formatTaskDue = (task) =>
    task && task.start_date && task.due_date
      ? `${formatDue(task.start_date)} → ${formatDue(task.due_date)}`
      : formatDue(task && task.due_date);

  const isOverdue = (d) => {
    if (!d) return false;
    try {
      return Dayjs(d).isBefore(Dayjs(), "day");
    } catch {
      return false;
    }
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
      content: formatTaskDue(task),
      // Overdue is judged on the end (due_date); range marks the span variant.
      dataset: {
        overdue: isOverdue(task.due_date) ? 1 : 0,
        range: task.start_date ? 1 : 0,
      },
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
    // Ex-members are filtered out — they have no profile left to draw.
    const uids = ui.getKnownAssignees(task);
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
      // Subtask count — rendered only when the task has children, so a board of
      // ordinary tasks looks exactly as it does today.
      subtaskBadge(ui, task, `${pfx}__task-subcount`),
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
    !mayCreateTask(ui) ? "" :
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
          // Bound to a draft so an in-place re-render keeps the typed name
          // (mirrors the board-title input).
          value: ui.getColRenameDraft() != null ? ui.getColRenameDraft() : col.name,
          placeholder: LOCALE.COLUMN_NAME,
          mode: "commit",
          service: "col-rename-submit",
          watch: "col-rename-changed",
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
              content: LOCALE.SAVE,
              bubble: 0,
              service: "col-rename-submit",
              uiHandler: [ui],
              taskColumn: col.key,
            }),
            // A board must keep at least one column — hide delete on the last.
            ui.getColumns().length > 1
              ? Skeletons.Note({
                  className: `${pfx}__col-menu-delete`,
                  content: LOCALE.DELETE,
                  bubble: 0,
                  service: "col-delete",
                  uiHandler: [ui],
                  taskColumn: col.key,
                })
              : null,
          ].filter(Boolean),
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
        // Header + column menu sit OUTSIDE __column-body (the scroller), so the
        // title / count / actions stay pinned while the cards scroll under them.
        Skeletons.Box.X({
          className: `${pfx}__column-header`,
          // Custom columns are drag-reorderable by their header (built-ins
          // stay pinned). data-coldrag marks the drag source for _installDnd.
          attrOpt: col.custom
            ? { draggable: "true", "data-coldrag": col.key }
            : undefined,
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
            // Right-side actions: notification bell (all columns) + the
            // custom-column "⋯" editor popover (custom columns only).
            Skeletons.Box.X({
              className: `${pfx}__col-actions`,
              kids: [
                // Bell toggle — off by default; on = notify me of any task
                // change in this column (Figma 2041-20161).
                Skeletons.Button.Svg({
                  className: `${pfx}__col-bell`,
                  ico: "bell",
                  bubble: 0,
                  service: "col-watch-toggle",
                  uiHandler: [ui],
                  taskColumn: col.key,
                  tooltips: { content: LOCALE.NOTIFY_COLUMN, className: `${pfx}__tip` },
                  attrOpt: {
                    "data-active": ui.isColumnWatched(col.key) ? "1" : "0",
                  },
                }),
                // The "⋮" popover renames and deletes the column
                // (task.column_update / column_delete, both `src: write`),
                // so a view or chat member could open it and type a new name
                // that silently never persisted. Same right as creating a
                // task; hiding the trigger closes the popover too, since it
                // only renders while getColMenuFor() matches.
                col.custom && mayCreateTask(ui)
                  ? Skeletons.Note({
                      className: `${pfx}__col-menu-btn`,
                      content: "⋮",
                      bubble: 0,
                      service: "col-menu",
                      uiHandler: [ui],
                      taskColumn: col.key,
                    })
                  : null,
              ].filter(Boolean),
            }),
          ].filter(Boolean),
        }),
        // Belt: the trigger above is already hidden, but a stale
        // getColMenuFor() (set before a live role change) must not leave the
        // rename popover mounted.
        col.custom && mayCreateTask(ui) && ui.getColMenuFor() === col.key
          ? columnMenu(col)
          : null,
        Skeletons.Box.Y({
          className: `${pfx}__column-body`,
          // single-word lowercase key — `dataset.dropcol` works on the DOM
          // side. (Camel-case keys are silently broken: setAttribute keeps
          // the cased name, HTML lowercases it, and DOMStringMap expects
          // hyphen-aware mapping which a single token can't satisfy.)
          dataset: { dropcol: col.key },
          kids: [
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
      ].filter(Boolean),
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

  // Assignee control — same interaction as the meeting-schedule invitee field:
  // chips + inline search, suggestions fed live by _filterAssignees. It is a
  // combobox, not a search-only field: focusing the input (or clicking the
  // caret) lists every member, and typing filters that same list — so the set
  // stays browsable for people who don't know who they're looking for.
  // `scope` is "create" | "detail".
  const assigneeSearchField = (selectedUids, scope) => {
    const selected = Array.isArray(selectedUids)
      ? selectedUids.map(String)
      : selectedUids
        ? [String(selectedUids)]
        : [];
    // One mapping for both scopes, shared with the panel (_applyAssigneeChange
    // / _filterAssignees resolve the same way) so a new picker only has to name
    // its scope. "-reporter" scopes are single-select — see reporterPicker.
    const service = ui.pickerService(scope);
    return Skeletons.Box.Y({
      className: `${pfx}__assignee-picker`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__assignee-control`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__assignee-chips`,
              sys_pn: `${scope}-assignee-chips`,
              partHandler: ui,
              kids: buildAssigneeChips(ui, selected, service),
            }),
            // Entry (not a bare input) so the framework keeps it typeable.
            Skeletons.Entry({
              className: `${pfx}__assignee-search`,
              name: `assignee-search-${scope}`,
              placeholder: LOCALE.SEARCH_PEOPLE,
              require: "any",
              bubble: 0,
              uiHandler: [ui],
            }),
            // Visible affordance that a full member list is one click away —
            // focusing the input opens the same list.
            Skeletons.Button.Svg({
              className: `${pfx}__assignee-caret`,
              ico: "apps-caret-down",
              bubble: 0,
              service: "toggle-assignee-list",
              uiHandler: [ui],
              assigneeScope: scope,
            }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__assignee-suggestions`,
          sys_pn: `${scope}-assignee-suggestions`,
          partHandler: ui,
          // dataset is dropped at render unless attrOpt is also set.
          attrOpt: { "data-open": "0" },
          bubble: 0,
          kids: [],
        }),
      ],
    });
  };

  // Reporter control — the assignee picker in single-select mode. Same shell
  // (chips row + combobox + suggestions part), so it inherits the delegated
  // focus/blur handling, the caret and the live member filter for free; the
  // differences are that picking REPLACES instead of appending, and the chip
  // has no ✕ because a task always reads as reported by somebody (it falls back
  // to created_by). `scope` is "create-reporter" | "detail-reporter".
  const reporterPicker = (uid, scope) =>
    Skeletons.Box.Y({
      // Same classes as the multi-select picker on purpose: it is the same
      // control, and the single-select difference is behavioural (replace, not
      // append) rather than visual.
      className: `${pfx}__assignee-picker`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__assignee-control`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__assignee-chips`,
              sys_pn: `${scope}-assignee-chips`,
              partHandler: ui,
              kids: buildReporterChip(ui, uid),
            }),
            Skeletons.Entry({
              className: `${pfx}__assignee-search`,
              name: `assignee-search-${scope}`,
              placeholder: LOCALE.SEARCH_PEOPLE,
              require: "any",
              bubble: 0,
              uiHandler: [ui],
            }),
            Skeletons.Button.Svg({
              className: `${pfx}__assignee-caret`,
              ico: "apps-caret-down",
              bubble: 0,
              service: "toggle-assignee-list",
              uiHandler: [ui],
              assigneeScope: scope,
            }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__assignee-suggestions`,
          sys_pn: `${scope}-assignee-suggestions`,
          partHandler: ui,
          // dataset is dropped at render unless attrOpt is also set.
          attrOpt: { "data-open": "0" },
          bubble: 0,
          kids: [],
        }),
      ],
    });

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
    const dStatus = dDraft.status || detail.status || ui.getDefaultStatus();
    const dPriority = dDraft.priority || detail.priority || "medium";
    const dAssignees = Array.isArray(dDraft.assignees)
      ? dDraft.assignees
      : ui.getKnownAssignees(detail);
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
          // Selected fill is driven by `data-theme` + `data-active` in the
          // skin, NOT by data-status: a custom column's key is its DB id, so
          // per-key rules never matched one and the pill stayed blank on click.
          // The dot colour rides in as a custom property (skin reads it from a
          // ::before, which can't take an inline style).
          dataset: {
            active: dStatus === c.key ? 1 : 0,
            status: c.key,
            theme: c.theme || "default",
          },
          styleOpt: { "--pill-dot": c.color || "#AEAEB2" },
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
        assigneeSearchField(dAssignees, "detail"),
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

    // Reporter — who the task is reported by. EDITABLE (single-select), unlike
    // task.created_by underneath it: the draft holds reporter_uid and Update
    // posts it through task.update.
    //
    // The provenance line below keeps created_by + ctime visible, which is why
    // the two are separate fields server-side: created_by is write-once, so
    // "Created by X on <date>" stays true after a reassignment. It only names
    // the creator when they are NOT the current reporter — otherwise the row
    // would just repeat the chip above it.
    const dReporter =
      dDraft.reporter_uid || detail.reporter_uid || detail.created_by || "";
    const creator = ui.getMember(detail.created_by) || {};
    const originParts = [];
    if (detail.created_by && String(detail.created_by) !== String(dReporter)) {
      originParts.push(`${LOCALE.CREATED_BY} ${authorName(creator)}`);
    }
    // Absolute date, not fromNow(): this line is provenance, and "3 weeks ago"
    // decays while a date stays checkable (product ask 2026-07-30).
    if (detail.ctime) {
      originParts.push(
        Dayjs.unix(Number(detail.ctime)).format("MMM D, YYYY HH:mm"),
      );
    }
    const reporterRow = Skeletons.Box.Y({
      className: `${pfx}__detail-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-label`,
          content: LOCALE.REPORTER,
        }),
        reporterPicker(dReporter, "detail-reporter"),
        originParts.length
          ? Skeletons.Note({
              className: `${pfx}__detail-reporter-time`,
              content: originParts.join(" · "),
            })
          : null,
      ].filter(Boolean),
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

    // "Child task items" — the metadata sidebar, under Due date (Figma
    // 58471:222398). A re-feedable part of its own (see
    // buildSubtaskRowsContent) so adding or ticking a child never rebuilds the
    // panel around the user's edits.
    //
    // Omitted entirely when the open task IS a subtask: one level of nesting
    // means it can never have children, and an empty "Subtasks / none yet"
    // block would just be a section that can never fill.
    const subtasksSection = ui.isSubtask(detail)
      ? null
      : Skeletons.Box.Y({
          className: `${pfx}__subtasks`,
          sys_pn: "subtask-rows",
          partHandler: ui,
          kids: buildSubtaskRowsContent(ui, detail.id),
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
        // Region overlay: this block IS the task drop zone now, so the
        // affordance belongs to it rather than to the whole panel.
        dropOverlay(ui),
      ],
    });

    // Comments: flat feed (a re-feedable part) + an @-mention composer.
    // Activity header: title + Comments / History tabs, which flip which of the
    // two independently-fed lists below is visible. Comments is the default.
    const currentTab = ui.getActivityTab ? ui.getActivityTab() : "comments";
    const activityTab = (tab, label, icon) =>
      Skeletons.Box.X({
        className: `${pfx}__activity-tab`,
        // dataset alone is dropped at render — attrOpt carries the initial value.
        attrOpt: { "data-active": tab === currentTab ? "1" : "0", "data-tab": tab },
        bubble: 0,
        service: "activity-tab",
        activityTab: tab,
        uiHandler: [ui],
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
      // Comments and the change log are two independent parts, each fed only
      // with its own rows. The active tab hides one or the other in CSS (see
      // skin) — no content filtering, so switching tabs never rebuilds either
      // list. dataset alone is dropped at render, hence attrOpt.
      attrOpt: { "data-tab": currentTab },
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
                activityTab("comments", LOCALE.COMMENTS, "message"),
                activityTab("history", LOCALE.HISTORY, "apps-clock"),
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
                ...composerTools(ui, "comment"),
                Skeletons.Button.Svg({
                  ico: "app-send",
                  className: `${pfx}__composer-send`,
                  bubble: 0,
                  service: "comment-submit",
                  uiHandler: [ui],
                }),
              ],
            }),
            // The composer is its own drop zone: a file dropped here rides the
            // comment draft and commits on Send, exactly as the paperclip
            // beside it already does.
            commentDropOverlay(ui),
          ],
        }),
        // Files queued on the composer (paperclip or drop), attached to the
        // comment once it is sent. Its own part, so queueing a file never
        // re-feeds the composer and drops the caret mid-sentence.
        pendingStrip(ui, "comment"),
        // Each list sits in its own section so the caption can live OUTSIDE the
        // fed part — a comment or history reload replaces only the rows, never
        // the label. The active tab already names its run, so the captions are
        // kept for structure but never drawn.
        Skeletons.Box.Y({
          className: `${pfx}__activity-section`,
          attrOpt: {
            "data-kind": "comments",
            "data-empty": (ui.getComments() || []).length ? "0" : "1",
          },
          kids: [
            Skeletons.Note({
              className: `${pfx}__section-label`,
              content: LOCALE.COMMENTS,
            }),
            Skeletons.Box.Y({
              className: `${pfx}__comment-list`,
              sys_pn: "comment-list",
              partHandler: ui,
              kids: buildCommentListContent(ui),
            }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__activity-section`,
          attrOpt: {
            "data-kind": "history",
            "data-empty": (ui.getTaskHistory ? ui.getTaskHistory() : []).length
              ? "0"
              : "1",
          },
          kids: [
            Skeletons.Note({
              className: `${pfx}__section-label`,
              content: LOCALE.HISTORY,
            }),
            Skeletons.Box.Y({
              className: `${pfx}__history-list`,
              sys_pn: "history-list",
              partHandler: ui,
              kids: buildHistoryListContent(ui),
            }),
          ],
        }),
      ],
    });

    // Footer: Cancel (closes the panel, discarding edits) beside the primary
    // Update; the header X mirrors Cancel. Sits as the panel's last row, not in
    // the metadata column — there it scrolled away with the fields.
    const actions = Skeletons.Box.X({
      className: `${pfx}__detail-actions`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__detail-cancel`,
          content: LOCALE.CANCEL,
          bubble: 0,
          service: "close-detail",
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

    // A child opens in the SAME panel as its parent — without this the panel
    // gives no sign it is showing a child, and no way back. Names the parent and
    // routes to it; close-detail returns here too (see _openDetail's
    // _detailReturnTo).
    const parentTask = ui.isSubtask(detail)
      ? ui.getTaskById(detail.parent_task_id)
      : null;
    const parentCrumb = parentTask
      ? Skeletons.Box.X({
          className: `${pfx}__detail-parent`,
          bubble: 0,
          service: "open-detail",
          uiHandler: [ui],
          taskId: parentTask.id,
          kids: [
            Skeletons.Image.Svg({
              ico: "caret-left",
              className: `${pfx}__detail-parent-ico`,
            }),
            Skeletons.Note({
              className: `${pfx}__detail-parent-title`,
              content: parentTask.title || "",
            }),
          ],
        })
      : null;

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
          // JS-stamped phone flag — see `isMobile` at the top of make().
          attrOpt: { "data-mobile": isMobile ? "1" : "0" },
          bubble: 0,
          kids: [
            parentCrumb,
            header,
            // Column on mobile (Box.Y) so the main content + metadata side
            // stack instead of squeezing into two narrow columns.
            Skeletons.Box[isMobile ? "Y" : "X"]({
              className: `${pfx}__modal-body`,
              kids: [
                Skeletons.Box.Y({
                  className: `${pfx}__modal-main`,
                  // Description, then Attachments beneath it, then the Activity
                  // feed — a single stacked column (Attachments no longer sits
                  // to the right of the Description).
                  kids: [descriptionRow, attachmentsList, commentsSection],
                }),
                Skeletons.Box.Y({
                  className: `${pfx}__modal-side`,
                  kids: [
                    statusRow,
                    priorityRow,
                    assigneeRow,
                    reporterRow,
                    dueRow,
                    // Figma 58471:222398 puts "Child task items" here, in the
                    // metadata column directly under Due date.
                    subtasksSection,
                  ].filter(Boolean),
                }),
              ],
            }),
            actions,
            // Floating full emoji picker for the comment "…" more button, fed
            // on demand (assets/emojis) and positioned below the react bar —
            // modeled on the meeting reactions picker. Anchored to the
            // position:relative detail-panel.
            Skeletons.Wrapper.Y({
              className: `${pfx}__reactions-picker`,
              name: "reactions",
            }),
            // filter: parentCrumb is null on a top-level task.
          ].filter(Boolean),
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
                  // Bound to state so a colour pick (in-place update) or any
                  // re-render restores the typed name instead of clearing it.
                  value: st.title || "",
                  placeholder: LOCALE.BOARD_TITLE,
                  mode: "commit",
                  service: "board-submit",
                  watch: "board-title-changed",
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
                      // `theme` renders as data-theme so the active swatch can
                      // be re-flagged in place (no full re-render → no glitch,
                      // and the typed board title survives a colour change).
                      dataset: { active: st.theme === t ? 1 : 0, theme: t },
                      bubble: 0,
                      service: "board-theme",
                      uiHandler: [ui],
                      colTheme: t,
                      kids: [
                        Skeletons.Note({
                          className: `${pfx}__board-color-dot`,
                          // Filled solid swatch so the colour choice is obvious
                          // (a hollow ring reads as "no colour applied").
                          styleOpt: {
                            background: themes[t],
                            borderColor: themes[t],
                          },
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
    const selectedStatus = draft?.status || ui.getDefaultStatus();
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
          // `data-theme` + `data-active` drive pill colors via the skin (see
          // the detail switcher for why it can't be data-status) and let the JS
          // update them in place without a re-render.
          dataset: {
            active: selectedStatus === c.key ? 1 : 0,
            status: c.key,
            theme: c.theme || "default",
          },
          styleOpt: { "--pill-dot": c.color || "#AEAEB2" },
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

    // Labeled field shell. extraCn lets a field opt into grow/scroll behaviour;
    // `zone` adds the region drop overlay for a field that is a drop zone.
    const field = (labelText, control, extraCn = "", zone = false) =>
      Skeletons.Box.Y({
        className: `${pfx}__create-field${extraCn ? " " + extraCn : ""}`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__create-label`,
            content: labelText,
          }),
          control,
          zone ? dropOverlay(ui) : null,
        ].filter(Boolean),
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
        assigneeSearchField(selectedAssignees, "create"),
      ],
    });

    // Reporter — defaults to the current user, but pickable before submit (the
    // uid is sent as reporter_uid; created_by is always the real creator).
    const reporterField = Skeletons.Box.Y({
      className: `${pfx}__create-field`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__create-label`,
          content: LOCALE.REPORTER,
        }),
        reporterPicker(draft?.reporter_uid || Visitor.id, "create-reporter"),
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
        // left, the metadata sidebar on the right. On mobile it renders as a
        // column (Box.Y) so main + side stack — structural, no CSS needed.
        Skeletons.Box[isMobile ? "Y" : "X"]({
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
                // Pinned to the column foot (see skin __create-files) so the
                // search/upload bar lines up with the actions in the right column.
                field(
                  LOCALE.LINKED_FILES,
                  filePickerBlock("create", {
                    pendingFiles: draft?.pending_files || [],
                  }),
                  `${pfx}__create-files`,
                  true, // this field is the create modal's drop zone
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
                reporterField,
                // Due-date section: same Duration UI as the detail panel. A
                // stable sub-part so the toggle re-feeds only this block.
                Skeletons.Box.Y({
                  className: `${pfx}__create-field`,
                  sys_pn: "create-due-section",
                  partHandler: ui,
                  kids: buildDueSectionContent(ui, "create"),
                }),
                // Pinned to the column foot (see skin __create-actions) so it
                // lines up with the file search/upload bar in the left column.
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
          // JS-stamped phone flag — see `isMobile` at the top of make().
          attrOpt: { "data-mobile": isMobile ? "1" : "0" },
          bubble: 0,
          kids: [form],
        }),
      ],
    });
  };

  // ── Filter dropdown (shared by every view) ────────────────────
  // The trigger button lives on the host window's tab bar (same line as
  // Files / Chat / Tasks); this panel owns the members + filter state and
  // renders the dropdown as a top-right overlay when opened via toggleFilter().
  const filterUids = (ui.getFilterUids() || []).map(String);
  const filterActive = filterUids.length > 0;
  const filterOpen = pickerOpen === "filter";

  // Right-side checkbox (Figma 2045-134011): filled brand box + white check
  // when the row is active, hollow grey outline when not. Driven purely by the
  // row's data-active, so no per-checkbox state is needed.
  const filterCheck = () =>
    Skeletons.Box.X({
      className: `${pfx}__filter-check`,
      kids: [
        // Text tick (not a sprite icon) so it's crisp, centred, and recolourable.
        Skeletons.Note({ className: `${pfx}__filter-check-mark`, content: "✓" }),
      ],
    });

  // ── Multi-dimension filter (Figma 2099-50501) ─────────────────
  // Accordion of filter categories; tapping a row expands its value picker
  // inline. Categories AND together, values within a category OR together.
  // Every dimension applies on every view (board / calendar / gantt / list /
  // project health) — Assignee reuses the shared member filter.
  const filters = ui.getFilters();
  const filterCats = [
    { dim: "keyword", ico: "tags", label: LOCALE.TASK },
    { dim: "priority", ico: "apps-warning", label: LOCALE.PRIORITY },
    { dim: "status", ico: "checked-circle", label: LOCALE.STATUS },
    { dim: "due", ico: "calendar", label: LOCALE.DUE_DATE },
    { dim: "files", ico: "app-attachment", label: LOCALE.LINKED_FILES },
    { dim: "assignee", ico: "two-users", label: LOCALE.ASSIGNEE },
  ];

  // A value row inside a category body: left content + a check box. Toggles a
  // value via filter-set (assignee rows use filter-member instead).
  const filterValueRow = (opt) =>
    Skeletons.Box.X({
      className: `${pfx}__member-row ${pfx}__filter-row`,
      dataset: { active: opt.active ? 1 : 0 },
      attrOpt: { "data-active": opt.active ? "1" : "0" },
      bubble: 0,
      service: opt.service || "filter-set",
      uiHandler: [ui],
      filterDim: opt.dim,
      filterVal: opt.val,
      memberUid: opt.memberUid,
      kids: [
        Skeletons.Box.X({ className: `${pfx}__filter-row-main`, kids: opt.leftKids }),
        filterCheck(),
      ],
    });

  const dot = (color) =>
    Skeletons.Note({ className: `${pfx}__filter-dot`, styleOpt: { background: color } });
  const nameNote = (content) =>
    Skeletons.Note({ className: `${pfx}__member-name`, content });

  const catBody = (dim) => {
    switch (dim) {
      case "keyword":
        return [
          Skeletons.Entry({
            className: `${pfx}__filter-search`,
            name: "filter_keyword",
            value: filters.keyword || "",
            placeholder: LOCALE.SEARCH_TASK,
            watch: "filter-keyword",
            uiHandler: [ui],
          }),
        ];
      case "priority":
        return (ui.getPriorities() || []).map((p) =>
          filterValueRow({
            dim: "priority",
            val: p.key,
            active: (filters.priority || []).includes(p.key),
            leftKids: [dot(p.color), nameNote(LOCALE[p.label] || p.key)],
          }),
        );
      case "status":
        return (ui.getColumns() || []).map((c) =>
          filterValueRow({
            dim: "status",
            val: c.key,
            active: (filters.status || []).includes(c.key),
            leftKids: [dot(c.color), nameNote(c.name || LOCALE[c.label] || c.key)],
          }),
        );
      case "due":
        return [
          ["overdue", LOCALE.OVERDUE],
          ["today", LOCALE.TODAY],
          ["week", LOCALE.THIS_WEEK],
          ["month", LOCALE.THIS_MONTH],
          ["none", LOCALE.NO_DATE],
        ].map(([val, label]) =>
          filterValueRow({
            dim: "due",
            val,
            active: filters.due === val,
            leftKids: [nameNote(label)],
          }),
        );
      case "files":
        return [
          ["has", LOCALE.WITH_FILES],
          ["none", LOCALE.WITHOUT_FILES],
        ].map(([val, label]) =>
          filterValueRow({
            dim: "files",
            val,
            active: filters.files === val,
            leftKids: [nameNote(label)],
          }),
        );
      case "assignee":
        return [
          filterValueRow({
            service: "filter-member",
            memberUid: "",
            active: !filterActive,
            leftKids: [nameNote(LOCALE.ALL_MEMBERS)],
          }),
          ...members.map((m) => {
            const uid = String(m.id || m.uid);
            return filterValueRow({
              service: "filter-member",
              memberUid: uid,
              active: filterUids.includes(uid),
              leftKids: [
                Skeletons.UserProfile({
                  className: `${pfx}__member-avatar`,
                  id: uid,
                  firstname: m.firstname,
                  lastname: m.lastname,
                  auto_color: 1,
                  live_status: 0,
                }),
                nameNote(fullName(m)),
              ],
            });
          }),
        ];
      default:
        return [];
    }
  };

  const filterCategory = (c) =>
    Skeletons.Box.Y({
      className: `${pfx}__filter-cat`,
      dataset: { dim: c.dim, open: ui.isFilterCatOpen(c.dim) ? 1 : 0 },
      attrOpt: {
        "data-dim": c.dim,
        "data-open": ui.isFilterCatOpen(c.dim) ? "1" : "0",
      },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__filter-cat-head`,
          bubble: 0,
          service: "filter-cat",
          uiHandler: [ui],
          filterDim: c.dim,
          attrOpt: { "data-active": ui.isFilterDimActive(c.dim) ? "1" : "0" },
          kids: [
            Skeletons.Image.Svg({ ico: c.ico, className: `${pfx}__filter-cat-ico` }),
            Skeletons.Note({ className: `${pfx}__filter-cat-label`, content: c.label }),
            // No checkbox on the parent row — a category isn't itself selectable;
            // only its value rows are. The head keeps data-active for styling.
            Skeletons.Note({ className: `${pfx}__filter-cat-chev`, content: "›" }),
          ],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__filter-cat-body`,
          kids: catBody(c.dim),
        }),
      ],
    });

  const filterDropdown = Skeletons.Box.Y({
    className: `${pfx}__filter-picker ${pfx}__filter-picker--list`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__filter-head`,
        kids: [
          Skeletons.Note({ className: `${pfx}__filter-title`, content: LOCALE.FILTER }),
          // Always mounted, shown/hidden by `data-active` (skin) rather than by
          // presence: _syncFilterAffordances flips the flag in place, so typing
          // a keyword reveals "Clear" without re-rendering the popup.
          Skeletons.Note({
            className: `${pfx}__filter-clear`,
            content: LOCALE.CLEAR,
            attrOpt: { "data-active": ui.isFilterActive() ? "1" : "0" },
            bubble: 0,
            service: "filter-clear",
            uiHandler: [ui],
          }),
        ].filter(Boolean),
      }),
      ...filterCats.map(filterCategory),
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

  // Tuple list kept as its own const so the carousel footer below can count
  // pages from it — the dots must agree with the strip about how many tabs
  // there are, and deriving both from one array is what keeps them in step.
  const viewDefs = [
    ["board", LOCALE.TASK_VIEW_BOARD, "square-split-horizontal"],
    ["calendar", LOCALE.TASK_VIEW_CALENDAR, "calendar"],
    ["gantt", LOCALE.TASK_VIEW_GANTT, "app-task-grant"],
    ["list", LOCALE.TASK_VIEW_LIST, "app-task-list"],
    ["summary", LOCALE.TASK_VIEW_SUMMARY, "app-task-project-health"],
  ];

  // The strip is the scroller for the compact carousel (the skin's
  // `@container tasks-panel-w` block pages it two tabs at a time), so it has to
  // be reachable from JS — the scroll listener that tracks the current page
  // lives in tasks/index.js onPartReady("viewbar-tabs").
  const viewTabs = Skeletons.Box.X({
    className: `${pfx}__viewbar-tabs`,
    sys_pn: "viewbar-tabs",
    partHandler: ui,
    kids: viewDefs.map(([key, label, ico]) => {
      // Tier gate (libs/billing.isTaskViewAllowed). A locked tab keeps its
      // place AND keeps its click: the click is what opens the upsell, so
      // hiding the tab would make the plan limit invisible and disabling it
      // would read as a broken button. Same reasoning as the sidebar's Admin
      // Console entry, which stays visible to personal plans for exactly this.
      //
      // Returns false for every view until the `task_views` entitlement is
      // deployed — see taskViewsAllowed(), unknown means unrestricted.
      const locked = !isTaskViewAllowed(key);
      return Skeletons.Box.X({
        className: `${pfx}__viewbar-item`,
        attrOpt: {
          "data-active": view === key ? "1" : "0",
          "data-locked": locked ? "1" : "0",
        },
        bubble: 0,
        service: "set-view",
        uiHandler: [ui],
        viewMode: key,
        tooltips: locked
          ? { content: LOCALE.TASK_VIEW_LOCKED, className: `${pfx}__viewbar-item-tip` }
          : undefined,
        kids: [
          // SVG glyph. `__viewbar-item-ico` is pointer-events:none in the skin,
          // so a click on the icon still bubbles to this tab's set-view service.
          Skeletons.Button.Svg({
            className: `${pfx}__viewbar-item-ico`,
            ico,
          }),
          Skeletons.Note({
            className: `${pfx}__viewbar-item-label`,
            content: label,
          }),
          locked
            ? Skeletons.Image.Svg({
                className: `${pfx}__viewbar-item-lock`,
                ico: "apps-lock-simple",
              })
            : null,
        ].filter(Boolean),
      });
    }),
  });

  // Right-side controls (Figma 2040-53814): calendar/gantt granularity when
  // those views are active, then the create buttons, then the shared Filter.
  const newTaskBtn = !mayCreateTask(ui) ? "" : Skeletons.Note({
    className: `${pfx}__viewbar-new`,
    content: `+ ${LOCALE.NEW_TASK}`,
    bubble: 0,
    service: "add-task",
    uiHandler: [ui],
  });
  const newBoardBtn = !mayCreateTask(ui) ? "" : Skeletons.Box.X({
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
    // Highlight when ANY filter is active on the current view (member filter
    // everywhere; the richer dimensions additionally count on the List view).
    dataset: { active: ui.isFilterActive() ? 1 : 0 },
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

  // Carousel footer: one dot per page of two tabs, so a phone user can see the
  // strip continues past the two visible tabs. Built HERE rather than at
  // runtime because the tab count is settled — viewDefs is a fixed list, and
  // every view tab stays rendered even when the plan gates it (a locked tab
  // keeps its place; the click is what opens the upsell).
  //
  // `page` is the only state this footer has: the scroll listener writes it and
  // the skin maps it to the active dot, so nothing per-dot is ever touched as
  // the strip moves. One page means nothing to page through — data-visible=0
  // hides the footer, the same convention the folder tab bar uses.
  const viewPages = Math.ceil(viewDefs.length / 2);
  const viewDots = Skeletons.Box.X({
    className: `${pfx}__viewbar-dots`,
    sys_pn: "viewbar-dots",
    partHandler: ui,
    dataset: { page: 0, visible: viewPages > 1 ? 1 : 0 },
    kids: Array.from({ length: viewPages }, (_, i) =>
      Skeletons.Box.X({
        className: `${pfx}__viewbar-dot`,
        dataset: { page: i },
        bubble: 0,
        service: "viewbar-page",
        uiHandler: [ui],
      }),
    ),
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
      viewDots,
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__root`,
    kids: [
      subHeader,
      // The view body sits in a NAMED host so a filter keystroke can re-feed
      // just this subtree (_refreshViewBody) instead of the whole panel. A full
      // _render() rebuilds the focused filter input, and ui-core seeds <input>
      // values through a 200ms waitElement poll — so the field blanks out
      // mid-typing and then overwrites whatever was typed in that window with
      // the value the skeleton was built with. Never full-render on a keystroke.
      Skeletons.Box.Y({
        className: `${pfx}__view-host`,
        sys_pn: "view-host",
        kids: [viewContent],
      }),
      // Click-catcher behind the filter dropdown: a click outside it closes
      // the popup (sits below the dropdown's z-index). Fires toggle-filter.
      filterOpen
        ? Skeletons.Box.Z({
            className: `${pfx}__filter-backdrop`,
            bubble: 0,
            service: "toggle-filter",
            uiHandler: [ui],
          })
        : null,
      // Filter overlay (anchored top-right, below the tab bar's filter button).
      // Every view gets the same multi-dimension accordion.
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

// Never falls back to the uid: an unresolved member has no name, and a bare
// 16-char id rendered in a name slot reads as a corrupted name rather than as
// the "no longer here" it actually means.
const memberLabel = (m) =>
  m.fullname ||
  [m.firstname, m.lastname].filter(Boolean).join(" ").trim() ||
  m.email ||
  "";

/**
 * The reporter as a single, non-removable chip. Exported so the panel can
 * re-feed just the chips row after a pick.
 *
 * Deliberately NOT buildAssigneeChips: that one runs the uids through
 * getKnownAssignees, which drops anybody who has left the workspace. That is
 * right for an assignment (nobody is working on it any more) but wrong here —
 * who reported a task is a historical fact, and dropping the uid would make the
 * field read as empty and silently reassign the reporter on the next Update.
 * authorName() labels a departed member instead of vanishing.
 *
 * Returns [] only when there is genuinely no uid, which the SPs make impossible
 * for a live task (reporter_uid falls back to created_by).
 */
function buildReporterChip(ui, uid) {
  const pfx = ui.fig.family;
  if (!uid) return [];
  // Visitor fallback: the member list loads asynchronously, and until it lands
  // getMember answers null for everybody — including the current user, who is
  // the default reporter on every create. Without this the field would open
  // reading "Former member" about the person filling it in.
  const m =
    ui.getMember(uid) ||
    (String(uid) === String(Visitor.id)
      ? {
          firstname: Visitor.get("firstname"),
          lastname: Visitor.get("lastname"),
        }
      : {});
  return [
    Skeletons.Box.X({
      className: `${pfx}__assignee-chip`,
      attrOpt: { "data-uid": uid },
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
          content: authorName(m),
        }),
      ],
    }),
  ];
}

// Selected assignees as removable chips. Exported so the panel can re-feed
// just the chips row after a pick/removal.
function buildAssigneeChips(ui, assignees, service) {
  const pfx = ui.fig.family;
  // Accept an array of uids (multi-assignee); tolerate a single uid/null.
  // An ex-member gets no chip at all — there is nothing left to label it with.
  const uids = ui.getKnownAssignees(
    Array.isArray(assignees) ? assignees : assignees ? [assignees] : [],
  );
  return uids.map((uid) => {
    const m = ui.getMember(uid) || {};
    return Skeletons.Box.X({
      className: `${pfx}__assignee-chip`,
      attrOpt: { "data-uid": uid },
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
          content: memberLabel(m),
        }),
        // ✕ toggles this member back out of the set.
        Skeletons.Button.Svg({
          className: `${pfx}__assignee-chip-remove`,
          ico: "cross",
          bubble: 0,
          service,
          uiHandler: [ui],
          memberUid: uid,
        }),
      ],
    });
  });
}

// Members matching `query`, minus the already-selected ones. An empty query
// lists every remaining member (the dropdown half of the combobox) — the
// container scrolls, so no result cap is needed.
function buildAssigneeSuggestions(ui, query, selected, service) {
  const pfx = ui.fig.family;
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const chosen = new Set((selected || []).map(String));
  return (ui.getMembers() || [])
    .filter((m) => {
      const uid = String(m.id || m.uid || "");
      if (!uid || chosen.has(uid)) return false;
      if (!q) return true;
      return (
        memberLabel(m).toLowerCase().includes(q) ||
        String(m.email || "")
          .toLowerCase()
          .includes(q)
      );
    })
    .map((m) => {
      const uid = String(m.id || m.uid);
      return Skeletons.Box.X({
        className: `${pfx}__assignee-option`,
        attrOpt: { "data-uid": uid },
        bubble: 0,
        service,
        uiHandler: [ui],
        memberUid: uid,
        kids: [
          Skeletons.UserProfile({
            className: `${pfx}__assignee-option-avatar`,
            id: uid,
            firstname: m.firstname,
            lastname: m.lastname,
            auto_color: 1,
            live_status: 0,
          }),
          Skeletons.Note({
            className: `${pfx}__assignee-option-name`,
            content: memberLabel(m),
          }),
        ],
      });
    });
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

// Attachment (paperclip) + @-mention buttons shared by the main comment
// composer and the inline edit / reply composers. "@" focuses the scope's
// editor, inserts an "@" and opens the mention popup.
//
// The paperclip carries its scope so the picked file lands on the SAME draft a
// dropped file would: inside a comment row it attaches to that comment, and
// only the task-level composer attaches to the task. Without it every paperclip
// fell through to "detail" — a file picked while editing a comment was queued
// on the task's own attachment strip, far up the panel, and committed by Update
// instead of Save.
function composerTools(ui, scope) {
  const pfx = ui.fig.family;
  return [
    Skeletons.Button.Svg({
      ico: "app-attachment",
      className: `${pfx}__composer-ico`,
      bubble: 0,
      service: "pick-attachment",
      uiHandler: [ui],
      searchScope: scope,
    }),
    Skeletons.Note({
      className: `${pfx}__composer-at`,
      content: "@",
      bubble: 0,
      service: "comment-mention-insert",
      mentionScope: scope,
      uiHandler: [ui],
    }),
  ];
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
      linkPrompt(ui, scope),
    ],
  });
}

// Ctrl+K target: an empty caret-anchored shell, filled and positioned by the
// panel (_openLinkPrompt) exactly like the mention dropdown above it.
function linkPrompt(ui, scope) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__link-prompt`,
    sys_pn: `${scope}-link`,
    partHandler: ui,
    // dataset is dropped at render unless attrOpt is also set — use attrOpt.
    attrOpt: { "data-open": "0" },
    bubble: 0,
    kids: [],
  });
}

// Body of the link prompt. The panel wires the input and the buttons natively
// (data-act), so no service round-trip while the caret is parked in the
// editor. "Remove" only appears when the caret sits in an existing link.
function buildLinkPromptContent(ui, opt = {}) {
  const pfx = ui.fig.family;
  const btn = (act, label, mod) =>
    Skeletons.Note({
      className: `${pfx}__link-prompt-btn${mod ? ` ${pfx}__link-prompt-btn--${mod}` : ""}`,
      content: label,
      attrOpt: { "data-act": act },
      bubble: 0,
    });
  return [
    // A bare <input>, not Skeletons.Entry: the panel wires this element the
    // instant feed() returns, and Entry builds its input in its own render
    // pass — plus its Enter/commit handling would race the prompt's own.
    Skeletons.Element({
      tagName: "input",
      className: `${pfx}__link-prompt-input`,
      flow: "none",
      attrOpt: {
        type: "url",
        spellcheck: "false",
        placeholder: LOCALE.TASK_LINK_PLACEHOLDER,
        value: opt.url || "",
      },
    }),
    Skeletons.Box.X({
      className: `${pfx}__link-prompt-actions`,
      kids: [
        opt.url ? btn("remove", LOCALE.REMOVE) : null,
        btn("cancel", LOCALE.CANCEL),
        btn("apply", LOCALE.APPLY, "primary"),
      ].filter(Boolean),
    }),
  ];
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
// Emoji owned by the one-tap "like" button (and its chip). Once a 👍 chip
// exists (which toggles it) the standalone button is hidden. It is also
// excluded from the add-reaction picker below, so picking a reaction is purely
// additive and never toggles an existing like off.
const LIKE_EMOJI = "👍";
// Six quick reactions shown when the ☺ toggle opens the react bar (no 👍 — that
// is the like button's job). The "…" button opens the full assets/emojis picker.
const QUICK_REACTIONS = ["❤️", "😂", "🎉", "😮", "😢", "🔥"].filter(
  (e) => e !== LIKE_EMOJI,
);

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

// Never falls back to the uid: a member the workspace can no longer resolve
// has no name, and a bare 16-char id in a name slot reads as a corrupted name.
const fullName = (m) => {
  if (!m) return "";
  const first = m.firstname || "";
  const last = m.lastname || "";
  return (first + " " + last).trim() || m.email || "";
};

// Name for a slot that must stay attributed even when the person has left:
// task reporter, comment author, history actor. Their rows are history and
// can't be blanked, so an unresolvable uid is labelled for what it is. Module
// scope because the comment list and the change log are built by separate
// functions now, and both attribute rows.
const authorName = (m) => fullName(m) || LOCALE.FORMER_MEMBER;

// Drop affordance for one comment surface (composer / row / reply composer).
// Same copy and treatment as __drop-overlay, sized to the region it covers;
// lit by data-drop-active on its OWN zone element, which _setDragAffordance
// keeps to exactly one element at a time.
function commentDropOverlay(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__comment-drop-overlay`,
    bubble: 0,
    kids: [
      Skeletons.Note({
        className: `${pfx}__comment-drop-overlay-text`,
        content: LOCALE.DROP_FILES_TO_ATTACH,
      }),
    ],
  });
}

// Queued-but-not-yet-attached files for a comment being edited or answered.
// Its own part (file-pending-list-comment-edit / -comment-reply) so a drop can
// be shown without re-feeding the comment list, which would tear down the
// editor and the caret with it.
function pendingStrip(ui, scope) {
  const pfx = ui.fig.family;
  const draft =
    scope === "comment-reply" ? ui.getReplyDraft() : ui.getCommentDraft();
  const pending = (draft && draft.pending_files) || [];
  return Skeletons.Box.X({
    className: `${pfx}__comment-pending-list`,
    sys_pn: `file-pending-list-${scope}`,
    partHandler: ui,
    // data-scope is what _setPendingStatus addresses; it must be here as well
    // as on the fed part, or a strip built by a full render would be invisible
    // to the surgical status writes.
    attrOpt: { "data-empty": pending.length ? "0" : "1", "data-scope": scope },
    kids: buildPendingListContent(ui, pending),
  });
}

// Icon per file type for a comment's attachment card. media/template/map only
// knows office/code types and returns the RAW EXTENSION for anything else
// ("png" → "png"), which is not a sprite id — so the common media types drew a
// missing icon. These four are named explicitly; everything else still goes
// through the shared map, now with a real fallback id instead of a made-up one.
const ATTACHMENT_ICONS = {
  txt: "app-txt-file",
  png: "bg-image",
  jpg: "bg-image",
  jpeg: "bg-image",
  mp4: "app-video-file",
  mp3: "app-audio-file",
  // Office types use the RAW sprite (raw-*), which keeps each icon's own
  // colours — Word blue, Excel green, PowerPoint orange — rather than the
  // normalized single-colour glyphs used above. Both sprites are loaded
  // (src/sprite.js), and the same names come out of media/template/map, so a
  // comment's attachment matches the file icon shown everywhere else.
  // Legacy extensions map to the same icon as their x-suffixed twin.
  doc: "raw-documents_word",
  docx: "raw-documents_word",
  xls: "raw-documents_excel",
  xlsx: "raw-documents_excel",
  ppt: "raw-documents_powerpoint",
  pptx: "raw-documents_powerpoint",
};

function attachmentIcon(f) {
  if (f && f.iconChartId) return f.iconChartId;
  const ext = String((f && f.extension) || "").toLowerCase();
  if (ATTACHMENT_ICONS[ext]) return ATTACHMENT_ICONS[ext];
  let mapped;
  try {
    mapped = require("media/template/map")(ext, "app-file");
  } catch (_) {
    /* alias unavailable (tests) — fall through to the generic icon */
  }
  return mapped || "app-file";
}

// Files already attached to a saved comment (task_comment_file, delivered by
// task_comment_list). The ✕ detaches the file; the media node stays put.
function commentAttachments(ui, c, isOwn) {
  const pfx = ui.fig.family;
  const files = (c && c.attachments) || [];
  // Files dropped straight onto this row, still uploading or failed. They
  // render in the SAME strip as the committed ones — the row has no submit, so
  // there is nowhere else for them to live. data-scope is what _setPendingStatus
  // addresses, and it carries the comment id so two rows never collide.
  const inFlight = (ui.getRowUploads && ui.getRowUploads(c && c.id)) || [];
  if (!files.length && !inFlight.length) return null;

  /**
   * One chip, whatever state it is in. Committed and in-flight entries share
   * the SAME shape deliberately: rendering in-flight ones as the taller
   * fileCard made the whole thread jump 36px the moment an upload committed,
   * which with a second drop in flight moved the list under the cursor.
   *
   * The trailing 12px slot is always present and holds exactly one thing —
   * unlink, spinner, retry, or nothing — so width never varies by state or by
   * ownership either.
   */
  const chip = (f, opt = {}) => {
    const nid = f.file_nid || f.nid;
    const name = `${f.filename || ""}${f.extension ? "." + f.extension : ""}`;
    const status = opt.pending ? f.status || "queued" : null;
    const busy = status === "uploading" || status === "downloading";
    const pendingKey = String(f.localKey || f.nid || "");
    // Slot contents, in order. Retry is the extra one — only an error state has
    // two controls, and that state is terminal, so the in-flight → committed
    // swap the equal-width rule exists for still moves between one and one.
    const controls = [];
    if (status === "error" && (f.file || f.nid)) {
      // Suppressed when there is nothing a retry could do: a cross-hub
      // placeholder whose download failed carries neither file nor nid, so the
      // link has no input and the fetch is never re-run. The ✕ below is what
      // makes that chip disposable instead of merely stuck.
      controls.push(
        Skeletons.Button.Svg({
          className: `${pfx}__comment-attachment-retry`,
          ico: "refresh-view",
          bubble: 0,
          service: "retry-pending-file",
          uiHandler: [ui],
          pendingKey,
          commentId: c && c.id,
          tooltips: {
            content: LOCALE.RETRY || "Retry",
            className: `${pfx}__tip`,
          },
        }),
      );
    }
    // ✕ on every chip of a comment you wrote, whatever state it is in — what it
    // removes is what differs. task.comment_unlink_file is author-checked
    // server-side, so someone else's attachment gets no ✕ rather than one that
    // always fails.
    if (isOwn) {
      controls.push(
        status
          ? Skeletons.Button.Svg({
              // Same class as the unlink ✕: one control, one look, and it picks
              // up the data-loading spinner contract below for free.
              className: `${pfx}__comment-attachment-unlink`,
              ico: "cross",
              bubble: 0,
              service: "discard-row-file",
              uiHandler: [ui],
              commentId: c && c.id,
              pendingKey,
              // Mid-transfer there is nothing to cancel — no abort path exists
              // for an upload already on the wire. The glyph gives way to the
              // spinner and the button goes inert (skin: [data-loading="1"]),
              // which is also why the slot no longer draws a spinner of its
              // own: it would double up with this one.
              attrOpt: { "data-loading": busy ? "1" : "0" },
              tooltips: {
                content: LOCALE.REMOVE || LOCALE.DELETE,
                className: `${pfx}__tip`,
              },
            })
          : Skeletons.Button.Svg({
              className: `${pfx}__comment-attachment-unlink`,
              ico: "cross",
              bubble: 0,
              service: "comment-unlink-attachment",
              uiHandler: [ui],
              commentId: c && c.id,
              fileNid: nid,
            }),
      );
    }
    return Skeletons.Box.X({
      className: `${pfx}__comment-attachment`,
      // A chip mid-upload is not a click target for opening the file.
      service: nid && !busy && !status ? "open-attachment" : null,
      uiHandler: nid && !busy && !status ? [ui] : null,
      fileNid: nid,
      attrOpt: {
        ...(status ? { "data-status": status, "data-key": pendingKey } : {}),
      },
      kids: [
        Skeletons.Image.Svg({
          ico: attachmentIcon(f),
          className: `${pfx}__comment-attachment-ico`,
          // Lets the skin treat a type differently without the renderer
          // knowing about colour — see the office rule in the skin.
          attrOpt: { "data-ext": String(f.extension || "").toLowerCase() },
        }),
        Skeletons.Note({
          className: `${pfx}__comment-attachment-name`,
          content: name,
        }),
        // Always rendered, even when empty: reserving the slot keeps every
        // chip the same width regardless of state or authorship. It holds one
        // control in every state but error, which adds retry beside the ✕.
        Skeletons.Box.X({
          className: `${pfx}__comment-attachment-slot`,
          kids: controls,
        }),
      ],
    });
  };

  return Skeletons.Box.X({
    className: `${pfx}__comment-attachments`,
    attrOpt: { "data-scope": `comment-row:${c && c.id}` },
    kids: files
      .map((f) => chip(f))
      .concat(inFlight.map((f) => chip(f, { pending: true }))),
  });
}

// Comment threads only. The change log is a separate part
// (buildHistoryListContent) so a history reload never re-feeds this one, and
// vice versa; the active tab hides whichever list it excludes in CSS.
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

  // Existing reactions shown as emoji+count chips (null when a comment has none).
  const reactBar = (c) => {
    const kids = groupReactions(c.reactions).map((g) =>
      Skeletons.Note({
        className: `${pfx}__react-chip`,
        content: `${g.emoji} ${g.count}`,
        attrOpt: {
          "data-own": g.own ? "1" : "0",
          "data-comment-id": c.id,
          "data-emoji": g.emoji,
        },
        bubble: 0,
        // Clicking a chip only removes YOUR OWN reaction; others' chips do
        // nothing. Adding is via the like button / add-reaction picker.
        service: g.own ? "comment-react-remove" : null,
        uiHandler: g.own ? [ui] : null,
        commentId: c.id,
        emoji: g.emoji,
      }),
    );
    if (!kids.length) return null;
    return Skeletons.Box.X({ className: `${pfx}__react-bar`, kids });
  };

  const reactPick = (c, e) =>
    Skeletons.Note({
      className: `${pfx}__react-pick`,
      content: e,
      bubble: 0,
      service: "comment-react-add",
      uiHandler: [ui],
      commentId: c.id,
      emoji: e,
    });

  // Reaction bar, shown below the action icons when the ☺ toggle is open: six
  // quick reactions + a "…" button. "…" opens the full emoji picker (the
  // floating __reactions-picker wrapper, fed with assets/emojis on demand).
  const pickerRow = (c) => {
    if (String(pickerFor || "") !== String(c.id)) return null;
    return Skeletons.Box.X({
      className: `${pfx}__react-picker-wrap`,
      kids: [
        ...QUICK_REACTIONS.map((e) => reactPick(c, e)),
        Skeletons.Note({
          className: `${pfx}__react-more`,
          content: "⋯",
          bubble: 0,
          service: "comment-react-more",
          uiHandler: [ui],
          commentId: c.id,
          attrOpt: { title: LOCALE.MORE || "More" },
        }),
      ],
    });
  };

  // Comment action triggers, rendered as icons in a fixed order:
  //   reply · 👍 quick-react · ☺ reaction palette · edit · delete
  // (edit/delete only on one's own comments).
  const actionIcon = (ico, service, extra) =>
    Skeletons.Button.Svg({
      ico,
      className: `${pfx}__comment-action-ico`,
      bubble: 0,
      service,
      uiHandler: [ui],
      ...extra,
    });
  const commentActions = (c, isOwn) => {
    // Hide the quick 👍 button only for the user who already liked this comment
    // (their own 👍 chip is then the toggle affordance). Others still see the
    // button so they can add their own like.
    const hasLike = (c.reactions || []).some(
      (r) =>
        r && r.emoji === LIKE_EMOJI && String(r.uid) === String(Visitor.id),
    );
    // Icon order + glyphs mirror the Figma design (Activity detail 2037-14883):
    //   👍 like · ☺ react · 💬 reply · ✏️ edit · 🗑 delete.
    // All five are Phosphor "regular" icons (same 256 grid + stroke) so they
    // render at a uniform visual size, unlike the mixed-family icons before.
    const kids = [
      hasLike
        ? null
        : actionIcon("ph-thumbs-up", "comment-react-add", {
            commentId: c.id,
            emoji: LIKE_EMOJI,
            tooltips: {
              content: LOCALE.LIKE || "Thumbs up",
              className: `${pfx}__tip`,
            },
          }),
      actionIcon("ph-smiley-sticker", "comment-react-toggle", {
        commentId: c.id,
        tooltips: {
          content: LOCALE.ADD_REACTION,
          className: `${pfx}__tip`,
        },
      }),
      actionIcon("ph-chat-teardrop-text", "comment-reply", {
        commentId: c.id,
        tooltips: {
          content: LOCALE.REPLY,
          className: `${pfx}__tip`,
        },
      }),
    ].filter(Boolean);
    if (isOwn) {
      kids.push(
        actionIcon("ph-pencil-simple-line", "comment-edit", {
          commentId: c.id,
          tooltips: {
            content: LOCALE.EDIT,
            className: `${pfx}__tip`,
          },
        }),
        actionIcon("ph-trash", "comment-delete", {
          commentId: c.id,
          tooltips: {
            content: LOCALE.DELETE,
            className: `${pfx}__tip`,
          },
        }),
      );
    }
    return Skeletons.Box.X({ className: `${pfx}__comment-actions`, kids });
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
          content: authorName(m),
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
        // data-comment-id is what a file drag resolves against (ZONES:
        // __comment-row[data-comment-id]). Every row carries it, edited or
        // not — see the normal-row render below.
        attrOpt: {
          "data-reply": isReply ? "1" : "0",
          "data-comment-id": c.id,
          // Uploads in flight on this comment: the skin dims the row and takes
          // its controls out of reach (see _refuseWhileRowBusy for the
          // matching handler guard).
          "data-busy": ui.isCommentRowBusy(c.id) ? "1" : "0",
          // ...except the editor itself. A drop lands on the row even while it
          // is being edited, and freezing a half-typed comment behind a video
          // upload would trap the author: Cancel already refuses mid-save.
          "data-editing": "1",
        },
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
              // Files already attached to the comment, shown while editing too:
              // after a partly-failed save the ones that landed are here, and
              // only the ones still to retry are in the strip below.
              commentAttachments(ui, c, isOwn),
              Skeletons.Box.X({
                className: `${pfx}__comment-actions`,
                kids: [
                  ...composerTools(ui, `comment-row:${c.id}`),
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
              // commentAttachments returns null when there are none.
            ].filter(Boolean),
          }),
          // Covers this row alone. Every row has one; there is no longer a
          // panel-wide overlay to stand in for.
          commentDropOverlay(ui),
        ],
      });
    }

    return Skeletons.Box.X({
      className: `${pfx}__comment-row`,
      // data-comment-id is what a file drag resolves against (ZONES:
      // __comment-row[data-comment-id]). It used to be set ONLY on the
      // edit-mode row above, which made the attribute itself the edit-mode
      // gate — every other row was invisible to the resolver. Rows are
      // unconditional drop targets now, so every row carries it.
      attrOpt: {
        "data-reply": isReply ? "1" : "0",
        "data-comment-id": c.id,
        // See the edit-mode row above. Rendered on every row so the state is
        // read from one place — the panel's isCommentRowBusy — rather than
        // written onto the DOM by whoever happens to notice a status change.
        "data-busy": ui.isCommentRowBusy(c.id) ? "1" : "0",
      },
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
              // Let the browser's own menu open on a comment — otherwise the
              // engine hands contextmenu to the nearest ancestor offering one,
              // taking "Copy link address" off a link in the body.
              escapeContextmenu: 1,
              attrOpt: { "data-comment-id": c.id },
            }),
            // Files attached to this comment, between the body and the footer.
            commentAttachments(ui, c, isOwn),
            // Reaction chips + action icons share one horizontal footer row.
            Skeletons.Box.X({
              className: `${pfx}__comment-footer`,
              kids: [reactBar(c), commentActions(c, isOwn)].filter(Boolean),
            }),
            // Emoji palette opens on its own row below the icons.
            pickerRow(c),
          ].filter(Boolean),
        }),
        // Every row is a drop target now, not just the one being edited, so
        // every row needs the overlay its data-drop-active reveals.
        commentDropOverlay(ui),
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

  // The reply composer can be opened from a root OR a child. Resolve the clicked
  // comment to its root so the composer renders once, at the tail of that root's
  // thread, and the reply attaches as a sibling (parent_id = root). Mirror the
  // orphan fallback above: a reply whose parent is gone counts as its own root.
  const replyTarget = replyingTo
    ? comments.find((c) => String(c.id) === String(replyingTo))
    : null;
  const replyingToRootId = replyTarget
    ? replyTarget.parent_id && ids.has(String(replyTarget.parent_id))
      ? String(replyTarget.parent_id)
      : String(replyTarget.id)
    : null;
  // Show "Replying to @Name" only when answering a child, since the composer is
  // visually detached from it (it renders at the end of the thread).
  const replyingToChild =
    !!replyTarget && String(replyTarget.id) !== replyingToRootId;

  // Reply composer (Figma 2037-14883, "Comment" variant): a single grey rounded
  // pill — the input on the left, the paperclip / @ / send icons inline on the
  // right. No separate Reply/Cancel text row; send submits, and clicking the
  // comment's reply icon again toggles the composer closed.
  const composerBlock = () =>
    Skeletons.Box.Y({
      className: `${pfx}__comment-replybox`,
      kids: [
        replyingToChild
          ? Skeletons.Note({
              className: `${pfx}__comment-replying-to`,
              content: `${LOCALE.REPLYING_TO || "Replying to"} ${authorName(
                ui.getMember(replyTarget.author_uid) || {},
              )}`,
            })
          : null,
        Skeletons.Box.X({
          className: `${pfx}__comment-reply-pill`,
          kids: [
            mentionField(ui, "comment-reply", {
              fieldClass: `${pfx}__comment-reply-field`,
              editorClass: `${pfx}__comment-reply-input`,
              placeholder: LOCALE.TASK_REPLY_PLACEHOLDER || "Reply...",
            }),
            Skeletons.Box.X({
              className: `${pfx}__comment-reply-tools`,
              kids: [
                ...composerTools(ui, "comment-reply"),
                Skeletons.Button.Svg({
                  ico: "app-send",
                  className: `${pfx}__comment-reply-send`,
                  bubble: 0,
                  service: "comment-reply-submit",
                  uiHandler: [ui],
                }),
              ],
            }),
          ],
        }),
        // Files dropped on the composer, attached to the reply once it is sent.
        pendingStrip(ui, "comment-reply"),
        // The composer is a drop target in its own right, on the same terms as
        // an edited row.
        commentDropOverlay(ui),
      ].filter(Boolean),
    });

  // Each root + its replies (+ the open composer) form one thread group. The
  // replies live in their own container so a continuous vertical spine (the
  // container's left border, styled in the skin) can connect them to the root,
  // with a curved elbow branching into each reply. Timestamped so threads keep
  // a stable oldest-first order regardless of the order rows arrive in.
  const out = [];
  roots.forEach((root) => {
    const showComposer = replyingToRootId === String(root.id);
    const clickedId = showComposer ? String(replyingTo) : null;
    // The composer renders directly below the comment whose Reply was clicked:
    // right under the root when replying to it, otherwise right under that child.
    const replyKids = [];
    if (showComposer && clickedId === String(root.id)) {
      replyKids.push(composerBlock());
    }
    (repliesByParent[root.id] || []).forEach((rep) => {
      replyKids.push(commentBlock(rep, true));
      if (showComposer && clickedId === String(rep.id)) {
        replyKids.push(composerBlock());
      }
    });
    const threadKids = [commentBlock(root, false)];
    if (replyKids.length) {
      threadKids.push(
        Skeletons.Box.Y({
          className: `${pfx}__comment-thread-replies`,
          kids: replyKids,
        }),
      );
    }
    out.push({
      ts: Number(root.ctime) || 0,
      node: Skeletons.Box.Y({
        className: `${pfx}__comment-thread`,
        attrOpt: { "data-has-replies": replyKids.length ? "1" : "0" },
        kids: threadKids,
      }),
    });
  });
  // Oldest first (comments arrive ASC, but don't depend on it).
  return out.sort((a, b) => a.ts - b.ts).map((e) => e.node);
}

// One change-log line: who, what, when. Project Health names the task after
// the verb; here that is redundant, so the two verbs that read as a fragment
// without it use their standalone form.
const HISTORY_VERBS = {
  create: "TASK_ACT_CREATE",
  update: "TASK_ACT_UPDATE",
  status: "TASK_ACT_STATUS",
  complete: "TASK_ACT_COMPLETE",
  assignee: "TASK_ACT_ASSIGNEE",
  reporter: "TASK_ACT_REPORTER",
  link_file: "TASK_ACT_LINKED_FILES",
  comment: "TASK_ACT_COMMENTED",
};

// Change-log rows only — the sibling part of buildCommentListContent above.
// Fed by _refreshHistoryList when task.activity lands, independently of the
// comment feed.
function buildHistoryListContent(ui) {
  const pfx = ui.fig.family;
  const history = ui.getTaskHistory ? ui.getTaskHistory() || [] : [];
  if (!history.length) {
    return [
      Skeletons.Note({
        className: `${pfx}__history-empty`,
        content: LOCALE.TASK_NO_HISTORY,
      }),
    ];
  }
  const historyBlock = (r) => {
    const m = ui.getMember(r.actor_uid) || {};
    return Skeletons.Box.X({
      className: `${pfx}__history-row`,
      kids: [
        Skeletons.UserProfile({
          className: `${pfx}__history-avatar`,
          id: r.actor_uid,
          firstname: m.firstname,
          lastname: m.lastname,
          auto_color: 1,
          live_status: 0,
        }),
        Skeletons.Box.X({
          className: `${pfx}__history-text`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__history-actor`,
              content: authorName(m),
            }),
            Skeletons.Note({
              className: `${pfx}__history-verb`,
              content:
                LOCALE[HISTORY_VERBS[r.action] || "TASK_ACT_UPDATE"] ||
                LOCALE.TASK_ACT_UPDATE,
            }),
          ],
        }),
        Skeletons.Note({
          className: `${pfx}__history-time`,
          content: commentTimeAgo(r.ctime),
        }),
      ],
    });
  };
  // Oldest first — the activity proc returns newest-first.
  return history
    .slice()
    .sort((a, b) => (Number(a.ctime) || 0) - (Number(b.ctime) || 0))
    .map(historyBlock);
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

// "Drop to attach" overlay for a task region (__attachments / __create-files),
// shown while data-drop-active="1" is set on that region's own element.
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

  // Status belongs to a file that has not landed yet, so only the pending
  // strip carries it — a committed attachment is, by definition, done. The
  // states are CSS-driven off data-status (see skin) so a transition is one
  // attribute write, not a rebuilt card: "downloading" a cross-hub copy still
  // arriving, "uploading" a save in flight, "error" one that needs retrying.
  const status = opt.committed ? null : f.status || "queued";
  const pendingKey = String(f.localKey || f.nid || "");
  const stateKids =
    status === "uploading" || status === "downloading"
      ? [
          Skeletons.Box.Y({
            className: `${pfx}__file-pending-spinner`,
            attrOpt: { title: LOCALE.LOADING || "…" },
          }),
        ]
      : status === "error" && (f.file || f.nid)
        ? [
            // Suppressed when neither file nor nid is present: that is a
            // cross-hub placeholder whose download failed, so the link has no
            // input and the fetch is never re-run. Same rule as the comment
            // chip — a button that cannot work must not be offered.
            Skeletons.Button.Svg({
              className: `${pfx}__file-pending-retry`,
              ico: "refresh-view",
              bubble: 0,
              service: "retry-pending-file",
              uiHandler: [ui],
              pendingKey,
              // Row uploads are keyed per comment; the staged strips pass
              // nothing here and keep the old single-retry path.
              commentId: opt.commentId,
              tooltips: {
                content: LOCALE.RETRY || "Retry",
                className: `${pfx}__tip`,
              },
            }),
          ]
        : [];

  return Skeletons.Box.Y({
    className: `${pfx}__attachment-row has-preview`,
    // A row mid-upload must not also be a click target for opening the file.
    service: openable && status !== "uploading" ? "open-attachment" : null,
    uiHandler: openable && status !== "uploading" ? [ui] : null,
    fileNid: nid,
    ...(status ? { attrOpt: { "data-status": status, "data-key": pendingKey } } : {}),
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__attachment-thumb-box`,
        kids: [preview, ...stateKids],
      }),
      Skeletons.Note({
        className: `${pfx}__attachment-name`,
        content: filename,
      }),
      // Remove stays rendered while uploading so the card does not reflow; the
      // skin disables it and the handler refuses, since there is no way to
      // un-upload a file that is already on its way.
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

// Custom flatpickr `position` (used because the calendar is appendTo:body and
// the due-input lives in a narrow right rail): float the calendar to the LEFT
// of the input, beside it, so it opens into the wide center area instead of
// dropping below and clipping at the bottom. The calendar is clamped to the
// bounds of its host panel card (detail panel or create modal) so it can't
// spill outside the dialog — the whole picker, footer included, stays inside
// the card. Falls back to the viewport when no card is found. Assigned in
// vendorOpt, so it overrides the widget's default above/below placement
// without touching other date_picker consumers.
function positionDueCalendarLeft(instance) {
  const cal = instance.calendarContainer;
  if (!cal) return;
  const anchor = instance._positionElement || instance.altInput || instance.input;
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  const gap = 8;

  // Clamp within the host panel card when present, else the viewport. Both
  // panels tag their card with a known class (fig.family === "tasks-panel").
  const card = anchor.closest(
    ".tasks-panel__detail-panel, .tasks-panel__create-modal"
  );
  const bounds = card
    ? card.getBoundingClientRect()
    : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };

  // flatpickr's own arrow (points at the input) is meaningless when we sit
  // beside the field, so drop the arrow classes.
  cal.classList.remove("arrowTop", "arrowBottom", "arrowLeft", "arrowRight");
  cal.style.position = "absolute";
  cal.style.right = "auto";

  // Prefer sitting just left of the input; never cross the card's left edge.
  const left = Math.max(
    bounds.left + gap,
    rect.left - cal.offsetWidth - gap
  );
  // Track the input's top, but keep the whole calendar inside the card.
  const top = Math.max(
    bounds.top + gap,
    Math.min(rect.top, bounds.bottom - cal.offsetHeight - gap)
  );
  cal.style.left = `${left + scrollX}px`;
  cal.style.top = `${top + scrollY}px`;
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
  // Disable picking days in the past (both create and detail); flatpickr still
  // shows an existing past due date, it just can't be (re)selected earlier.
  const minDate = "today";

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
        placeholder: LOCALE.SELECT_START_DATE,
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
          position: positionDueCalendarLeft,
          onReady: onReady(true),
        },
      }
    : {
        kind: "date_picker",
        className: `${pfx}__due-input`,
        innerClass: `${pfx}__due-input-inner`,
        name: "due_date",
        placeholder: LOCALE.SELECT_DATE,
        // Empty (not today): a new task has no due date until one is picked —
        // the widget reads an explicit empty `value` as "nothing selected".
        value: draft.due_date || "",
        service: "task-input-changed",
        uiHandler: [ui],
        // appendTo: body escapes the panel's overflow clip; onReady tags the
        // calendar so it can be themed without bleeding into other pickers.
        vendorOpt: {
          dateFormat: "Y-m-d",
          altInput: true,
          altFormat: "d/m/Y",
          // Spelled out (vendorOpt wins over the widget's own default): an
          // unset due date stays unset. The panel reads this input back on
          // commit, so a picker that seeded itself with today would silently
          // stamp every new task with its creation date.
          defaultDate: draft.due_date || null,
          minDate,
          appendTo: document.body,
          position: positionDueCalendarLeft,
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

/**
 * "Child task items" block — Figma 58471:222398 / 58471:222650.
 *
 * Lives in the detail panel's RIGHT sidebar, under Due date (that is where the
 * design puts it; the earlier written spec had said between Description and
 * Attachments). Header, then the existing children, then the inline creator
 * card when one is open.
 *
 * The whole block is one re-feedable part (sys_pn "subtask-rows") for the same
 * reason attachments and comments are: a full _render() steals focus from the
 * title/description editors and drops unsaved edits. Re-feeding THIS block is
 * safe even mid-typing, because the card's title Entry is seeded from the draft
 * and kept in sync by the `task-input-changed` watch.
 */
function buildSubtaskRowsContent(ui, parentId) {
  const pfx = ui.fig.family;
  const parent = ui.getTaskById(parentId);
  const subs = ui.getSubtasks(parentId);
  const draft = ui.getSubtaskDraft();
  const priorities = ui.getPriorities() || [];
  const cols = ui.getColumns() || [];
  const { done, total } = ui.getSubtaskCount(parent || { id: parentId });
  // One level of nesting: a child never offers a child of its own. Enforced
  // server-side too (SUBTASK_NESTING_DENIED); this only stops it being offered.
  const canAdd = mayCreateTask(ui) && !ui.isSubtask(parent);

  const metaOf = (list, key) => list.find((x) => x.key === key) || null;

  // ── Header: label + "Add child work item" caption + the ＋ ──────────────
  const header = Skeletons.Box.X({
    className: `${pfx}__subtask-header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__subtask-header-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__subtask-heading`,
            content: LOCALE.SUBTASKS,
          }),
          Skeletons.Note({
            className: `${pfx}__subtask-subheading`,
            content: LOCALE.ADD_SUBTASK,
          }),
        ],
      }),
      // done/total is not in the Figma frames, but the written spec calls for a
      // count and the header is the only place it fits in this column.
      total
        ? Skeletons.Note({
            className: `${pfx}__subtask-count`,
            content: `${done}/${total}`,
            attrOpt: { "data-complete": done === total ? "1" : "0" },
          })
        : null,
      canAdd
        ? Skeletons.Button.Svg({
            className: `${pfx}__subtask-add`,
            // app-add, NOT "plus": that glyph is a filled disc with the plus
            // knocked out of it, so colouring the svg painted a solid black
            // circle. app-add is the bare 12px plus stroke.
            ico: "app-add",
            bubble: 0,
            service: "add-subtask",
            uiHandler: [ui],
            // See gantt.js: the bare string form renders the tooltip as
            // inline text inside the button and hides the icon.
            tooltips: {
              content: LOCALE.CREATE_CHILD_TASK,
              className: `${pfx}__tip`,
            },
          })
        : null,
    ].filter(Boolean),
  });

  // ── An existing child ───────────────────────────────────────────────────
  // Not specified in the Figma frames (they only show the creator), so this
  // keeps the earlier design, compacted for the ~220px sidebar column: the
  // status toggle, the title, and a priority dot rather than a full pill.
  const subRow = (t) => {
    const isDone = ui.isDoneStatus(t.status);
    const pm = metaOf(priorities, t.priority || "medium");
    const due = t.due_date ? formatDueDate(t.due_date) : "";
    return Skeletons.Box.X({
      className: `${pfx}__subtask-row`,
      bubble: 0,
      service: "open-detail",
      uiHandler: [ui],
      taskId: t.id,
      attrOpt: { "data-done": isDone ? "1" : "0" },
      kids: [
        Skeletons.Button.Svg({
          className: `${pfx}__subtask-check`,
          ico: "app-check",
          bubble: 0,
          service: "toggle-subtask-complete",
          uiHandler: [ui],
          taskId: t.id,
          attrOpt: { "data-done": isDone ? "1" : "0" },
        }),
        Skeletons.Box.Y({
          className: `${pfx}__subtask-text`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__subtask-title`,
              content: t.title || "",
            }),
            due
              ? Skeletons.Note({
                  className: `${pfx}__subtask-meta`,
                  content: due,
                })
              : null,
          ].filter(Boolean),
        }),
        t.priority && pm
          ? Skeletons.Note({
              className: `${pfx}__subtask-dot`,
              styleOpt: { background: pm.color },
            })
          : null,
        // Same one-click remove the board card, gantt row and calendar chip
        // already carry, so a child is deletable from where it is listed
        // instead of only after opening it.
        Skeletons.Button.Svg({
          className: `${pfx}__subtask-del`,
          ico: "cross",
          bubble: 0,
          service: "remove-task",
          uiHandler: [ui],
          taskId: t.id,
        }),
      ].filter(Boolean),
    });
  };

  // ── Creator card (Figma) ────────────────────────────────────────────────
  // Bordered card: title + ✕ on the first row, then the Priority / Due date /
  // Status chips, then Create. The Figma frame has no Create button — it
  // assumes Enter — but the panel's own Update sits right below the card, so
  // "fill it in and press save" hit Update, which commits the PARENT and closes
  // the panel. Enter still commits; the button is the discoverable path.
  const chip = (kind, label, dot, extraClass) =>
    Skeletons.Box.X({
      className: `${pfx}__subtask-chip${extraClass ? " " + extraClass : ""}`,
      attrOpt: {
        "data-kind": kind,
        "data-open": draft && draft.menu === kind ? "1" : "0",
      },
      bubble: 0,
      service: kind === "date" ? null : "toggle-subtask-menu",
      uiHandler: kind === "date" ? null : [ui],
      menuKind: kind,
      kids: [
        dot
          ? Skeletons.Note({
              className: `${pfx}__subtask-chip-dot`,
              styleOpt: { background: dot },
            })
          : null,
        Skeletons.Note({
          className: `${pfx}__subtask-chip-label`,
          content: label,
        }),
        Skeletons.Image.Svg({
          ico: kind === "date" ? "calendar" : "apps-caret-down",
          className: `${pfx}__subtask-chip-ico`,
        }),
        // The native picker sits invisibly over the whole chip so the click
        // opens the platform date UI. Its change is caught by a delegated
        // listener on the panel root (the card is rebuilt on every re-feed, so
        // a per-node listener would not survive).
        kind === "date"
          ? Skeletons.Element({
              tagName: "input",
              className: `${pfx}__subtask-date-input`,
              attrOpt: { type: "date", value: (draft && draft.due_date) || "" },
            })
          : null,
        // The dropdown is a child of the chip that opened it, not of the card:
        // absolutely positioned against the card it dropped below the WHOLE
        // form, nowhere near the control that was clicked. __subtask-chip is
        // position:relative, so anchoring here puts it under its own chip.
        draft && draft.menu === kind ? menu(kind) : null,
      ].filter(Boolean),
    });

  const menu = (kind) => {
    if (!draft || !kind || kind === "date") return null;
    const isPriority = kind === "priority";
    const items = isPriority
      ? priorities.map((p) => ({
          key: p.key,
          label: LOCALE[p.label] || p.key,
          color: p.color,
          selected: draft.priority === p.key,
        }))
      : cols.map((c) => ({
          key: c.key,
          label: c.name || LOCALE[c.label] || c.key,
          color: c.color,
          selected: draft.status === c.key,
        }));
    return Skeletons.Box.Y({
      className: `${pfx}__subtask-menu`,
      attrOpt: { "data-kind": kind },
      bubble: 0,
      kids: items.map((i) =>
        Skeletons.Box.X({
          className: `${pfx}__subtask-menu-item`,
          attrOpt: { "data-selected": i.selected ? "1" : "0" },
          bubble: 0,
          service: isPriority ? "set-subtask-priority" : "set-subtask-status",
          uiHandler: [ui],
          taskPriority: i.key,
          taskStatus: i.key,
          kids: [
            Skeletons.Note({
              className: `${pfx}__subtask-menu-dot`,
              styleOpt: { background: i.color || "#AEAEB2" },
            }),
            Skeletons.Note({
              className: `${pfx}__subtask-menu-label`,
              content: i.label,
            }),
          ],
        }),
      ),
    });
  };

  const creator = () => {
    const pm = metaOf(priorities, draft.priority);
    const sm = metaOf(cols, draft.status);
    return Skeletons.Box.Y({
      className: `${pfx}__subtask-card`,
      bubble: 0,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__subtask-card-head`,
          kids: [
            Skeletons.Entry({
              className: `${pfx}__subtask-card-title`,
              name: "subtask-title",
              // Explicit "" matters: the entry template interpolates
              // value="${m.value}" straight from model.toJSON(), so an omitted
              // value renders the literal string "undefined" in the field.
              value: draft.title || "",
              // Keystrokes land on the draft, so the typed title survives any
              // re-feed of this block (a peer's WS update re-renders too).
              watch: "task-input-changed",
              placeholder: LOCALE.SUBTASK_PLACEHOLDER,
              mode: "commit",
              service: "create-subtask",
              bubble: 0,
              uiHandler: [ui],
            }),
            Skeletons.Button.Svg({
              className: `${pfx}__subtask-card-close`,
              ico: "cross",
              bubble: 0,
              service: "cancel-subtask",
              uiHandler: [ui],
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__subtask-card-chips`,
          kids: [
            chip(
              "priority",
              pm ? LOCALE[pm.label] || pm.key : LOCALE.PRIORITY,
              pm && pm.color,
            ),
            chip(
              "date",
              draft.due_date ? formatDueDate(draft.due_date) : LOCALE.DUE_DATE,
              null,
            ),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__subtask-card-chips`,
          kids: [
            chip(
              "status",
              sm ? sm.name || LOCALE[sm.label] || sm.key : LOCALE.STATUS,
              sm && sm.color,
            ),
          ],
        }),
        // Explicit Create. The Figma frame has no button — it assumes Enter —
        // but with the panel's own Update button sitting right below the card,
        // "fill the fields, press the save button" hit Update instead: that
        // commits the PARENT and closes the panel, so the child was never
        // created and the draft went with it. Enter still commits.
        Skeletons.Box.X({
          className: `${pfx}__subtask-card-actions`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__subtask-create-submit`,
              content: LOCALE.CREATE,
              bubble: 0,
              service: "create-subtask",
              uiHandler: [ui],
            }),
          ],
        }),
      ].filter(Boolean),
    });
  };

  return [
    header,
    ...subs.map(subRow),
    draft && canAdd ? creator() : null,
    // Only when there is genuinely nothing: with the creator open the block is
    // not empty, and an empty-state line under an active form reads as an error.
    !subs.length && !draft
      ? Skeletons.Note({
          className: `${pfx}__subtask-empty`,
          content: LOCALE.NO_SUBTASKS,
        })
      : null,
  ].filter(Boolean);
}

make.buildSubtaskRowsContent = buildSubtaskRowsContent;
make.buildFileSearchDropdownContent = buildFileSearchDropdownContent;
make.buildAssigneeChips = buildAssigneeChips;
make.buildReporterChip = buildReporterChip;
make.buildAssigneeSuggestions = buildAssigneeSuggestions;
make.buildMentionItemsContent = buildMentionItemsContent;
make.buildLinkPromptContent = buildLinkPromptContent;
make.buildCommentListContent = buildCommentListContent;
make.buildHistoryListContent = buildHistoryListContent;
make.buildPendingListContent = buildPendingListContent;
make.buildAttachmentRowsContent = buildAttachmentRowsContent;
make.buildDueSectionContent = buildDueSectionContent;
make.dueSummaryText = dueSummaryText;
module.exports = make;
