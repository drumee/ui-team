// Calendar view — a month grid, a week row, or a single day of day cells, each
// holding the folder's tasks on their due_date. Task cards mirror the board card
// (priority dot, title, description, file chips, status pill).
//   Figma: monthly 2042-20730, weekly 2045-132117, task cards 2045-131475.
// Globals Skeletons/LOCALE/Dayjs are injected at runtime.
//
// ── One calendar language across three surfaces ──────────────────────────────
// This, the Personal Calendar (panel/calendar) and the Meet tab's schedule
// (window/folder/skeleton/meeting-schedule.js) are the three calendars a user
// moves between, and they had grown three different sets of controls. This one
// now uses the other two's: ‹ Today ›, a range label that opens a mini
// calendar, and a Month / Week / Day dropdown — same order, same locale keys
// (CAL_VIEW_*), same label formats (panel/calendar/skeleton/helpers.js
// rangeLabel), same month-cell overflow model.
//
// What deliberately stays its own: there is no hour canvas here. A task's
// due_date is a calendar DATE with no time, so an hour grid would be 24 empty
// rows; week and day stay columns of full cards, which is also how the Personal
// Calendar treats tasks (its all-day strip, never an hour).
const { priorityMeta, statusMeta, subtaskBadge } = require("./helpers");
const { stripMarkers } = require("../mention-markers");

const ymd = (d) => d.format("YYYY-MM-DD");

// The views, in the other two calendars' order, with their locale keys.
const VIEWS = [
  { key: "month", label: "CAL_VIEW_MONTH" },
  { key: "week", label: "CAL_VIEW_WEEK" },
  { key: "day", label: "CAL_VIEW_DAY" },
];

// How many compact chips stand in a month cell at rest. It only LABELS the
// "+N" — every task renders and the cell scrolls — so it has to agree with the
// cell geometry in the skin (--tcal-cell-min, the 26px chip, the 4px gap), the
// same coupling the Personal Calendar documents for its own MONTH_FIT.
const MONTH_FIT = 3;

/** The active view, validated — anything unknown falls back to the month. */
const calMode = (ui) => {
  const m = ui.getCalMode();
  return m === "week" || m === "day" ? m : "month";
};

/** The cursor as a valid Dayjs, or null. Never throws. */
const anchorOf = (value) => {
  try {
    const d = value ? Dayjs(value) : Dayjs();
    return d && d.isValid && d.isValid() ? d : null;
  } catch {
    return null;
  }
};

