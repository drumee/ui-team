// Summary view — a Jira-style dashboard computed entirely client-side from the
// folder-scoped task set (no server aggregation in v1). Bars/percentages are
// plain CSS (div widths) — no chart dependency. Globals Skeletons/LOCALE/Dayjs.
const { fullName, assigneeUids, isOverdue } = require("./helpers");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const tasks = ui.getFilteredTasks();
  const cols = ui.getColumns();
  const priorities = ui.getPriorities();
  const total = tasks.length;

  const byStatus = {};
  cols.forEach((c) => (byStatus[c.key] = 0));
  const byPriority = {};
  priorities.forEach((p) => (byPriority[p.key] = 0));
  const byAssignee = {};
  let unassigned = 0;
  let overdue = 0;
  let dueSoon = 0;
  let weekEnd = null;
  try {
    weekEnd = Dayjs().add(7, "day");
  } catch {
    weekEnd = null;
  }

  tasks.forEach((t) => {
    if (byStatus[t.status] != null) byStatus[t.status]++;
    if (byPriority[t.priority] != null) byPriority[t.priority]++;
    const uids = assigneeUids(t);
    if (!uids.length) unassigned++;
    else uids.forEach((u) => (byAssignee[u] = (byAssignee[u] || 0) + 1));
    if (t.status !== "complete" && t.due_date) {
      if (isOverdue(t.due_date)) overdue++;
      else if (weekEnd) {
        try {
          const d = Dayjs(t.due_date);
          if (d.isBefore(weekEnd, "day") || d.isSame(weekEnd, "day")) dueSoon++;
        } catch {
          /* ignore unparseable date */
        }
      }
    }
  });

  const done = byStatus.complete || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const track = (frac, color) =>
    Skeletons.Box.X({
      className: `${pfx}__sum-bar-track`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__sum-bar-fill`,
          styleOpt: {
            width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`,
            background: color,
          },
        }),
      ],
    });

  const bar = (label, count, color, max) =>
    Skeletons.Box.X({
      className: `${pfx}__sum-bar-row`,
      kids: [
        Skeletons.Note({ className: `${pfx}__sum-bar-label`, content: label }),
        track(max ? count / max : 0, color),
        Skeletons.Note({
          className: `${pfx}__sum-bar-count`,
          content: String(count),
        }),
      ],
    });

  const card = (title, kids) =>
    Skeletons.Box.Y({
      className: `${pfx}__sum-card`,
      kids: [
        Skeletons.Note({ className: `${pfx}__sum-card-title`, content: title }),
        ...kids,
      ],
    });

  if (!total) {
    return Skeletons.Box.Y({
      className: `${pfx}__summary`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__sum-empty`,
          content: LOCALE.NO_TASKS,
        }),
      ],
    });
  }

  const completion = card(LOCALE.TASK_SUMMARY_COMPLETION, [
    Skeletons.Box.X({
      className: `${pfx}__sum-completion`,
      kids: [
        Skeletons.Note({ className: `${pfx}__sum-pct`, content: `${pct}%` }),
        Skeletons.Note({
          className: `${pfx}__sum-pct-sub`,
          content: `${done}/${total}`,
        }),
      ],
    }),
    track(total ? done / total : 0, "#54B684"),
  ]);

  const maxStatus = Math.max(1, ...cols.map((c) => byStatus[c.key] || 0));
  const statusCard = card(
    LOCALE.TASK_SUMMARY_BY_STATUS,
    cols.map((c) =>
      bar(LOCALE[c.label] || c.key, byStatus[c.key] || 0, c.color, maxStatus),
    ),
  );

  const maxPrio = Math.max(1, ...priorities.map((p) => byPriority[p.key] || 0));
  const priorityCard = card(
    LOCALE.TASK_SUMMARY_BY_PRIORITY,
    priorities.map((p) =>
      bar(LOCALE[p.label] || p.key, byPriority[p.key] || 0, p.color, maxPrio),
    ),
  );

  const work = Object.keys(byAssignee)
    .map((uid) => ({ uid, count: byAssignee[uid] }))
    .sort((a, b) => b.count - a.count);
  const maxWork = Math.max(1, unassigned, ...work.map((e) => e.count));
  // All workload rows share one structure so their bars align — Unassigned uses
  // a neutral placeholder avatar.
  const workRow = (avatarNode, label, count, color) =>
    Skeletons.Box.X({
      className: `${pfx}__sum-work-row`,
      kids: [
        avatarNode,
        Skeletons.Note({ className: `${pfx}__sum-bar-label`, content: label }),
        track(count / maxWork, color),
        Skeletons.Note({
          className: `${pfx}__sum-bar-count`,
          content: String(count),
        }),
      ],
    });
  const workRows = work.map((e) => {
    const m = ui.getMember(e.uid) || {};
    return workRow(
      Skeletons.UserProfile({
        className: `${pfx}__sum-work-avatar`,
        id: e.uid,
        firstname: m.firstname,
        lastname: m.lastname,
        auto_color: 1,
        live_status: 0,
      }),
      fullName(m) || e.uid,
      e.count,
      "#65D0EA",
    );
  });
  if (unassigned) {
    workRows.push(
      workRow(
        Skeletons.Note({
          className: `${pfx}__sum-work-avatar ${pfx}__sum-work-avatar--none`,
        }),
        LOCALE.UNASSIGNED,
        unassigned,
        "#AEAEB2",
      ),
    );
  }
  const workloadCard = card(
    LOCALE.TASK_SUMMARY_WORKLOAD,
    workRows.length
      ? workRows
      : [Skeletons.Note({ className: `${pfx}__sum-empty`, content: "—" })],
  );

  const stat = (num, label, tone) =>
    Skeletons.Box.Y({
      className: `${pfx}__sum-stat`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__sum-stat-num`,
          content: String(num),
          attrOpt: tone ? { "data-tone": tone } : undefined,
        }),
        Skeletons.Note({ className: `${pfx}__sum-stat-label`, content: label }),
      ],
    });
  const dueCard = card(LOCALE.TASK_SUMMARY_DUE, [
    Skeletons.Box.X({
      className: `${pfx}__sum-stat-row`,
      kids: [
        stat(overdue, LOCALE.TASK_SUMMARY_OVERDUE, "overdue"),
        stat(dueSoon, LOCALE.TASK_SUMMARY_DUE_SOON),
        stat(total, LOCALE.TASK_SUMMARY_TOTAL),
      ],
    }),
  ]);

  return Skeletons.Box.Y({
    className: `${pfx}__summary`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__sum-grid`,
        kids: [completion, dueCard],
      }),
      Skeletons.Box.X({
        className: `${pfx}__sum-grid`,
        kids: [statusCard, priorityCard],
      }),
      workloadCard,
    ],
  });
};
