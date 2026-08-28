// List view — a flat, client-side-sortable table over the folder-scoped task
// set, styled to match the Figma "list view" spec. Column order:
// Task (checkbox + title) · Priority · Status · Due date · Linked files ·
// Assignee. Row click opens the detail panel; the leading checkbox toggles
// the task complete. Globals Skeletons/LOCALE are injected at runtime.
const {
  PRIORITY_RANK,
  assigneeUids,
  formatDueRange,
  isOverdue,
  priorityMeta,
  statusMeta,
  subtaskBadge,
} = require("./helpers");

const MAX_AVATARS = 3; // avatars shown before collapsing to a "+N" chip
const MAX_FILES = 1; // file chips shown before collapsing to a "+N" chip

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const cols = ui.getColumns();
  const sort = ui.getSort();
  const tasks = ui.getTopLevelTasks().slice();

  const statusOrder = cols.reduce((a, c, i) => {
    a[c.key] = i;
    return a;
  }, {});

  if (sort) {
    const dir = sort.dir || 1;
    const cmp = {
      title: (a, b) =>
        String(a.title || "").localeCompare(String(b.title || "")),
      status: (a, b) =>
        (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99),
      priority: (a, b) =>
        (PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0),
      due: (a, b) => {
        const da = a.due_date || "";
        const db = b.due_date || "";
        if (!da && !db) return 0;
        if (!da) return 1; // nulls last
        if (!db) return -1;
        return da < db ? -1 : da > db ? 1 : 0;
      },
    }[sort.key];
    if (cmp) tasks.sort((a, b) => dir * cmp(a, b));
  } else {
    // Natural order: status column order, then rank within the column.
    tasks.sort(
      (a, b) =>
        (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) ||
        (a.rank || 0) - (b.rank || 0),
    );
  }

  const arrow = (key) =>
    sort && sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "";

  const th = (key, label, sortable, extra) =>
    Skeletons.Note({
      className: `${pfx}__list-th${extra ? " " + extra : ""}`,
      content: (label || "") + (sortable ? arrow(key) : ""),
      attrOpt: sortable ? { "data-sortable": "1" } : undefined,
      bubble: 0,
      service: sortable ? "set-sort" : null,
      uiHandler: sortable ? [ui] : null,
      sortKey: key,
    });

  const header = Skeletons.Box.X({
    className: `${pfx}__list-head`,
    kids: [
      th("title", LOCALE.TASK, true),
      th("priority", LOCALE.PRIORITY, true),
      th("status", LOCALE.STATUS, true),
      th("due", LOCALE.DUE_DATE, true),
      Skeletons.Note({
        className: `${pfx}__list-th ${pfx}__list-th-files`,
        content: LOCALE.LINKED_FILES,
      }),
      Skeletons.Note({
        className: `${pfx}__list-th ${pfx}__list-th-assignee`,
        content: LOCALE.ASSIGNEE,
      }),
    ],
  });

  // Task cell — expand chevron + leading checkbox (toggles complete) + title.
  // `sub` renders the indented child variant: no chevron (one level of nesting,
  // so a subtask never has children of its own) and no count badge.
  const titleCell = (t, sub) => {
    const done = ui.isDoneStatus(t.status);
    const { total } = ui.getSubtaskCount(t);
    // A task with no children gets no live chevron — no dead affordance — but
    // it still renders the element as an inert, invisible spacer. Without one
    // its checkbox and title sit a chevron-width to the left of every
    // expandable neighbour's, and the column visibly jitters row to row. Child
    // rows take the spacer too: one level of nesting, so a subtask never has
    // children of its own. Same treatment as gantt.js.
    //
    // The live chevron needs bubble:0 of its own: the whole row carries
    // service:"open-detail", so without it expanding would also open the modal.
    const chevron =
      !sub && total
        ? Skeletons.Note({
            className: `${pfx}__list-chevron`,
            content: "›",
            bubble: 0,
            service: "toggle-subtasks",
            uiHandler: [ui],
            taskId: t.id,
            attrOpt: { "data-open": ui.isSubtasksOpen(t.id) ? "1" : "0" },
          })
        : Skeletons.Note({
            className: `${pfx}__list-chevron`,
            attrOpt: { "data-empty": "1" },
          });
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-title-cell`,
      attrOpt: sub ? { "data-sub": "1" } : undefined,
      kids: [
        chevron,
        Skeletons.Button.Svg({
          className: `${pfx}__list-check`,
          ico: "app-check",
          bubble: 0,
          service: "toggle-complete",
          uiHandler: [ui],
          taskId: t.id,
          attrOpt: { "data-done": done ? "1" : "0" },
        }),
        Skeletons.Note({
          className: `${pfx}__list-title`,
          content: t.title || "",
        }),
        sub ? null : subtaskBadge(ui, t, `${pfx}__list-subcount`),
      ].filter(Boolean),
    });
  };

  // Priority cell — filled solid pill; an outline placeholder when unset.
  const priorityCell = (t) => {
    const p = priorityMeta(ui, t.priority);
    const hasP = !!t.priority;
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-priority-cell`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__list-priority`,
          content: hasP ? LOCALE[p.label] || p.key : LOCALE.PRIORITY,
          attrOpt: { "data-priority": hasP ? t.priority : "none" },
        }),
      ],
    });
  };

  // Status cell — tinted pill with a solid colored dot + dark label.
  const statusCell = (t) => {
    const s = statusMeta(ui, t.status);
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-status-cell`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__list-status`,
          // The pill tint is keyed on data-theme, not data-status: a custom
          // column's status IS its DB id, which no per-status rule can match.
          attrOpt: {
            "data-status": t.status || "",
            "data-theme": s.theme || "default",
          },
          kids: [
            Skeletons.Note({
              className: `${pfx}__list-status-dot`,
              styleOpt: { background: s.color || "#AEAEB2" },
            }),
            Skeletons.Note({
              className: `${pfx}__list-status-label`,
              content: s.name || LOCALE[s.label] || s.key,
            }),
          ],
        }),
      ],
    });
  };

  // Due cell — overlay pill; a duration task shows its "start → due" span, a
  // single-day task shows one date; empty when the task has no due date.
  const dueCell = (t) => {
    const due = formatDueRange(t);
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-due-cell`,
      kids: due
        ? [
            Skeletons.Note({
              className: `${pfx}__list-due`,
              content: due,
              attrOpt: { "data-overdue": isOverdue(t.due_date) ? "1" : "0" },
            }),
          ]
        : [],
    });
  };

  // Linked-files cell — first filename as a paperclip chip, then "+N".
  const filesCell = (t) => {
    const files = Array.isArray(t.linked_files) ? t.linked_files : [];
    const shown = files.slice(0, MAX_FILES);
    const more = files.length - shown.length;
    const chips = shown.map((f) =>
      Skeletons.Box.X({
        className: `${pfx}__list-file`,
        kids: [
          Skeletons.Image.Svg({
            ico: "app-attachment",
            className: `${pfx}__list-file-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__list-file-name`,
            content: `${f.filename || ""}${f.extension ? "." + f.extension : ""}`,
          }),
        ],
      }),
    );
    if (more > 0)
      chips.push(
        Skeletons.Note({
          className: `${pfx}__list-file-more`,
          content: `+${more} ${more === 1 ? LOCALE.MORE_FILE : LOCALE.MORE_FILES}`,
        }),
      );
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-files-cell`,
      kids: chips,
    });
  };

  // Assignee cell — overlapping 32px avatars + "+N" chip; an "unassigned"
  // badge when nobody is assigned.
  const assigneeCell = (t) => {
    const uids = assigneeUids(t, ui);
    if (!uids.length)
      return Skeletons.Box.X({
        className: `${pfx}__list-cell ${pfx}__list-assignee-cell`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__list-unassigned`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__list-unassigned-badge`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "account",
                    className: `${pfx}__list-unassigned-ico`,
                  }),
                ],
              }),
              Skeletons.Note({
                className: `${pfx}__list-unassigned-label`,
                content: LOCALE.UNASSIGNED,
              }),
            ],
          }),
        ],
      });
    const shown = uids.slice(0, MAX_AVATARS);
    const more = uids.length - shown.length;
    const avatars = shown.map((uid) => {
      const m = ui.getMember(uid) || {};
      return Skeletons.UserProfile({
        className: `${pfx}__list-avatar`,
        id: uid,
        firstname: m.firstname,
        lastname: m.lastname,
        auto_color: 1,
        live_status: 0,
      });
    });
    if (more > 0)
      avatars.push(
        Skeletons.Note({
          className: `${pfx}__list-avatar-more`,
          content: `+${more}`,
        }),
      );
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-assignee-cell`,
      kids: [
        Skeletons.Box.X({ className: `${pfx}__list-avatars`, kids: avatars }),
      ],
    });
  };

  const row = (t, sub) =>
    Skeletons.Box.X({
      className: `${pfx}__list-row`,
      bubble: 0,
      service: "open-detail",
      uiHandler: [ui],
      taskId: t.id,
      attrOpt: {
        "data-done": ui.isDoneStatus(t.status) ? "1" : "0",
        // The skin indents and de-emphasises child rows off this flag.
        "data-sub": sub ? "1" : "0",
      },
      kids: [
        titleCell(t, sub),
        priorityCell(t),
        statusCell(t),
        dueCell(t),
        filesCell(t),
        assigneeCell(t),
      ],
    });

  // A parent followed by its children when expanded. Sub-rows use the same
  // columns as the parent, per the spec — they are ordinary task rows, just
  // indented.
  const rowGroup = (t) => {
    const kids = [row(t, false)];
    if (ui.isSubtasksOpen(t.id)) {
      ui.getSubtasks(t.id).forEach((s) => kids.push(row(s, true)));
    }
    return kids;
  };

  return Skeletons.Box.Y({
    className: `${pfx}__list`,
    // Phone flag — the skin drops low-priority columns + tightens widths so the
    // table fits without a horizontal scroll (see `[data-mobile="1"]` in skin).
    attrOpt: { "data-mobile": Visitor.isMobile() ? "1" : "0" },
    kids: [
      header,
      Skeletons.Box.Y({
        className: `${pfx}__list-body`,
        kids: tasks.length
          ? tasks.flatMap(rowGroup)
          : [
              Skeletons.Note({
                className: `${pfx}__list-empty`,
                content: LOCALE.NO_TASKS,
              }),
            ],
      }),
    ],
  });
};
