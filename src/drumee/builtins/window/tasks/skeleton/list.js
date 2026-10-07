// List view — a flat, client-side-sortable table over the folder-scoped task
// set, per Figma "Task List Inline Edit" (741:92816). Column order:
// Task (select checkbox + chevron + title + hover ＋) · Priority Level ·
// Status · Start date · Due date · Description · Linked files · Assignee ·
// Reporter.
//
// Every cell but the checkbox is click-to-edit for a member with write rights
// (service "list-edit"): text cells open an inline input with ✓ / ✕, the rest
// an anchored popover. The editor is ONE floating layer (`__list-pop`) outside
// the scroller, so it is never clipped by it; index.js positions it under the
// cell named by its `data-anchor`. A viewer without write rights gets no
// editing affordance at all — the cells carry no service, so a click walks up
// to the row and opens the (read-only) detail card, exactly as before.
//
// Globals Skeletons/LOCALE/Dayjs are injected at runtime.
const {
  PRIORITY_RANK,
  assigneeUids,
  formatDue,
  fullName,
  isOverdue,
  priorityMeta,
  subtaskBadge,
} = require("./helpers");
const { stripMarkers } = require("../mention-markers");
const { formatDateInput, monthGrid } = require("../list-edit");

const MAX_FILES = 2; // file chips shown before collapsing to a "+N" chip
const MAX_PEOPLE = 2; // assignee chips shown before collapsing to a "+N" chip

