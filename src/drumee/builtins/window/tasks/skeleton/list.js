// List view — a flat, client-side-sortable table over the folder-scoped task
// set. Row click opens the same detail panel as the board. Globals
// Skeletons/LOCALE are injected at runtime.
const {
  PRIORITY_RANK,
  assigneeUids,
  formatDue,
  isOverdue,
  priorityMeta,
  statusMeta,
} = require("./helpers");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const cols = ui.getColumns();
  const sort = ui.getSort();
  const tasks = ui.getFilteredTasks().slice();

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

  const th = (key, label, sortable) =>
    Skeletons.Note({
      className: `${pfx}__list-th`,
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
      th("title", LOCALE.TASK_TITLE, true),
      th("status", LOCALE.STATUS, true),
      th("priority", LOCALE.PRIORITY, true),
      Skeletons.Note({ className: `${pfx}__list-th`, content: LOCALE.ASSIGNEE }),
      th("due", LOCALE.DUE_DATE, true),
    ],
  });

  const assigneeCell = (t) => {
    const uids = assigneeUids(t);
    if (!uids.length)
      return Skeletons.Note({
        className: `${pfx}__list-cell ${pfx}__list-assignee-empty`,
        content: "—",
      });
    return Skeletons.Box.X({
      className: `${pfx}__list-cell ${pfx}__list-assignees`,
      kids: uids.slice(0, 4).map((uid) => {
        const m = ui.getMember(uid) || {};
        return Skeletons.UserProfile({
          className: `${pfx}__list-avatar`,
          id: uid,
          firstname: m.firstname,
          lastname: m.lastname,
          auto_color: 1,
          live_status: 0,
        });
      }),
    });
  };

  const row = (t) => {
    const s = statusMeta(ui, t.status);
    const p = priorityMeta(ui, t.priority);
    return Skeletons.Box.X({
      className: `${pfx}__list-row`,
      bubble: 0,
      service: "open-detail",
      uiHandler: [ui],
      taskId: t.id,
      kids: [
        Skeletons.Note({
          className: `${pfx}__list-cell ${pfx}__list-title`,
          content: t.title || "",
        }),
        Skeletons.Box.X({
          className: `${pfx}__list-cell ${pfx}__list-status-cell`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__list-status`,
              content: LOCALE[s.label] || s.key,
              styleOpt: { color: s.color, borderColor: s.color },
            }),
          ],
        }),
        Skeletons.Note({
          className: `${pfx}__list-cell ${pfx}__list-priority`,
          content: LOCALE[p.label] || p.key,
          styleOpt: { color: p.color },
        }),
        assigneeCell(t),
        Skeletons.Note({
          className: `${pfx}__list-cell ${pfx}__list-due`,
          content: formatDue(t.due_date),
          attrOpt: { "data-overdue": isOverdue(t.due_date) ? "1" : "0" },
        }),
      ],
    });
  };

  return Skeletons.Box.Y({
    className: `${pfx}__list`,
    kids: [
      header,
      Skeletons.Box.Y({
        className: `${pfx}__list-body`,
        kids: tasks.length
          ? tasks.map(row)
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
