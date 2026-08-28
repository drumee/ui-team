// Gantt view — a sticky task-list (checkbox · chevron · priority dot · title ·
// + · ×) beside a horizontally-scrolling timeline. Each task gets a bar spanning
// its planned window (created → due, since the schema has no start_date) with a
// gradient fill, plus a pink overdue tail + ⚠ when it's past due and unfinished.
// A purple "today" line and a shaded current-period band sit behind the bars.
//   Figma: 2057-32279 (weeks), 2065-90472 (months), 2365-137835 (body detail).
// Globals Skeletons/LOCALE/Dayjs are injected at runtime.
const { priorityMeta, mayCreateTask, subtaskBadge } = require("./helpers");

const ASIDE_W = 300; // left task-list width
const ROW_H = 56; // task row height (aside + track share it)
const HEAD_H = 52; // axis header height
const BAR_H = 24; // task bar height
const DAY_W_WEEK = 48; // px/day in weeks mode
const DAY_W_MONTH = 8; // px/day in months mode
const MIN_WEEKS = 4;
const MIN_MONTHS = 3;

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const mode = ui.getGanttMode() === "months" ? "months" : "weeks";
  const selected = ui.getGanttSelected ? ui.getGanttSelected() : new Set();

  let today;
  try {
    today = Dayjs().startOf("day");
  } catch {
    today = null;
  }
  if (!today || !today.isValid()) {
    return Skeletons.Box.Y({
      className: `${pfx}__gantt`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__cal-empty`,
          content: LOCALE.NO_TASKS,
        }),
      ],
    });
  }

  // Resolve each task's [start, end] window. end = due_date (required); start =
  // the task's start_date (Duration toggle) when set, else its created time as
  // a fallback. Clamped to ≤ end. Tasks with no due_date are dropped.
  const rows = [];
  (ui.getTopLevelTasks() || []).forEach((t) => {
    if (!t.due_date) return;
    let end;
    try {
      end = Dayjs(t.due_date).startOf("day");
      if (!end.isValid()) return;
    } catch {
      return;
    }
    let start;
    try {
      let s = null;
      if (t.start_date) {
        const sd = Dayjs(t.start_date).startOf("day");
        if (sd.isValid()) s = sd;
      }
      if (!s) {
        const ct = Number(t.ctime) || 0;
        s = ct ? Dayjs(ct * 1000).startOf("day") : end;
      }
      start = !s.isValid() || s.isAfter(end) ? end : s;
    } catch {
      start = end;
    }
    rows.push({ task: t, start, end });
  });

  // ── Expand ───────────────────────────────────────────────────
  // A parent whose chevron is open contributes its children as rows directly
  // beneath it. Built BEFORE the date domain so a child running past its
  // parent widens the timeline instead of overflowing it, and consumed by a
  // single loop below so the aside rows and the timeline tracks cannot drift
  // out of alignment (they are two parallel arrays keyed only by position).
  const displayRows = [];
  rows.forEach((r) => {
    displayRows.push({ ...r, child: false });
    if (!ui.isSubtasksOpen || !ui.isSubtasksOpen(r.task.id)) return;
    (ui.getSubtasks ? ui.getSubtasks(r.task.id) : []).forEach((task) => {
      // A child with no date of its own rides the parent's window, so it still
      // gets a bar rather than silently disappearing the way the top-level
      // loop drops a task with no due_date.
      let start = r.start;
      let end = r.end;
      if (task.due_date) {
        try {
          const d = Dayjs(task.due_date).startOf("day");
          if (d.isValid()) {
            end = d;
            let s = null;
            if (task.start_date) {
              const sd = Dayjs(task.start_date).startOf("day");
              if (sd.isValid()) s = sd;
            }
            if (!s) {
              const ct = Number(task.ctime) || 0;
              s = ct ? Dayjs(ct * 1000).startOf("day") : end;
            }
            start = !s.isValid() || s.isAfter(end) ? end : s;
          }
        } catch {
          /* unparseable — keep the parent's window */
        }
      }
      displayRows.push({ task, start, end, child: true });
    });
  });

  // ── Date domain ──────────────────────────────────────────────
  let minD = today;
  let maxD = today;
  displayRows.forEach((r) => {
    if (r.start.isBefore(minD)) minD = r.start;
    if (r.end.isAfter(maxD)) maxD = r.end;
  });

  // Pad the domain well past the last bar/today so real day cells always run
  // to (and beyond) the window's right edge — the timeline scrolls instead of
  // showing a dead region with no dates.
  let domainStart;
  let domainEnd;
  if (mode === "weeks") {
    domainStart = minD.startOf("week");
    domainEnd = maxD.endOf("week").startOf("day").add(8, "week");
    while (domainEnd.diff(domainStart, "week") + 1 < MIN_WEEKS) {
      domainEnd = domainEnd.add(1, "week");
    }
  } else {
    domainStart = minD.startOf("month");
    domainEnd = maxD
      .add(9, "month")
      .endOf("month")
      .startOf("day");
    while (domainEnd.diff(domainStart, "month") + 1 < MIN_MONTHS) {
      domainEnd = domainEnd.add(1, "month");
    }
  }

  const DAY_W = mode === "weeks" ? DAY_W_WEEK : DAY_W_MONTH;
  const totalDays = domainEnd.diff(domainStart, "day") + 1;
  const timelineW = totalDays * DAY_W;
  const dayOffset = (d) => d.startOf("day").diff(domainStart, "day");
  const px = (d) => dayOffset(d) * DAY_W;

  // ── Axis header ──────────────────────────────────────────────
  let axisKids;
  if (mode === "weeks") {
    const groups = [];
    let cur = domainStart;
    while (!cur.isAfter(domainEnd)) {
      const weekStart = cur;
      const weekEnd = cur.add(6, "day");
      const dayCells = Array.from({ length: 7 }, (_, i) => {
        const d = weekStart.add(i, "day");
        return Skeletons.Note({
          className: `${pfx}__gantt-axis-day`,
          styleOpt: { width: `${DAY_W}px` },
          content: String(d.date()),
        });
      });
      // Cross-month weeks read "Jun / Jul" (Figma's boundary label).
      const monthLabel =
        weekStart.month() === weekEnd.month()
          ? weekStart.format("MMM")
          : `${weekStart.format("MMM")} / ${weekEnd.format("MMM")}`;
      groups.push(
        Skeletons.Box.Y({
          className: `${pfx}__gantt-axis-week`,
          styleOpt: { width: `${7 * DAY_W}px` },
          kids: [
            Skeletons.Note({
              className: `${pfx}__gantt-axis-month`,
              content: monthLabel,
            }),
            Skeletons.Box.X({
              className: `${pfx}__gantt-axis-days`,
              kids: dayCells,
            }),
          ],
        }),
      );
      cur = cur.add(7, "day");
    }
    axisKids = groups;
  } else {
    const cells = [];
    let cur = domainStart.startOf("month");
    while (!cur.isAfter(domainEnd)) {
      cells.push(
        Skeletons.Note({
          className: `${pfx}__gantt-axis-mon`,
          styleOpt: { width: `${cur.daysInMonth() * DAY_W}px` },
          content: cur.format("MMMM"),
        }),
      );
      cur = cur.add(1, "month");
    }
    axisKids = cells;
  }

  // ── Today line + current-period band ─────────────────────────
  const todayPx = px(today);
  const bandStart = mode === "weeks" ? today.startOf("week") : today.startOf("month");
  const bandDays = mode === "weeks" ? 7 : today.daysInMonth();
  const band = Skeletons.Box.Y({
    className: `${pfx}__gantt-band`,
    styleOpt: { left: `${px(bandStart)}px`, width: `${bandDays * DAY_W}px` },
  });
  const todayLine = Skeletons.Box.Y({
    className: `${pfx}__gantt-today`,
    styleOpt: { left: `${todayPx}px` },
    kids: [Skeletons.Note({ className: `${pfx}__gantt-today-cap` })],
  });

  // ── Aside rows + timeline tracks ─────────────────────────────
  const asideRows = [];
  const trackRows = [];
  displayRows.forEach(({ task, start, end, child }) => {
    const sel = selected && selected.has && selected.has(task.id);
    const pm = priorityMeta(ui, task.priority);
    const kids = ui.getSubtaskCount ? ui.getSubtaskCount(task).total : 0;
    asideRows.push(
      Skeletons.Box.X({
        className: `${pfx}__gantt-arow`,
        styleOpt: { height: `${ROW_H}px` },
        attrOpt: { "data-child": child ? "1" : "0" },
        dataset: { selected: sel ? 1 : 0 },
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__gantt-check`,
            dataset: { checked: sel ? 1 : 0 },
            bubble: 0,
            service: "gantt-toggle-select",
            uiHandler: [ui],
            taskId: task.id,
            kids: [
              Skeletons.Image.Svg({
                ico: "app-check",
                className: `${pfx}__gantt-check-ico`,
              }),
            ],
          }),
          // Expands the children inline (Figma 58471:221905 puts this on
          // every row). A childless or child row still renders the element, as
          // an empty spacer, so every title stays on the same x-position.
          child || !kids
            ? Skeletons.Note({
                className: `${pfx}__gantt-chevron`,
                attrOpt: { "data-empty": "1" },
              })
            : Skeletons.Note({
                className: `${pfx}__gantt-chevron`,
                content: "›",
                bubble: 0,
                service: "toggle-subtasks",
                uiHandler: [ui],
                taskId: task.id,
                attrOpt: {
                  "data-open": ui.isSubtasksOpen(task.id) ? "1" : "0",
                },
              }),
          task.priority
            ? Skeletons.Note({
                className: `${pfx}__gantt-dot`,
                styleOpt: { background: pm.color },
              })
            : null,
          Skeletons.Note({
            className: `${pfx}__gantt-title`,
            content: task.title || "",
            bubble: 0,
            service: "open-detail",
            uiHandler: [ui],
            taskId: task.id,
          }),
          subtaskBadge(ui, task, `${pfx}__gantt-subcount`),
          // "Create child task items" — Figma 58471:221905 puts this on every
          // Gantt row, between the title and the delete control. It opens the
          // task's own detail panel with the child-item creator already open,
          // which is where the design puts the creator (58471:222398); there is
          // no inline creator on the Gantt row itself.
          mayCreateTask(ui) && !child
            ? Skeletons.Button.Svg({
                className: `${pfx}__gantt-add-child`,
                // app-add, not "plus" — see the subtask header's ＋: the "plus"
                // glyph is a filled disc, which paints as a solid black circle.
                ico: "app-add",
                bubble: 0,
                service: "add-child-task",
                uiHandler: [ui],
                taskId: task.id,
                // Object form with __tip: ui-core appends the tooltip as a
                // plain CHILD of the button and gives it no styling, so the
                // bare string form renders as inline text inside the button
                // and displaces the icon. __tip is the absolutely-positioned
                // flyover this panel already uses for exactly that reason.
                tooltips: {
                  content: LOCALE.CREATE_CHILD_TASK,
                  className: `${pfx}__tip`,
                },
              })
            : null,
          Skeletons.Button.Svg({
            className: `${pfx}__gantt-del`,
            ico: "cross",
            bubble: 0,
            service: "remove-task",
            uiHandler: [ui],
            taskId: task.id,
          }),
        ].filter(Boolean),
      }),
    );

    const leftPx = px(start);
    const endPx = (dayOffset(end) + 1) * DAY_W;
    const widthPx = Math.max(DAY_W, endPx - leftPx);
    const started = !start.isAfter(today);
    const overdue = !ui.isDoneStatus(task.status) && end.isBefore(today);
    const barKids = [];
    if (overdue) {
      const tailLeft = leftPx + widthPx;
      const tailRight = (dayOffset(today) + 1) * DAY_W;
      const tailW = Math.max(0, tailRight - tailLeft);
      if (tailW > 0) {
        barKids.push(
          Skeletons.Box.X({
            className: `${pfx}__gantt-overdue`,
            styleOpt: { left: `${tailLeft}px`, width: `${tailW}px` },
            kids: [
              Skeletons.Note({
                className: `${pfx}__gantt-warn`,
                content: "!",
              }),
            ],
          }),
        );
      }
    }
    barKids.push(
      Skeletons.Box.X({
        className: `${pfx}__gantt-bar`,
        dataset: { started: started ? 1 : 0 },
        styleOpt: { left: `${leftPx}px`, width: `${widthPx}px` },
        bubble: 0,
        service: "open-detail",
        uiHandler: [ui],
        taskId: task.id,
      }),
    );
    trackRows.push(
      Skeletons.Box.Y({
        className: `${pfx}__gantt-track`,
        styleOpt: { height: `${ROW_H}px` },
        attrOpt: { "data-child": child ? "1" : "0" },
        kids: barKids,
      }),
    );
  });

  // ── Assemble ─────────────────────────────────────────────────
  const aside = Skeletons.Box.Y({
    className: `${pfx}__gantt-aside`,
    styleOpt: { width: `${ASIDE_W}px` },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__gantt-aside-head`,
        styleOpt: { height: `${HEAD_H}px` },
        kids: [
          !mayCreateTask(ui) ? "" : Skeletons.Box.X({
            className: `${pfx}__gantt-work`,
            bubble: 0,
            service: "add-task",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__gantt-work-ico`,
                content: "+",
              }),
              Skeletons.Note({
                className: `${pfx}__gantt-work-label`,
                content: LOCALE.TASK,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__gantt-del-sel`,
            content: LOCALE.DELETE_SELECTED,
            dataset: { active: selected && selected.size ? 1 : 0 },
            bubble: 0,
            service: "gantt-delete-selected",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__gantt-aside-body`,
        kids: asideRows.length
          ? asideRows
          : [
              Skeletons.Note({
                className: `${pfx}__gantt-empty`,
                content: LOCALE.NO_TASKS,
              }),
            ],
      }),
    ],
  });

  // min-width keeps the computed timeline scrollable; the flex-grow in the
  // skin lets the axis/tracks stretch to fill wider windows (no dead gutter).
  const main = Skeletons.Box.Y({
    className: `${pfx}__gantt-main`,
    styleOpt: { minWidth: `${timelineW}px`, "--gantt-day-w": `${DAY_W}px` },
    dataset: { mode },
    kids: [
      band,
      todayLine,
      Skeletons.Box.X({
        className: `${pfx}__gantt-axis`,
        styleOpt: { height: `${HEAD_H}px` },
        kids: axisKids,
      }),
      Skeletons.Box.Y({ className: `${pfx}__gantt-tracks`, kids: trackRows }),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}__gantt`,
    // Phone flag — the skin narrows the sticky task-list aside so the timeline
    // is actually visible (see `[data-mobile="1"]` in skin).
    attrOpt: { "data-mobile": Visitor.isMobile() ? "1" : "0" },
    kids: [
      // No inline min-width here — it would override the skin's
      // `min-width: 100%` (same property) and stop the grid at the computed
      // timeline width. The scroll extent comes from the children: sticky
      // aside (300px) + main's own inline min-width.
      Skeletons.Box.X({
        className: `${pfx}__gantt-grid`,
        kids: [aside, main],
      }),
    ],
  });
};

// Viewbar controls for the Gantt view: Weeks/Months toggle + Detail + Filter.
module.exports.controls = function (ui) {
  const pfx = ui.fig.family;
  const mode = ui.getGanttMode() === "months" ? "months" : "weeks";

  const modeLabel = (key, text) =>
    Skeletons.Note({
      className: `${pfx}__cal-toggle-label`,
      content: text,
      dataset: { active: mode === key ? 1 : 0 },
      bubble: 0,
      service: "set-gantt-mode",
      uiHandler: [ui],
      ganttMode: key,
    });

  const toggle = Skeletons.Box.X({
    className: `${pfx}__cal-toggle`,
    kids: [
      modeLabel("weeks", LOCALE.WEEKS),
      Skeletons.Box.X({
        className: `${pfx}__cal-switch`,
        // Reuse the calendar switch visual: "on" (right, brand) === months.
        dataset: { mode: mode === "months" ? "month" : "week" },
        bubble: 0,
        service: "set-gantt-mode",
        uiHandler: [ui],
        ganttMode: mode === "months" ? "weeks" : "months",
        kids: [Skeletons.Note({ className: `${pfx}__cal-switch-knob` })],
      }),
      modeLabel("months", LOCALE.MONTHS),
    ],
  });

  // Filter now lives in the shared viewbar; Gantt keeps only its Detail pill.
  const pillBtn = (label) =>
    Skeletons.Note({ className: `${pfx}__gantt-ctrl`, content: label });

  return Skeletons.Box.X({
    className: `${pfx}__cal-controls`,
    kids: [toggle, pillBtn(LOCALE.DETAIL)],
  });
};
