// Project Health view — a dashboard computed client-side from the folder-scoped
// task set, matching the Figma "Project Health" design (node 2081-43289):
//   1. Four headline stat cards (created / completed / avg cycle / overdue, 7d)
//   2. Status overview — a CSS conic-gradient donut + legend with counts & %
//   3. Recent activity — folder-scoped event feed (server: task.activity)
//   4. Priority breakdown — vertical CSS bar chart + colored legend
//   5. Team workload — horizontal CSS bars per assignee
// No chart dependency: the donut is a conic-gradient, bars are sized divs.
// Globals Skeletons/LOCALE/Dayjs are injected at runtime.
const { fullName, assigneeUids, isOverdue, priorityMeta } = require("./helpers");

const WEEK_SECONDS = 7 * 24 * 60 * 60;

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const tasks = ui.getFilteredTasks();
  const cols = ui.getColumns();
  const priorities = ui.getPriorities();
  const total = tasks.length;

  // ── Aggregate ────────────────────────────────────────────────────────────
  const byStatus = {};
  cols.forEach((c) => (byStatus[c.key] = 0));
  const byPriority = {};
  priorities.forEach((p) => (byPriority[p.key] = 0));
  const byAssignee = {};
  let unassigned = 0;
  let overdue = 0;
  let created7d = 0;
  let completed7d = 0;
  let cycleSum = 0; // sum of (completed_at − ctime) in seconds, completed tasks
  let cycleCount = 0;

  let nowSec = 0;
  try {
    nowSec = Math.floor(Dayjs().valueOf() / 1000);
  } catch {
    nowSec = 0;
  }
  const weekAgo = nowSec ? nowSec - WEEK_SECONDS : 0;

  tasks.forEach((t) => {
    if (byStatus[t.status] != null) byStatus[t.status]++;
    if (byPriority[t.priority] != null) byPriority[t.priority]++;
    const uids = assigneeUids(t);
    if (!uids.length) unassigned++;
    else uids.forEach((u) => (byAssignee[u] = (byAssignee[u] || 0) + 1));
    if (t.status !== "complete" && t.due_date && isOverdue(t.due_date)) overdue++;

    const ct = Number(t.ctime) || 0;
    if (ct && weekAgo && ct >= weekAgo) created7d++;
    const done = Number(t.completed_at) || 0;
    if (t.status === "complete" && done) {
      if (weekAgo && done >= weekAgo) completed7d++;
      if (ct && done >= ct) {
        cycleSum += done - ct;
        cycleCount++;
      }
    }
  });

  const avgDays = cycleCount
    ? Math.round((cycleSum / cycleCount / 86400) * 10) / 10
    : 0;

  // ── Shared builders ──────────────────────────────────────────────────────
  const card = (title, sub, body, expand) =>
    Skeletons.Box.Y({
      className: `${pfx}__health-card`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__health-card-head`,
          kids: [
            Skeletons.Box.Y({
              className: `${pfx}__health-card-heading`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__health-card-title`,
                  content: title,
                }),
                Skeletons.Note({
                  className: `${pfx}__health-card-sub`,
                  content: sub,
                }),
              ],
            }),
            expand
              ? Skeletons.Image.Svg({
                  ico: "expand",
                  className: `${pfx}__health-card-expand`,
                })
              : null,
          ],
        }),
        ...body,
      ],
    });

  if (!total) {
    return Skeletons.Box.Y({
      className: `${pfx}__summary`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__health-empty`,
          content: LOCALE.NO_TASKS,
        }),
      ],
    });
  }

  // ── 1. Headline stat cards ─────────────────────────────────────────────────
  const statCard = (ico, value, label) =>
    Skeletons.Box.X({
      className: `${pfx}__health-stat-card`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__health-stat-ico`,
          kids: [Skeletons.Image.Svg({ ico })],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__health-stat-text`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__health-stat-value`,
              content: value,
            }),
            Skeletons.Note({
              className: `${pfx}__health-stat-sub`,
              content: label,
            }),
          ],
        }),
      ],
    });
  const last7 = LOCALE.TASK_HEALTH_LAST_7_DAYS;
  const statsRow = Skeletons.Box.X({
    className: `${pfx}__health-stats`,
    kids: [
      statCard(
        "editbox_list-plus",
        `${created7d} ${LOCALE.TASK_HEALTH_CREATED}`,
        last7,
      ),
      statCard(
        "apps-check-circle",
        `${completed7d} ${LOCALE.TASK_HEALTH_COMPLETED}`,
        last7,
      ),
      statCard(
        "apps-clock",
        `${avgDays} ${LOCALE.TASK_HEALTH_PER_TASK}`,
        last7,
      ),
      statCard("calendar", `${overdue} ${LOCALE.TASK_HEALTH_OVERDUE}`, last7),
    ],
  });

  // ── 2. Status overview (conic-gradient donut + legend) ─────────────────────
  let acc = 0;
  const segs = [];
  cols.forEach((c) => {
    const v = byStatus[c.key] || 0;
    if (v <= 0) return;
    const start = Math.round((acc / total) * 100);
    acc += v;
    const end = Math.round((acc / total) * 100);
    segs.push(`${c.color} ${start}% ${end}%`);
  });
  const gradient = segs.length
    ? `conic-gradient(${segs.join(", ")})`
    : "conic-gradient(#ececf1 0% 100%)";
  const donut = Skeletons.Box.Y({
    className: `${pfx}__health-donut`,
    styleOpt: { background: gradient },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__health-donut-hole`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__health-donut-total`,
            content: String(total),
          }),
          Skeletons.Note({
            className: `${pfx}__health-donut-label`,
            content: LOCALE.TASK_HEALTH_TOTAL_ITEMS,
          }),
        ],
      }),
    ],
  });
  const statusLegend = Skeletons.Box.Y({
    className: `${pfx}__health-legend`,
    kids: cols.map((c) => {
      const v = byStatus[c.key] || 0;
      const pct = total ? Math.round((v / total) * 100) : 0;
      return Skeletons.Box.X({
        className: `${pfx}__health-legend-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__health-legend-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__health-legend-dot`,
                styleOpt: { background: c.color },
              }),
              Skeletons.Note({
                className: `${pfx}__health-legend-name`,
                content: `${LOCALE[c.label] || c.key}: ${v}`,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__health-legend-pct`,
            content: `${pct}%`,
          }),
        ],
      });
    }),
  });
  const statusCard = card(
    LOCALE.TASK_HEALTH_STATUS_TITLE,
    LOCALE.TASK_HEALTH_STATUS_SUB,
    [
      Skeletons.Box.X({
        className: `${pfx}__health-donut-wrap`,
        kids: [donut, statusLegend],
      }),
    ],
  );

  // ── 3. Recent activity feed ────────────────────────────────────────────────
  const verbs = {
    create: LOCALE.TASK_ACT_CREATE,
    update: LOCALE.TASK_ACT_UPDATE,
    status: LOCALE.TASK_ACT_STATUS,
    complete: LOCALE.TASK_ACT_COMPLETE,
    assignee: LOCALE.TASK_ACT_ASSIGNEE,
    link_file: LOCALE.TASK_ACT_LINK_FILE,
    comment: LOCALE.TASK_ACT_COMMENT,
  };
  const activity = ui.getActivity ? ui.getActivity() : [];
  const activityRows = activity.map((r) => {
    const m = ui.getMember(r.actor_uid) || {};
    const name = fullName(m) || r.actor_uid;
    const meta = r.meta || {};
    const title = r.task_title || meta.title || "";
    const pm = priorityMeta(ui, r.task_priority);
    let when = "";
    try {
      when = Dayjs((Number(r.ctime) || 0) * 1000).fromNow();
    } catch {
      when = "";
    }
    return Skeletons.Box.X({
      className: `${pfx}__health-act-row`,
      kids: [
        Skeletons.UserProfile({
          className: `${pfx}__health-act-avatar`,
          id: r.actor_uid,
          firstname: m.firstname,
          lastname: m.lastname,
          auto_color: 1,
          live_status: 0,
        }),
        Skeletons.Box.Y({
          className: `${pfx}__health-act-body`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__health-act-line`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}__health-act-actor`,
                  content: name,
                }),
                Skeletons.Note({
                  className: `${pfx}__health-act-verb`,
                  content: verbs[r.action] || verbs.update,
                }),
                title
                  ? Skeletons.Box.X({
                      className: `${pfx}__health-act-pill`,
                      kids: [
                        Skeletons.Note({
                          className: `${pfx}__health-act-dot`,
                          styleOpt: { background: pm.color },
                        }),
                        Skeletons.Note({
                          className: `${pfx}__health-act-title`,
                          content: title,
                        }),
                      ],
                    })
                  : null,
              ],
            }),
            Skeletons.Note({
              className: `${pfx}__health-act-time`,
              content: when,
            }),
          ],
        }),
      ],
    });
  });
  const activityCard = card(
    LOCALE.TASK_HEALTH_ACTIVITY_TITLE,
    LOCALE.TASK_HEALTH_ACTIVITY_SUB,
    [
      activityRows.length
        ? Skeletons.Box.Y({
            className: `${pfx}__health-act-list`,
            kids: activityRows,
          })
        : Skeletons.Note({
            className: `${pfx}__health-empty`,
            content: LOCALE.TASK_HEALTH_NO_ACTIVITY,
          }),
    ],
    true,
  );

  // ── 4. Priority breakdown (vertical bar chart + legend) ─────────────────────
  // Most-important first (urgent → low) to match the Figma legend order.
  const prioOrder = priorities.slice().reverse();
  const maxPrio = Math.max(1, ...prioOrder.map((p) => byPriority[p.key] || 0));
  const bars = Skeletons.Box.X({
    className: `${pfx}__health-bars`,
    kids: prioOrder.map((p) => {
      const v = byPriority[p.key] || 0;
      const h = Math.round((v / maxPrio) * 100);
      return Skeletons.Box.Y({
        className: `${pfx}__health-bar-col`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__health-bar-val`,
            content: String(v),
          }),
          Skeletons.Box.Y({
            className: `${pfx}__health-bar`,
            styleOpt: { height: `${Math.max(h, 2)}%`, background: p.color },
          }),
        ],
      });
    }),
  });
  const prioLegend = Skeletons.Box.X({
    className: `${pfx}__health-legend-inline`,
    kids: prioOrder.map((p) =>
      Skeletons.Box.X({
        className: `${pfx}__health-legend-chip`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__health-legend-dot`,
            styleOpt: { background: p.color },
          }),
          Skeletons.Note({
            className: `${pfx}__health-legend-name`,
            content: LOCALE[p.label] || p.key,
          }),
        ],
      }),
    ),
  });
  const priorityCard = card(
    LOCALE.TASK_HEALTH_PRIORITY_TITLE,
    LOCALE.TASK_HEALTH_PRIORITY_SUB,
    [bars, prioLegend],
  );

  // ── 5. Team workload (horizontal bars per assignee) ─────────────────────────
  const work = Object.keys(byAssignee)
    .map((uid) => ({ uid, count: byAssignee[uid] }))
    .sort((a, b) => b.count - a.count);
  const maxWork = Math.max(1, unassigned, ...work.map((e) => e.count));
  const workRow = (avatarNode, label, count) =>
    Skeletons.Box.X({
      className: `${pfx}__health-work-row`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__health-work-who`,
          kids: [
            avatarNode,
            Skeletons.Note({
              className: `${pfx}__health-work-name`,
              content: label,
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__health-work-track`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__health-work-fill`,
              styleOpt: { width: `${Math.round((count / maxWork) * 100)}%` },
            }),
          ],
        }),
        Skeletons.Note({
          className: `${pfx}__health-work-count`,
          content: String(count),
        }),
      ],
    });
  const workRows = work.map((e) => {
    const m = ui.getMember(e.uid) || {};
    return workRow(
      Skeletons.UserProfile({
        className: `${pfx}__health-work-avatar`,
        id: e.uid,
        firstname: m.firstname,
        lastname: m.lastname,
        auto_color: 1,
        live_status: 0,
      }),
      fullName(m) || e.uid,
      e.count,
    );
  });
  if (unassigned) {
    workRows.push(
      workRow(
        Skeletons.Note({
          className: `${pfx}__health-work-avatar ${pfx}__health-work-avatar--none`,
        }),
        LOCALE.UNASSIGNED,
        unassigned,
      ),
    );
  }
  const workloadCard = card(
    LOCALE.TASK_HEALTH_WORKLOAD_TITLE,
    LOCALE.TASK_HEALTH_WORKLOAD_SUB,
    [
      workRows.length
        ? Skeletons.Box.Y({
            className: `${pfx}__health-work-list`,
            kids: workRows,
          })
        : Skeletons.Note({ className: `${pfx}__health-empty`, content: "—" }),
    ],
  );

  return Skeletons.Box.Y({
    className: `${pfx}__summary`,
    kids: [
      statsRow,
      Skeletons.Box.X({
        className: `${pfx}__health-row`,
        kids: [statusCard, activityCard],
      }),
      Skeletons.Box.X({
        className: `${pfx}__health-row`,
        kids: [priorityCard, workloadCard],
      }),
    ],
  });
};