// "September, 2026" / "September 21 – 27, 2026" / "Thursday, September 25,
// 2026" — the Personal Calendar's rangeLabel, verbatim, so one range never
// reads two ways in two tabs.
function rangeLabel(mode, anchor) {
  if (!anchor) return "";
  if (mode === "day") return anchor.format("dddd, MMMM D, YYYY");
  if (mode === "week") {
    const s = anchor.startOf("week");
    const e = anchor.endOf("week");
    if (s.month() === e.month()) {
      return `${s.format("MMMM D")} – ${e.format("D")}, ${e.format("YYYY")}`;
    }
    return `${s.format("MMM D")} – ${e.format("MMM D")}, ${e.format("YYYY")}`;
  }
  return anchor.format("MMMM, YYYY");
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const mode = calMode(ui);
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

  // Day body: full cards in week/day mode; compact chips in month mode.
  //
  // The month cell used to slice to three and DROP the rest, leaving a "+N"
  // whose only job was to send the user to another view to find out what the
  // cell was hiding — the truncation the Personal Calendar removed from its own
  // month grid. Every task renders now and the cell body scrolls; the "+N" is
  // pinned to the foot of the cell (sticky, in the skin) so it can never scroll
  // out of reach itself, and it opens that DAY, as the Personal Calendar's does.
  //
  // Bounded without a slice: a month only ever builds the tasks whose due date
  // falls in its six weeks, as ~5-node chips, which even for the largest
  // workspace is under the board's own windowed budget (CARD_WINDOW × columns ×
  // ~19 nodes a card).
  const dayBody = (list, k) => {
    if (!list.length) return null;
    if (mode !== "month") {
      return Skeletons.Box.Y({
        className: `${pfx}__cal-day-body`,
        kids: list.map(card),
      });
    }
    const kids = list.map(compactChip);
    const more = list.length - MONTH_FIT;
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
    return Skeletons.Box.Y({
      className: `${pfx}__cal-day-body`,
      // A scrolled cell with a transparent-at-rest bar looks exactly like a
      // truncated one; the skeleton already knows which cells overflow (it is
      // the "+N" comparison), so it says so and the skin inks the bar.
      attrOpt: { "data-overflow": more > 0 ? "1" : "0" },
      kids,
    });
  };

  // Hover-revealed "add a task on this day". Lives in the month CELL, and in
  // the column HEADER for week/day — there the cells no longer carry a head
  // row (the header names the date), and a head row kept for the "+" alone was
  // a 38px empty band above every column's first card. The Personal Calendar
  // likewise makes its week/day header the day's add target.
  const addBtn = (k) =>
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
          // Inert, or the glyph takes the click and "cal-add" never fires.
          active: 0,
        }),
      ],
    });

  // ── Day cell ─────────────────────────────────────────────────
  const dayCell = (d) => {
    const k = ymd(d);
    const inMonth = mode !== "month" || d.month() === anchorMonth;
    const list = byDay[k] || [];
    // Day 1 of a month shows the month abbreviation ("Jun 1"), per Figma.
    const numText = d.date() === 1 ? d.format("MMM D") : String(d.date());
    return Skeletons.Box.Y({
      className: `${pfx}__cal-day`,
      // attrOpt, not dataset: these are the attributes the skin's today and
      // outside-month rules key on at first paint.
      attrOpt: {
        "data-today": k === todayKey ? "1" : "0",
        "data-outside": inMonth ? "0" : "1",
      },
      kids: [
        // Month only: week/day name the date — and carry the "+" — in the
        // column header.
        mode === "month"
          ? Skeletons.Box.X({
              className: `${pfx}__cal-day-head`,
              kids: [
                addBtn(k),
                Skeletons.Note({
                  className: `${pfx}__cal-day-num`,
                  content: numText,
                }),
              ],
            })
          : null,
        dayBody(list, k),
      ].filter(Boolean),
    });
  };

  // ── Column header ───────────────────────────────────────────
  // Month: the weekday names, centred over each column, as both other month
  // grids draw them.
  //
  // Week / day: the date itself, num over name — the Personal Calendar's and
  // the Meet tab's week/day header — with today marked by inking the NUMBER.
  // The cells then drop their own number (it would say the same thing twice),
  // and today's cell drops its wash: on a one-column day view that wash had
  // nothing to contrast with and simply turned the whole view lavender, which
  // is the exact defect the Personal Calendar's day view was fixed for.
  const weekStart = anchor.startOf("week");
  const headDays =
    mode === "day"
      ? [anchor.startOf("day")]
      : Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
  const weekdays = Skeletons.Box.X({
    className: `${pfx}__cal-weekdays`,
    kids: headDays.map((d) =>
      mode === "month"
        ? Skeletons.Note({
            className: `${pfx}__cal-weekday`,
            content: d.format("ddd"),
          })
        : Skeletons.Box.X({
            className: `${pfx}__cal-headday`,
            attrOpt: { "data-today": ymd(d) === todayKey ? "1" : "0" },
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__cal-headday-date`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__cal-headday-num`,
                    content: d.format("DD"),
                  }),
                  Skeletons.Note({
                    className: `${pfx}__cal-headday-name`,
                    content: d.format(mode === "day" ? "dddd" : "ddd"),
                  }),
                ],
              }),
              addBtn(ymd(d)),
            ],
          }),
    ),
  });

  // ── Grid ─────────────────────────────────────────────────────
  let grid;
  if (mode === "day") {
    grid = Skeletons.Box.X({
      className: `${pfx}__cal-week-row`,
      kids: [dayCell(anchor.startOf("day"))],
    });
  } else if (mode === "week") {
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
    // week and day share the full-card layout; the skin keys on both.
    attrOpt: { "data-mode": mode },
    kids: [weekdays, grid],
  });
};

