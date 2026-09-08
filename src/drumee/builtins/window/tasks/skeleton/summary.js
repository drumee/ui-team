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
  // getFilteredTasks (not getTopLevelTasks) is deliberate and the ONLY correct
  // use of it: Project Health counts a subtask as its own work item in every
  // aggregate — total, status donut, priority split, team workload. That means
  // this view's totals legitimately exceed the number of cards on the board.
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
  let durSum = 0; // sum of task durations in days (start_date → due_date, inclusive)
  let durCount = 0;

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
    // Ex-members don't count as assignees — their tasks are unassigned now.
    const uids = assigneeUids(t, ui);
    if (!uids.length) unassigned++;
    else uids.forEach((u) => (byAssignee[u] = (byAssignee[u] || 0) + 1));
    if (!ui.isDoneStatus(t.status) && t.due_date && isOverdue(t.due_date)) overdue++;

    const ct = Number(t.ctime) || 0;
    if (ct && weekAgo && ct >= weekAgo) created7d++;
    const done = Number(t.completed_at) || 0;
    if (ui.isDoneStatus(t.status) && done && weekAgo && done >= weekAgo)
      completed7d++;

    // Avg time per task = mean planned duration. A Duration task spans
    // start_date → due_date inclusive (13 → 17 July = 5 days, matching the
    // detail panel's "5 days" chip); a single-date task counts as 1 day;
    // tasks with no due date don't contribute.
    if (t.due_date) {
      let days = 1;
      if (t.start_date) {
        try {
          const span = Dayjs(t.due_date)
            .startOf("day")
            .diff(Dayjs(t.start_date).startOf("day"), "day");
          days = Math.max(1, span + 1);
        } catch {
          days = 1;
        }
      }
      durSum += days;
      durCount++;
    }
  });

  const avgDays = durCount ? Math.round((durSum / durCount) * 10) / 10 : 0;

  // ── Shared builders ──────────────────────────────────────────────────────
  // Figma renders the card sub-text as one paragraph with an optional inline
  // Primary/40 link tail (e.g. "… your work items. View all work items").
  const card = (title, sub, body, expand, link) =>
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
                Skeletons.Box.X({
                  className: `${pfx}__health-card-sub-row`,
                  kids: [
                    Skeletons.Note({
                      className: `${pfx}__health-card-sub`,
                      content: sub,
                    }),
                    link
                      ? Skeletons.Note({
                          className: `${pfx}__health-card-link`,
                          content: link,
                          // Figma flow: every health-card link tail drills into
                          // the flat List view of the same filtered task set.
                          bubble: 0,
                          service: "set-view",
                          uiHandler: [ui],
                          viewMode: "list",
                        })
                      : null,
                  ],
                }),
              ],
            }),
            expand
              ? Skeletons.Box.X({
                  className: `${pfx}__health-card-expand`,
                  kids: [
                    Skeletons.Image.Svg({
                      ico: "expand",
                      className: `${pfx}__health-card-expand-ico`,
                    }),
                  ],
                })
              : null,
            // A null here still occupies a flex slot at render, which shoves the
            // heading to the far edge under space-between — filter it out.
          ].filter(Boolean),
        }),
        ...body,
      ],
    });

  // Empty state only when the folder truly has no tasks. With a member filter
  // active, an empty *filtered* set must still render the dashboard — the
  // activity feed is actor-based, so a member with no assigned tasks can still
  // have activity worth showing (zeroed stats are correct, not a blank page).
  if (!total && !(ui.getFilterUids() || []).length) {
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
                className: `${pfx}__health-legend-marker`,
                styleOpt: { background: c.color },
              }),
              Skeletons.Note({
                className: `${pfx}__health-legend-name`,
                content: `${c.name || LOCALE[c.label] || c.key}: ${v}`,
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
    false,
    LOCALE.TASK_HEALTH_VIEW_ALL,
  );

  // ── 3. Recent activity feed ────────────────────────────────────────────────
  const verbs = {
    create: LOCALE.TASK_ACT_CREATE,
    update: LOCALE.TASK_ACT_UPDATE,
    status: LOCALE.TASK_ACT_STATUS,
    complete: LOCALE.TASK_ACT_COMPLETE,
    assignee: LOCALE.TASK_ACT_ASSIGNEE,
    reporter: LOCALE.TASK_ACT_REPORTER,
    link_file: LOCALE.TASK_ACT_LINK_FILE,
    comment: LOCALE.TASK_ACT_COMMENT,
  };
  const activity = ui.getActivity ? ui.getActivity() : [];
  const activityRows = activity.map((r) => {
    const m = ui.getMember(r.actor_uid) || {};
    // An actor who has since left the workspace no longer resolves to a name;
    // the activity row stays, labelled for what they are.
    const name = fullName(m) || LOCALE.FORMER_MEMBER;
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
                Skeletons.Box.X({
                  className: `${pfx}__health-act-text`,
                  kids: [
                    Skeletons.Note({
                      className: `${pfx}__health-act-actor`,
                      content: name,
                    }),
                    Skeletons.Note({
                      className: `${pfx}__health-act-verb`,
                      content: verbs[r.action] || verbs.update,
                    }),
                  ],
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

  // ── 4. Priority breakdown (gridded bar chart + legend) ──────────────────────
  // Most-important first (urgent → low) to match the Figma legend order.
  // Bars are a uniform Primary/10 fill read against a fixed 15/10/5/0 y-axis
  // (the axis grows in steps of 15 when a bucket exceeds 15 items).
  const prioOrder = priorities.slice().reverse();
  const maxPrio = Math.max(0, ...prioOrder.map((p) => byPriority[p.key] || 0));
  const axisMax = Math.max(15, Math.ceil(maxPrio / 15) * 15);
  const ticks = [axisMax, Math.round((axisMax * 2) / 3), Math.round(axisMax / 3), 0];
  const gridRows = Skeletons.Box.Y({
    className: `${pfx}__health-prio-grid`,
    kids: ticks.map((t) =>
      Skeletons.Box.X({
        className: `${pfx}__health-prio-grid-row`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__health-prio-axis`,
            content: String(t),
          }),
          Skeletons.Note({ className: `${pfx}__health-prio-line` }),
        ],
      }),
    ),
  });
  const barRow = Skeletons.Box.X({
    className: `${pfx}__health-prio-bars`,
    kids: prioOrder.map((p) => {
      const v = byPriority[p.key] || 0;
      const h = Math.min(100, Math.round((v / axisMax) * 100));
      return Skeletons.Box.Y({
        className: `${pfx}__health-prio-bar`,
        styleOpt: { height: `${h}%` },
      });
    }),
  });
  const bars = Skeletons.Box.Y({
    className: `${pfx}__health-prio-chart`,
    kids: [gridRows, barRow],
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
    false,
    LOCALE.TASK_HEALTH_MANAGE_PRIORITIES,
  );

  // ── 5. Team workload (horizontal bars per member) ───────────────────────────
  // Every hub member appears — a member with no tasks yet draws no bar at all,
  // but keeps their row (they're still part of the team). Sorted busiest-first;
  // ties keep member order. Each row shows its exact task count next to the bar.
  const work = [];
  const seenUids = new Set();
  (ui.getMembers() || []).forEach((m) => {
    const uid = String(m.id || m.uid || "");
    if (!uid || seenUids.has(uid)) return;
    seenUids.add(uid);
    work.push({ uid, m, count: byAssignee[uid] || 0 });
  });
  // Defensive: an assignee uid that DOES resolve to a member but isn't in the
  // roster row set is still surfaced so their tasks aren't silently hidden.
  //
  // A uid with no member behind it can only get this far when the member list
  // itself is unknown (assigneeUids has already folded ex-members into
  // `unassigned` otherwise). There is no name to head a row with, so count it
  // as unassigned rather than drawing a nameless row — either way the chart
  // must still add up to the same number of assignments.
  Object.keys(byAssignee).forEach((uid) => {
    if (seenUids.has(String(uid))) return;
    const m = ui.getMember(uid);
    if (!m) {
      unassigned += byAssignee[uid];
      return;
    }
    seenUids.add(String(uid));
    work.push({ uid, m, count: byAssignee[uid] });
  });
  work.sort((a, b) => b.count - a.count);
  // Normalised to the busiest row so the chart spans the whole track; the count
  // on each row carries the absolute number.
  const maxWork = Math.max(1, unassigned, ...work.map((e) => e.count));
  const taskCountLabel = (n) =>
    `${n} ${n === 1 ? LOCALE.TASK_ONE : LOCALE.TASK_MANY}`;
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
          kids: count
            ? [
                Skeletons.Box.X({
                  className: `${pfx}__health-work-fill`,
                  styleOpt: {
                    // flex-basis, not width — the fill is a flex item of the
                    // track. One decimal: whole percents quantise to ~1px steps
                    // on a narrow track and merge adjacent counts.
                    flex: `0 0 ${Math.round((count / maxWork) * 1000) / 10}%`,
                  },
                }),
              ]
            : [],
        }),
        // Always visible, not hover-only — and the only cue on a 0-task row.
        Skeletons.Note({
          className: `${pfx}__health-work-count`,
          content: taskCountLabel(count),
        }),
      ],
    });
  const workRows = work.map((e) =>
    workRow(
      Skeletons.UserProfile({
        className: `${pfx}__health-work-avatar`,
        id: e.uid,
        firstname: e.m.firstname,
        lastname: e.m.lastname,
        auto_color: 1,
        live_status: 0,
      }),
      fullName(e.m),
      e.count,
    ),
  );
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
    true,
    LOCALE.TASK_HEALTH_REASSIGN,
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