// The list is one flat scroller, not per-column, so it needs a window key that
// cannot collide with a real column key. Kept in step with the literal in
// index.js `_installCardWindow`.
const LIST_WINDOW_KEY = "__list";

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const cols = ui.getColumns();
  const sort = ui.getSort();
  const all = ui.getTopLevelTasks();
  const tasks = all.slice();
  const canEdit = ui.mayEditList();
  const edit = ui.getListEdit();

  const statusOrder = cols.reduce((a, c, i) => {
    a[c.key] = i;
    return a;
  }, {});

  const byDate = (k) => (a, b) => {
    const da = a[k] || "";
    const db = b[k] || "";
    if (!da && !db) return 0;
    if (!da) return 1; // nulls last
    if (!db) return -1;
    return da < db ? -1 : da > db ? 1 : 0;
  };
  if (sort) {
    const dir = sort.dir || 1;
    const cmp = {
      title: (a, b) =>
        String(a.title || "").localeCompare(String(b.title || "")),
      status: (a, b) =>
        (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99),
      priority: (a, b) =>
        (PRIORITY_RANK[a.priority] || 0) - (PRIORITY_RANK[b.priority] || 0),
      start: byDate("start_date"),
      due: byDate("due_date"),
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
  const shown = tasks.slice(0, ui.cardWindow(LIST_WINDOW_KEY));

  const arrow = (key) =>
    sort && sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "";

  const th = (key, label, extra) =>
    Skeletons.Note({
      className: `${pfx}__list-th${extra ? " " + extra : ""}`,
      content: (label || "") + (key ? arrow(key) : ""),
      attrOpt: key ? { "data-sortable": "1" } : undefined,
      bubble: 0,
      service: key ? "set-sort" : null,
      uiHandler: key ? [ui] : null,
      sortKey: key,
    });

  // Select-all reflects the rows that are BUILT: a box ticking tasks the user
  // cannot see (beyond the window) would delete them unseen.
  const selected = shown.filter((t) => ui.isListSelected(t.id)).length;
  const allState = !shown.length || !selected ? "0" : selected === shown.length ? "1" : "mixed";

  const checkbox = (state, service, taskId) =>
    Skeletons.Button.Svg({
      className: `${pfx}__list-check`,
      ico: "app-check",
      bubble: 0,
      service: canEdit ? service : null,
      uiHandler: canEdit ? [ui] : null,
      taskId,
      attrOpt: { "data-checked": state, "data-disabled": canEdit ? "0" : "1" },
    });

  const header = Skeletons.Box.X({
    className: `${pfx}__list-head`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__list-th-task`,
        kids: [checkbox(allState, "list-select-all"), th("title", LOCALE.TASK)],
      }),
      th("priority", LOCALE.PRIORITY_LEVEL),
      th("status", LOCALE.STATUS),
      th("start", LOCALE.START_DATE),
      th("due", LOCALE.DUE_DATE),
      th(null, LOCALE.DESCRIPTION),
      th(null, LOCALE.LINKED_FILES),
      th(null, LOCALE.ASSIGNEE),
      th(null, LOCALE.REPORTER),
    ],
  });

  const isOpen = (t, field) => !!(edit && edit.id === t.id && edit.field === field);

  // One editable cell. The cell box carries the service; its content is plain
  // Notes/boxes with no service, so a click anywhere in it resolves to
  // "list-edit" through onUiEvent's ancestor walk. `data-cell` is the anchor
  // the floating editor is positioned under.
  const cell = (t, field, kids, extra = "") =>
    Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-${field.replace("_", "-")}-cell${extra}`,
      bubble: 0,
      service: canEdit ? "list-edit" : null,
      uiHandler: canEdit ? [ui] : null,
      taskId: t.id,
      listField: field,
      attrOpt: {
        "data-cell": `${t.id}:${field}`,
        "data-editable": canEdit ? "1" : "0",
        "data-open": isOpen(t, field) ? "1" : "0",
      },
      kids: kids.filter(Boolean),
    });

  const caret = () =>
    Skeletons.Image.Svg({ ico: "apps-caret-down", className: `${pfx}__list-caret` });

  // Task cell — select checkbox + chevron + title, then the hover actions.
  // `sub` renders the indented child variant: no chevron (one level of
  // nesting) and no ＋ (a subtask cannot have children of its own).
  const titleCell = (t, sub) => {
    const { total } = ui.getSubtaskCount(t);
    // A task with no children still renders an inert spacer where the chevron
    // goes, or its title would sit a chevron-width left of every expandable
    // neighbour's. The live chevron needs bubble:0 of its own so expanding
    // does not also open the detail card.
    const chevron =
      !sub && total
        ? Skeletons.Button.Svg({
            className: `${pfx}__list-chevron`,
            ico: "caret-right",
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
    const actions = [
      // Figma has no other way into the full card once the title edits in
      // place, so the row keeps a quiet "open" affordance on hover.
      canEdit
        ? Skeletons.Button.Svg({
            className: `${pfx}__list-row-act`,
            ico: "expand",
            bubble: 0,
            service: "open-detail",
            uiHandler: [ui],
            taskId: t.id,
            tooltips: { content: LOCALE.OPEN, className: `${pfx}__tip` },
          })
        : null,
      canEdit && !sub
        ? Skeletons.Button.Svg({
            className: `${pfx}__list-row-act ${pfx}__list-row-add`,
            ico: "plus",
            bubble: 0,
            service: "add-child-task",
            uiHandler: [ui],
            taskId: t.id,
            tooltips: { content: LOCALE.CREATE_SUBTASK, className: `${pfx}__tip` },
          })
        : null,
    ].filter(Boolean);
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-title-cell`,
      attrOpt: { "data-sub": sub ? "1" : "0" },
      kids: [
        checkbox(ui.isListSelected(t.id) ? "1" : "0", "list-select", t.id),
        chevron,
        Skeletons.Box.X({
          className: `${pfx}__list-title-wrap`,
          bubble: 0,
          service: canEdit ? "list-edit" : null,
          uiHandler: canEdit ? [ui] : null,
          taskId: t.id,
          listField: "title",
          attrOpt: {
            "data-cell": `${t.id}:title`,
            "data-editable": canEdit ? "1" : "0",
            "data-open": isOpen(t, "title") ? "1" : "0",
          },
          kids: [
            Skeletons.Note({ className: `${pfx}__list-title`, content: t.title || "" }),
            sub ? null : subtaskBadge(ui, t, `${pfx}__list-subcount`),
          ].filter(Boolean),
        }),
        actions.length
          ? Skeletons.Box.X({ className: `${pfx}__list-row-acts`, kids: actions })
          : null,
      ].filter(Boolean),
    });
  };

  // Priority — filled solid pill; an outline "Priority ⌄" when unset.
  const priorityCell = (t) => {
    const hasP = !!t.priority;
    const p = priorityMeta(ui, t.priority);
    return cell(t, "priority", [
      Skeletons.Box.X({
        className: `${pfx}__list-priority`,
        attrOpt: { "data-priority": hasP ? t.priority : "none" },
        kids: [
          Skeletons.Note({
            className: `${pfx}__list-pill-label`,
            content: hasP ? LOCALE[p.label] || p.key : LOCALE.PRIORITY,
          }),
          hasP ? null : caret(),
        ].filter(Boolean),
      }),
    ]);
  };

  // Status — tinted pill with a solid dot; an outline "Status ⌄" when the row
  // names no column this board has.
  const statusCell = (t) => {
    const s = cols.find((c) => c.key === t.status);
    return cell(t, "status", [
      s
        ? Skeletons.Box.X({
            className: `${pfx}__list-status`,
            // Tint keyed on data-theme, not data-status: a custom column's
            // status IS its DB id, which no per-status rule can match.
            attrOpt: { "data-status": t.status || "", "data-theme": s.theme || "default" },
            kids: [
              Skeletons.Note({
                className: `${pfx}__list-status-dot`,
                styleOpt: { background: s.color || "#AEAEB2" },
              }),
              Skeletons.Note({
                className: `${pfx}__list-pill-label`,
                content: s.name || LOCALE[s.label] || s.key,
              }),
            ],
          })
        : Skeletons.Box.X({
            className: `${pfx}__list-status`,
            attrOpt: { "data-empty": "1" },
            kids: [
              Skeletons.Note({ className: `${pfx}__list-pill-label`, content: LOCALE.STATUS }),
              caret(),
            ],
          }),
    ]);
  };

  // Start / due — overlay pill; an outline "<label> 📅" when unset.
  const dateCell = (t, field, placeholder) => {
    const v = t[field];
    return cell(t, field, [
      v
        ? Skeletons.Note({
            className: `${pfx}__list-date`,
            content: formatDue(v),
            attrOpt: {
              "data-overdue":
                field === "due_date" && isOverdue(v) && !ui.isDoneStatus(t.status) ? "1" : "0",
            },
          })
        : Skeletons.Box.X({
            className: `${pfx}__list-date`,
            attrOpt: { "data-empty": "1" },
            kids: [
              Skeletons.Note({ className: `${pfx}__list-pill-label`, content: placeholder }),
              Skeletons.Image.Svg({ ico: "calendar", className: `${pfx}__list-date-ico` }),
            ],
          }),
    ]);
  };

  const descCell = (t) =>
    cell(t, "description", [
      Skeletons.Note({
        className: `${pfx}__list-desc`,
        content: stripMarkers(t.description || "").replace(/\s+/g, " ").trim(),
      }),
    ]);

  // Linked files — paperclip chips, then "+N".
  const filesCell = (t) => {
    const files = Array.isArray(t.linked_files) ? t.linked_files : [];
    const chips = files.slice(0, MAX_FILES).map((f) =>
      Skeletons.Box.X({
        className: `${pfx}__list-file`,
        kids: [
          Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__list-file-ico` }),
          Skeletons.Note({
            className: `${pfx}__list-file-name`,
            content: `${f.filename || ""}${f.extension ? "." + f.extension : ""}`,
          }),
        ],
      }),
    );
    const more = files.length - chips.length;
    if (more > 0) {
      chips.push(Skeletons.Note({ className: `${pfx}__list-file-more`, content: `+${more}` }));
    }
    return cell(t, "files", chips);
  };

  // A person chip — 17px avatar + name, and a ✕ when it can be removed.
  const personChip = (t, uid, removable) => {
    const m = ui.getMember(uid) || {};
    return Skeletons.Box.X({
      className: `${pfx}__list-person`,
      kids: [
        Skeletons.UserProfile({
          className: `${pfx}__list-person-avatar`,
          id: uid,
          firstname: m.firstname,
          lastname: m.lastname,
          auto_color: 1,
          live_status: 0,
        }),
        Skeletons.Note({
          className: `${pfx}__list-person-name`,
          content: m.firstname || fullName(m),
        }),
        removable
          ? Skeletons.Button.Svg({
              className: `${pfx}__list-person-x`,
              ico: "cross",
              bubble: 0,
              service: "list-unassign",
              uiHandler: [ui],
              taskId: t.id,
              memberUid: uid,
            })
          : null,
      ].filter(Boolean),
    });
  };

  const assigneeCell = (t) => {
    const uids = assigneeUids(t, ui);
    const chips = uids.slice(0, MAX_PEOPLE).map((u) => personChip(t, u, canEdit));
    const more = uids.length - chips.length;
    if (more > 0) {
      chips.push(Skeletons.Note({ className: `${pfx}__list-person-more`, content: `+${more}` }));
    }
    return cell(t, "assignees", chips);
  };

  const reporterCell = (t) => {
    const uid = t.reporter_uid || t.created_by;
    return cell(t, "reporter", [uid && ui.getMember(uid) ? personChip(t, uid, false) : null]);
  };

  const row = (t, sub) =>
    Skeletons.Box.X({
      className: `${pfx}__list-row`,
      bubble: 0,
      service: "open-detail",
      uiHandler: [ui],
      taskId: t.id,
      attrOpt: {
        // The panel finds a task's row by this (delete exit, index.js
        // _markTaskEls).
        "data-tid": t.id,
        "data-done": ui.isDoneStatus(t.status) ? "1" : "0",
        "data-selected": ui.isListSelected(t.id) ? "1" : "0",
        // The skin indents and de-emphasises child rows off this flag.
        "data-sub": sub ? "1" : "0",
      },
      kids: [
        titleCell(t, sub),
        priorityCell(t),
        statusCell(t),
        dateCell(t, "start_date", LOCALE.START_DATE),
        dateCell(t, "due_date", LOCALE.DUE_DATE),
        descCell(t),
        filesCell(t),
        assigneeCell(t),
        reporterCell(t),
      ],
    });

  // A parent followed by its children when expanded. Sub-rows use the same
  // columns as the parent — ordinary task rows, just indented.
  const rowGroup = (t) => {
    const kids = [row(t, false)];
    if (ui.isSubtasksOpen(t.id)) {
      ui.getSubtasks(t.id).forEach((s) => kids.push(row(s, true)));
    }
    return kids;
  };

  const footer = Skeletons.Box.X({
    className: `${pfx}__list-foot`,
    kids: [
      canEdit && ui.getListSelectedCount()
        ? Skeletons.Note({
            className: `${pfx}__list-remove`,
            content: LOCALE.REMOVE_SELECTED,
            bubble: 0,
            service: "list-remove-selected",
            uiHandler: [ui],
          })
        : null,
      Skeletons.Box.X({
        className: `${pfx}__list-count`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__list-count-text`,
            content: `${Math.min(shown.length, all.length)} ${LOCALE.OF} ${all.length}`,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__list-reload`,
            ico: "refresh-view",
            bubble: 0,
            service: "list-reload",
            uiHandler: [ui],
          }),
        ],
      }),
    ].filter(Boolean),
  });

  return Skeletons.Box.Y({
    className: `${pfx}__list-wrap`,
    // Phone flag — the skin drops low-priority columns + tightens widths so the
    // table fits without a horizontal scroll (see `[data-mobile="1"]` in skin).
    attrOpt: { "data-mobile": Visitor.isMobile() ? "1" : "0" },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__list`,
        kids: [
          header,
          Skeletons.Box.Y({
            className: `${pfx}__list-body`,
            // WINDOWED, for the same reason the board's columns are — see the
            // note at skeleton/index.js's taskCard map. `tasks.length` still
            // gates the empty state, so a non-empty list can never render the
            // "no tasks" note.
            kids: tasks.length
              ? shown.flatMap(rowGroup)
              : [Skeletons.Note({ className: `${pfx}__list-empty`, content: LOCALE.NO_TASKS })],
          }),
        ],
      }),
      footer,
      edit ? editorLayer(ui, edit) : null,
    ].filter(Boolean),
  });
};

// ── The floating editor ─────────────────────────────────────────────────
// Positioned by index.js (_positionListPop) under the anchor cell. The panel
// rebuilds it from `ui.getListEdit()` on every repaint, so it always shows
// the state the panel holds.
function editorLayer(ui, edit) {
  const pfx = ui.fig.family;
  const task = ui.getTask(edit.id);
  if (!task) return null;
  const build = {
    title: textEditor,
    description: textEditor,
    priority: priorityMenu,
    status: statusMenu,
    start_date: datePicker,
    due_date: datePicker,
    files: filesPicker,
    assignees: peoplePicker,
    reporter: peoplePicker,
  }[edit.field];
  if (!build) return null;
  return Skeletons.Box.Y({
    className: `${pfx}__list-pop`,
    attrOpt: {
      "data-anchor": `${edit.id}:${edit.field}`,
      "data-kind": edit.field,
    },
    kids: build(ui, edit, task, pfx),
  });
}

const iconBtn = (pfx, ico, service, ui) =>
  Skeletons.Button.Svg({
    className: `${pfx}__list-pop-btn`,
    ico,
    bubble: 0,
    service,
    uiHandler: [ui],
  });

// Title / description: the input sits in a Primary/40 box with ✓ and ✕.
// Enter saves (Shift+Enter is a new line in the description), Esc cancels —
// both wired natively by index.js (_wireListEditor).
function textEditor(ui, edit, task, pfx) {
  const multi = edit.field === "description";
  const input = (multi ? Skeletons.Textarea : Skeletons.Entry)({
    className: `${pfx}__list-pop-input`,
    name: "list-edit-input",
    // The value captured when the editor OPENED, not the live row: a peer's
    // write to this field must not rebuild the input under the user's typing.
    value: edit.initial != null ? edit.initial : multi ? task.description || "" : task.title || "",
    placeholder: multi ? LOCALE.DESCRIPTION : LOCALE.TASK,
    rows: multi ? 2 : undefined,
  });
  return [
    Skeletons.Box.X({
      className: `${pfx}__list-pop-text`,
      kids: [
        input,
        Skeletons.Box.X({
          className: `${pfx}__list-pop-btns`,
          kids: [
            iconBtn(pfx, "app-check", "list-edit-save", ui),
            iconBtn(pfx, "cross", "list-edit-cancel", ui),
          ],
        }),
      ],
    }),
    edit.error
      ? Skeletons.Note({
          className: `${pfx}__list-pop-error`,
          content:
            edit.error === "too-long"
              ? LOCALE.TASK_TITLE_TOO_LONG
              : LOCALE.TASK_TITLE_REQUIRED,
        })
      : null,
  ].filter(Boolean);
}

const menuItem = (pfx, { label, color, selected, service, ui, extra }) =>
  Skeletons.Box.X({
    className: `${pfx}__list-pop-item`,
    bubble: 0,
    service,
    uiHandler: [ui],
    attrOpt: { "data-selected": selected ? "1" : "0" },
    ...extra,
    kids: [
      Skeletons.Note({ className: `${pfx}__list-pop-dot`, styleOpt: { background: color } }),
      Skeletons.Note({ className: `${pfx}__list-pop-label`, content: label }),
    ],
  });

function priorityMenu(ui, edit, task, pfx) {
  return ui.getPriorities().map((p) =>
    menuItem(pfx, {
      label: LOCALE[p.label] || p.key,
      color: p.color,
      selected: task.priority === p.key,
      service: "list-set-priority",
      ui,
      extra: { taskPriority: p.key },
    }),
  );
}

function statusMenu(ui, edit, task, pfx) {
  return ui.getColumns().map((c) =>
    menuItem(pfx, {
      label: c.name || LOCALE[c.label] || c.key,
      color: c.color || "#D9D9D9",
      selected: task.status === c.key,
      service: "list-set-status",
      ui,
      extra: { taskStatus: c.key },
    }),
  );
}

// Start / due date — label, typed dd/mm/yyyy field, month grid, Cancel/Done.
function datePicker(ui, edit, task, pfx) {
  const value = edit.value || "";
  const month = edit.month;
  const today = Dayjs().format("YYYY-MM-DD");
  const first = Dayjs(`${month}-01`);
  const monthLabel = first.format(first.year() === Dayjs().year() ? "MMMM" : "MMMM YYYY");
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    Skeletons.Note({ className: `${pfx}__list-cal-wd`, content: Dayjs().day(i).format("dd") }),
  );
  const weeks = monthGrid(month).map((week) =>
    Skeletons.Box.X({
      className: `${pfx}__list-cal-week`,
      kids: week.map((d) =>
        d
          ? Skeletons.Note({
              className: `${pfx}__list-cal-day`,
              content: String(+d.slice(8)),
              bubble: 0,
              service: "list-date-pick",
              uiHandler: [ui],
              dateValue: d,
              attrOpt: {
                "data-selected": d === value ? "1" : "0",
                "data-today": d === today ? "1" : "0",
              },
            })
          : Skeletons.Note({ className: `${pfx}__list-cal-day`, attrOpt: { "data-empty": "1" } }),
      ),
    }),
  );
  return [
    Skeletons.Note({
      className: `${pfx}__list-pop-title`,
      content: edit.field === "start_date" ? LOCALE.START_DATE : LOCALE.DUE_DATE,
    }),
    Skeletons.Box.X({
      className: `${pfx}__list-date-field`,
      kids: [
        Skeletons.Entry({
          className: `${pfx}__list-date-input`,
          name: "list-date-input",
          value: formatDateInput(value),
          placeholder: "dd/mm/yyyy",
        }),
        Skeletons.Image.Svg({ ico: "calendar", className: `${pfx}__list-date-ico` }),
      ],
    }),
    Skeletons.Box.X({
      className: `${pfx}__list-cal-head`,
      kids: [
        Skeletons.Button.Svg({
          className: `${pfx}__list-cal-nav`,
          ico: "caret-left",
          bubble: 0,
          service: "list-date-step",
          uiHandler: [ui],
          stepDir: -1,
        }),
        Skeletons.Note({ className: `${pfx}__list-cal-month`, content: monthLabel }),
        Skeletons.Button.Svg({
          className: `${pfx}__list-cal-nav`,
          ico: "caret-right",
          bubble: 0,
          service: "list-date-step",
          uiHandler: [ui],
          stepDir: 1,
        }),
      ],
    }),
    Skeletons.Box.X({ className: `${pfx}__list-cal-week ${pfx}__list-cal-wds`, kids: weekdays }),
    Skeletons.Box.Y({ className: `${pfx}__list-cal-grid`, kids: weeks }),
    Skeletons.Box.X({
      className: `${pfx}__list-cal-foot`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__list-cal-cancel`,
          content: LOCALE.CANCEL,
          bubble: 0,
          service: "list-edit-cancel",
          uiHandler: [ui],
        }),
        Skeletons.Box.X({
          className: `${pfx}__list-cal-done`,
          bubble: 0,
          service: "list-date-done",
          uiHandler: [ui],
          kids: [
            Skeletons.Image.Svg({ ico: "app-check", className: `${pfx}__list-cal-done-ico` }),
            Skeletons.Note({ className: `${pfx}__list-pill-label`, content: LOCALE.DONE }),
          ],
        }),
      ],
    }),
  ];
}