// ── Viewbar controls (Calendar view only) ─────────────────────────────────────
// ‹ Today ›, the range label with its mini calendar, and the Month / Week / Day
// dropdown — the Personal Calendar's toolbar, in that order, with its metrics.
//
// It replaced a Weekly ◯ Monthly pill switch and an arrow-left/right navigator
// whose LABEL secretly jumped to today. The switch could not grow a third view,
// arrow-left's 40x22 viewBox drew a long horizontal arrow beside a 14px label,
// and a label that navigates when clicked is a control nobody can discover.
//
// The row is a named part, so opening a dropdown or stepping a month repaints
// this row and the view body — never the whole panel (see _repaintCalControls
// in ../index.js; tasks-panel-render-paths). Gantt still reuses the old
// __cal-controls / __cal-switch classes for its own bar, so those stay in the
// skin and this row has a class of its own.
function controlsKids(ui) {
  const pfx = ui.fig.family;
  const mode = calMode(ui);
  const anchor = anchorOf(ui.getCalCursor()) || Dayjs();

  // ── ‹ Today › ──────────────────────────────────────────────────────────
  const nav = Skeletons.Box.X({
    className: `${pfx}__tcal-nav`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__tcal-arrow`,
        ico: "caret-left",
        bubble: 0,
        service: "cal-prev",
        uiHandler: [ui],
        attrOpt: { "aria-label": LOCALE.PREVIOUS },
      }),
      Skeletons.Note({
        className: `${pfx}__tcal-today`,
        content: LOCALE.TODAY,
        bubble: 0,
        service: "cal-today",
        uiHandler: [ui],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__tcal-arrow`,
        ico: "caret-right",
        bubble: 0,
        service: "cal-next",
        uiHandler: [ui],
        attrOpt: { "aria-label": LOCALE.NEXT },
      }),
    ],
  });

  // ── range label + mini calendar ────────────────────────────────────────
  // The popup browses on its own month (getCalPickerCursor) so stepping it
  // does not move the grid behind it until a day is picked — the Personal
  // Calendar's and the Meet tab's rule.
  const pickerOpen = ui.isCalPickerOpen();
  let picker = null;
  if (pickerOpen) {
    const shown = anchorOf(ui.getCalPickerCursor()) || anchor;
    const gridStart = shown.startOf("month").startOf("week");
    const todayKey = ymd(Dayjs());
    const weekBand = mode === "week";
    const selStart = weekBand ? anchor.startOf("week") : anchor.startOf("day");
    const selEnd = weekBand
      ? anchor.startOf("week").add(6, "day").endOf("day")
      : anchor.endOf("day");
    picker = Skeletons.Box.Y({
      className: `${pfx}__tcal-menu ${pfx}__tcal-picker`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__tcal-picker-head`,
          kids: [
            Skeletons.Button.Svg({
              className: `${pfx}__tcal-picker-nav`,
              ico: "caret-left",
              bubble: 0,
              service: "cal-picker-step",
              uiHandler: [ui],
              calStep: -1,
              attrOpt: { "aria-label": LOCALE.PREVIOUS },
            }),
            Skeletons.Note({
              className: `${pfx}__tcal-picker-month`,
              content: shown.format("MMMM YYYY"),
            }),
            Skeletons.Button.Svg({
              className: `${pfx}__tcal-picker-nav`,
              ico: "caret-right",
              bubble: 0,
              service: "cal-picker-step",
              uiHandler: [ui],
              calStep: 1,
              attrOpt: { "aria-label": LOCALE.NEXT },
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__tcal-picker-dows`,
          kids: Array.from({ length: 7 }, (_, i) =>
            Skeletons.Note({
              className: `${pfx}__tcal-picker-dow`,
              content: gridStart.add(i, "day").format("dd"),
            }),
          ),
        }),
        ...Array.from({ length: 6 }, (_, w) =>
          Skeletons.Box.X({
            className: `${pfx}__tcal-picker-week`,
            kids: Array.from({ length: 7 }, (_, i) => {
              const d = gridStart.add(w * 7 + i, "day");
              const ds = ymd(d);
              const sel = !d.isBefore(selStart) && !d.isAfter(selEnd);
              return Skeletons.Note({
                className: `${pfx}__tcal-picker-day`,
                content: String(d.date()),
                bubble: 0,
                service: "cal-pick-day",
                uiHandler: [ui],
                calDay: ds,
                attrOpt: {
                  "data-in": d.month() === shown.month() ? "1" : "0",
                  "data-sel": sel ? "1" : "0",
                  "data-today": ds === todayKey ? "1" : "0",
                },
              });
            }),
          }),
        ),
      ],
    });
  }

  const range = Skeletons.Box.Y({
    className: `${pfx}__tcal-anchor`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__tcal-range`,
        attrOpt: { "data-open": pickerOpen ? "1" : "0" },
        bubble: 0,
        service: "cal-toggle-picker",
        uiHandler: [ui],
        // A kid left at the default `active` takes the click before
        // triggerHandlers runs, and the label would open nothing.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            className: `${pfx}__tcal-range-label`,
            content: rangeLabel(mode, anchor),
          }),
        ],
      }),
      picker,
    ].filter(Boolean),
  });

  // ── Month / Week / Day ─────────────────────────────────────────────────
  const menuOpen = ui.isCalViewMenuOpen();
  const current = VIEWS.find((v) => v.key === mode) || VIEWS[0];
  const view = Skeletons.Box.Y({
    className: `${pfx}__tcal-anchor`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__tcal-view-button`,
        attrOpt: { "data-open": menuOpen ? "1" : "0" },
        bubble: 0,
        service: "cal-toggle-view-menu",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "sidebar_calendar",
            className: `${pfx}__tcal-view-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__tcal-view-label`,
            content: LOCALE[current.label],
          }),
          Skeletons.Image.Svg({
            ico: "ph-caret-down",
            className: `${pfx}__tcal-view-caret`,
          }),
        ],
      }),
      menuOpen
        ? Skeletons.Box.Y({
            className: `${pfx}__tcal-menu ${pfx}__tcal-view-menu`,
            kids: VIEWS.map((v) =>
              Skeletons.Note({
                className: `${pfx}__tcal-menu-item`,
                content: LOCALE[v.label],
                attrOpt: { "data-active": v.key === mode ? "1" : "0" },
                bubble: 0,
                service: "cal-set-view",
                uiHandler: [ui],
                calMode: v.key,
              }),
            ),
          })
        : null,
    ].filter(Boolean),
  });

  return [nav, range, view];
}

module.exports.controls = function (ui) {
  return Skeletons.Box.X({
    className: `${ui.fig.family}__tcal-bar`,
    sys_pn: "cal-controls",
    partHandler: ui,
    kids: controlsKids(ui),
  });
};

module.exports.controlsKids = controlsKids;
module.exports.VIEWS = VIEWS;
