// Calendar view — a month grid or a single-week row of day cells, each holding
// the folder's tasks on their due_date. Task cards mirror the board card
// (priority dot, title, description, file chips, status pill).
//   Figma: monthly 2042-20730, weekly 2045-132117, task cards 2045-131475.
// Globals Skeletons/LOCALE/Dayjs are injected at runtime.
const { priorityMeta, statusMeta, subtaskBadge } = require("./helpers");
const { stripMarkers } = require("../mention-markers");

const ymd = (d) => d.format("YYYY-MM-DD");

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const mode = ui.getCalMode() === "week" ? "week" : "month";
  const cursor = ui.getCalCursor();

  let today;
  let anchor;
  try {
    today = Dayjs();
    anchor = cursor ? Dayjs(cursor) : today;
  } catch {
    today = null;
    anchor = null;
  }
  if (!anchor || !anchor.isValid || !anchor.isValid()) {
    return Skeletons.Box.Y({
      className: `${pfx}__calendar`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__cal-empty`,
          content: LOCALE.NO_TASKS,
        }),
      ],
    });
  }

  const todayKey = today ? ymd(today) : "";
  const anchorMonth = anchor.month();

  // Group filtered tasks by due-date. Tasks with no due_date never appear.
  const byDay = {};
  (ui.getTopLevelTasks() || []).forEach((t) => {
    if (!t.due_date) return;
    let k;
    try {
      const d = Dayjs(t.due_date);
      if (!d.isValid()) return;
      k = ymd(d);
    } catch {
      return;
    }
    (byDay[k] = byDay[k] || []).push(t);
  });

  // ── Task card ────────────────────────────────────────────────
  const fileChip = (f) =>
    Skeletons.Box.X({
      className: `${pfx}__cal-card-file`,
      kids: [
        Skeletons.Image.Svg({
          ico: "app-attachment",
          className: `${pfx}__cal-card-file-ico`,
        }),
        Skeletons.Note({
          className: `${pfx}__cal-card-file-name`,
          content: `${f.filename || ""}${f.extension ? "." + f.extension : ""}`,
        }),
      ],
    });

  // Compact month chip — a single line (priority dot + title), status-tinted.
  // Month cells are small, so the full board-style card is reserved for week.
  const compactChip = (t) => {
    const pm = priorityMeta(ui, t.priority || "medium");
    return Skeletons.Box.X({
      className: `${pfx}__cal-chip`,
      bubble: 0,
      service: "open-detail",
      uiHandler: [ui],
      taskId: t.id,
      // data-theme carries the chip tint — a custom column's status IS its DB
      // id, so the old per-status rules only ever matched the four built-ins.
      dataset: {
        status: t.status || "",
        theme: statusMeta(ui, t.status || ui.getDefaultStatus()).theme,
      },
      kids: [
        Skeletons.Note({
          className: `${pfx}__cal-chip-dot`,
          styleOpt: { background: pm.color },
        }),
        Skeletons.Note({
          className: `${pfx}__cal-chip-title`,
          content: t.title || "",
        }),
        // Count only — Calendar gets no expand this round. A subtask never
        // earns its own cell even when its due date differs from the parent's;
        // getTopLevelTasks above is what enforces that.
        subtaskBadge(ui, t, `${pfx}__cal-chip-subcount`),
        // Hover delete; bubble:0 so it doesn't also open the detail panel.
        Skeletons.Button.Svg({
          className: `${pfx}__cal-chip-remove`,
          ico: "cross",
          bubble: 0,
          service: "remove-task",
          uiHandler: [ui],
          taskId: t.id,
        }),
      ],
    });
  };

  const card = (t) => {
    const pm = priorityMeta(ui, t.priority || "medium");
    const sm = statusMeta(ui, t.status || ui.getDefaultStatus());
    const files = Array.isArray(t.linked_files) ? t.linked_files : [];
    const shownFiles = files.slice(0, 2);
    const moreFiles = files.length - shownFiles.length;
    const filesNode = shownFiles.length
      ? Skeletons.Box.X({
          className: `${pfx}__cal-card-files`,
          kids: [
            ...shownFiles.map(fileChip),
            moreFiles > 0
              ? Skeletons.Note({
                  className: `${pfx}__cal-card-files-more`,
                  content: `+${moreFiles}`,
                })
              : null,
          ].filter(Boolean),
        })
      : null;
    return Skeletons.Box.Y({
      className: `${pfx}__cal-card`,
      bubble: 0,
      service: "open-detail",
      uiHandler: [ui],
      taskId: t.id,
      dataset: {
        priority: t.priority || "medium",
        status: t.status || "",
        theme: sm.theme || "default",
      },
      kids: [
        // Hover delete; bubble:0 so it doesn't also open the detail panel.
        Skeletons.Button.Svg({
          className: `${pfx}__cal-card-remove`,
          ico: "cross",
          bubble: 0,
          service: "remove-task",
          uiHandler: [ui],
          taskId: t.id,
        }),
        Skeletons.Note({
          className: `${pfx}__cal-card-dot`,
          styleOpt: { background: pm.color },
        }),
        Skeletons.Note({
          className: `${pfx}__cal-card-title`,
          content: t.title || "",
        }),
        t.description
          ? Skeletons.Note({
              className: `${pfx}__cal-card-desc`,
              content: stripMarkers(t.description),
            })
          : null,
        filesNode,
        Skeletons.Box.X({
          className: `${pfx}__cal-card-status`,
          dataset: { status: t.status || "", theme: sm.theme || "default" },
          kids: [
            Skeletons.Note({
              className: `${pfx}__cal-card-status-dot`,
              styleOpt: { background: sm.color || "#AEAEB2" },
            }),
            Skeletons.Note({
              className: `${pfx}__cal-card-status-label`,
              content: sm.name || LOCALE[sm.label] || sm.key,
            }),
            // Week-mode card carries the same count as the month chip.
            subtaskBadge(ui, t, `${pfx}__cal-card-subcount`),
          ].filter(Boolean),
        }),
      ].filter(Boolean),
    });
  };

  // Day body: full cards in week mode; compact chips (capped, with a "+N more"
  // that expands to that day's week) in month mode.
  const MONTH_MAX = 3;
  const dayBody = (list, k) => {
    if (!list.length) return null;
    if (mode === "week") {
      return Skeletons.Box.Y({
        className: `${pfx}__cal-day-body`,
        kids: list.map(card),
      });
    }
    const shown = list.slice(0, MONTH_MAX);
    const more = list.length - shown.length;
    const kids = shown.map(compactChip);
    if (more > 0) {
      kids.push(
        Skeletons.Note({
          className: `${pfx}__cal-day-more`,
          content: `+${more}`,
          bubble: 0,
          service: "cal-day-more",
          uiHandler: [ui],
          calDay: k,
        }),
      );
    }
    return Skeletons.Box.Y({ className: `${pfx}__cal-day-body`, kids });
  };

  // ── Day cell ─────────────────────────────────────────────────
  const dayCell = (d) => {
    const k = ymd(d);
    const inMonth = mode === "week" || d.month() === anchorMonth;
    const list = byDay[k] || [];
    // Day 1 of a month shows the month abbreviation ("Jun 1"), per Figma.
    const numText = d.date() === 1 ? d.format("MMM D") : String(d.date());
    return Skeletons.Box.Y({
      className: `${pfx}__cal-day`,
      dataset: {
        today: k === todayKey ? 1 : 0,
        outside: inMonth ? 0 : 1,
      },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__cal-day-head`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__cal-day-add`,
              bubble: 0,
              service: "cal-add",
              uiHandler: [ui],
              calDay: k,
              kids: [
                // Text glyph, not the `plus` sprite: the sprite symbol can't be
                // recoloured across the <use> boundary and renders invisible.
                Skeletons.Note({
                  className: `${pfx}__cal-day-add-ico`,
                  content: "+",
                }),
              ],
            }),
            Skeletons.Note({
              className: `${pfx}__cal-day-num`,
              content: numText,
            }),
          ],
        }),
        dayBody(list, k),
      ].filter(Boolean),
    });
  };

  // ── Weekday header (Sun … Sat, right-aligned over each column) ─
  const weekStart = anchor.startOf("week");
  const weekdays = Skeletons.Box.X({
    className: `${pfx}__cal-weekdays`,
    kids: Array.from({ length: 7 }, (_, i) =>
      Skeletons.Note({
        className: `${pfx}__cal-weekday`,
        content: weekStart.add(i, "day").format("ddd"),
      }),
    ),
  });

  // ── Grid ─────────────────────────────────────────────────────
  let grid;
  if (mode === "week") {
    grid = Skeletons.Box.X({
      className: `${pfx}__cal-week-row`,
      kids: Array.from({ length: 7 }, (_, i) =>
        dayCell(weekStart.add(i, "day")),
      ),
    });
  } else {
    // 6 rows covers every month layout; trailing/leading days dim via data-outside.
    let cur = anchor.startOf("month").startOf("week");
    const weeks = [];
    for (let w = 0; w < 6; w++) {
      const days = Array.from({ length: 7 }, (_, i) => dayCell(cur.add(i, "day")));
      weeks.push(
        Skeletons.Box.X({ className: `${pfx}__cal-week-row`, kids: days }),
      );
      cur = cur.add(7, "day");
    }
    grid = Skeletons.Box.Y({ className: `${pfx}__cal-grid`, kids: weeks });
  }

  return Skeletons.Box.Y({
    className: `${pfx}__calendar`,
    dataset: { mode },
    kids: [weekdays, grid],
  });
};

// Viewbar controls shown only while the Calendar view is active: a
// Weekly/Monthly toggle + a ‹ period › navigator (the label jumps to today).
module.exports.controls = function (ui) {
  const pfx = ui.fig.family;
  const mode = ui.getCalMode() === "week" ? "week" : "month";
  const cursor = ui.getCalCursor();

  let anchor = null;
  try {
    anchor = cursor ? Dayjs(cursor) : Dayjs();
  } catch {
    anchor = null;
  }
  let label = "";
  if (anchor && anchor.isValid && anchor.isValid()) {
    if (mode === "week") {
      const s = anchor.startOf("week");
      const e = anchor.endOf("week");
      label =
        s.month() === e.month()
          ? `${s.format("MMM D")} – ${e.format("D")}`
          : `${s.format("MMM D")} – ${e.format("MMM D")}`;
    } else {
      label = anchor.format("MMMM YYYY");
    }
  }

  const modeLabel = (key, text) =>
    Skeletons.Note({
      className: `${pfx}__cal-toggle-label`,
      content: text,
      dataset: { active: mode === key ? 1 : 0 },
      bubble: 0,
      service: "set-cal-mode",
      uiHandler: [ui],
      calMode: key,
    });

  const toggle = Skeletons.Box.X({
    className: `${pfx}__cal-toggle`,
    kids: [
      modeLabel("week", LOCALE.WEEKLY),
      Skeletons.Box.X({
        className: `${pfx}__cal-switch`,
        dataset: { mode },
        bubble: 0,
        service: "set-cal-mode",
        uiHandler: [ui],
        calMode: mode === "week" ? "month" : "week",
        kids: [Skeletons.Note({ className: `${pfx}__cal-switch-knob` })],
      }),
      modeLabel("month", LOCALE.MONTHLY),
    ],
  });

  const nav = Skeletons.Box.X({
    className: `${pfx}__cal-nav`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__cal-nav-arrow`,
        ico: "arrow-left",
        bubble: 0,
        service: "cal-prev",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__cal-nav-label`,
        content: label,
        bubble: 0,
        service: "cal-today",
        uiHandler: [ui],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__cal-nav-arrow`,
        ico: "arrow-right",
        bubble: 0,
        service: "cal-next",
        uiHandler: [ui],
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}__cal-controls`,
    kids: [toggle, nav],
  });
};