const searchBar = (pfx, ui) =>
  Skeletons.Box.X({
    className: `${pfx}__list-pop-search`,
    kids: [
      Skeletons.Image.Svg({ ico: "magnifying-glass", className: `${pfx}__list-pop-search-ico` }),
      // interactive: read-only filtering, never a write — see the note on
      // Entry commit+interactive firing per keystroke.
      Skeletons.Entry({
        className: `${pfx}__list-pop-search-input`,
        name: "list-pop-search",
        placeholder: LOCALE.SEARCH_DOTS,
        interactive: 1,
        service: "list-pop-search",
        uiHandler: [ui],
      }),
    ],
  });

// Linked files — "Link files", search, the linkable files with a checkbox.
function filesPicker(ui, edit, task, pfx) {
  return [
    Skeletons.Note({ className: `${pfx}__list-pop-title`, content: LOCALE.LINK_FILES }),
    searchBar(pfx, ui),
    Skeletons.Box.Y({
      className: `${pfx}__list-pop-list`,
      sys_pn: "list-pop-results",
      kids: buildFileResults(ui, edit, task),
    }),
  ];
}

function buildFileResults(ui, edit, task) {
  const pfx = ui.fig.family;
  const linked = new Set(
    (Array.isArray(task.linked_files) ? task.linked_files : []).map((f) => String(f.file_nid)),
  );
  const rows = edit.files || [];
  if (edit.loading && !rows.length) {
    return [Skeletons.Note({ className: `${pfx}__list-pop-empty`, content: LOCALE.LOADING })];
  }
  if (!rows.length) {
    return [Skeletons.Note({ className: `${pfx}__list-pop-empty`, content: LOCALE.NO_FILES })];
  }
  return rows.map((r) => {
    const on = linked.has(String(r.nid));
    return Skeletons.Box.X({
      className: `${pfx}__list-pop-item ${pfx}__list-pop-file`,
      bubble: 0,
      service: "list-toggle-file",
      uiHandler: [ui],
      fileNid: r.nid,
      attrOpt: { "data-selected": on ? "1" : "0" },
      kids: [
        Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__list-pop-file-ico` }),
        Skeletons.Note({
          className: `${pfx}__list-pop-label`,
          content: `${r.filename || ""}${r.ext ? "." + r.ext : ""}`,
        }),
        Skeletons.Note({
          className: `${pfx}__list-pop-box`,
          attrOpt: { "data-checked": on ? "1" : "0" },
        }),
      ],
    });
  });
}

// Assignees (multi, stays open) and Reporter (single, closes on pick).
function peoplePicker(ui, edit, task, pfx) {
  const multi = edit.field === "assignees";
  const chosen = multi
    ? new Set(assigneeUids(task, ui).map(String))
    : new Set([String(task.reporter_uid || task.created_by || "")]);
  const members = (ui.getMembers() || []).filter((m) => m && (m.id || m.uid));
  return [
    Skeletons.Note({
      className: `${pfx}__list-pop-title`,
      content: multi ? LOCALE.ASSIGNEES : LOCALE.REPORTERS,
    }),
    searchBar(pfx, ui),
    Skeletons.Box.Y({
      className: `${pfx}__list-pop-list`,
      kids: members.length
        ? members.map((m) => {
            const uid = m.id || m.uid;
            const name = fullName(m);
            return Skeletons.Box.X({
              className: `${pfx}__list-pop-item ${pfx}__list-pop-member`,
              bubble: 0,
              service: multi ? "list-toggle-assignee" : "list-set-reporter",
              uiHandler: [ui],
              memberUid: uid,
              attrOpt: {
                "data-selected": chosen.has(String(uid)) ? "1" : "0",
                // Lower-cased once here; the search box filters on it in place.
                "data-name": name.toLowerCase(),
              },
              kids: [
                Skeletons.UserProfile({
                  className: `${pfx}__list-pop-avatar`,
                  id: uid,
                  firstname: m.firstname,
                  lastname: m.lastname,
                  auto_color: 1,
                  live_status: 0,
                }),
                Skeletons.Note({ className: `${pfx}__list-pop-label`, content: name }),
                Skeletons.Image.Svg({ ico: "app-check", className: `${pfx}__list-pop-tick` }),
              ],
            });
          })
        : [Skeletons.Note({ className: `${pfx}__list-pop-empty`, content: LOCALE.NO_MEMBERS_FOUND })],
    }),
  ];
}

module.exports.buildFileResults = buildFileResults;
