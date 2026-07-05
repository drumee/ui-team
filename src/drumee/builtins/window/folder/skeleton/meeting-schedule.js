// Meeting-tab schedule view: Today/week navigation, Weekly/Monthly toggle,
// "Start a Meeting" + "Schedule" CTAs, and a week/month grid. Client-side
// calendar chrome only — no scheduled-meetings backend yet, so the grid
// renders empty. View state lives on the folder window (`ui._sched`); nav and
// toggle services are handled in window/folder/index.js, which re-feeds this.

function schedState(ui) {
  if (!ui._sched) {
    ui._sched = { anchor: Dayjs(), view: "weekly" };
  }
  return ui._sched;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// "June 07-13, 2026" (same month) / "Jun 28 - Jul 04, 2026" (cross-month) /
// "June 2026" (monthly view).
function rangeLabel(ui) {
  const { anchor, view } = schedState(ui);
  if (view === "monthly") return anchor.format("MMMM YYYY");
  const start = anchor.startOf("week");
  const end = start.add(6, "day");
  if (start.month() === end.month()) {
    return `${start.format("MMMM")} ${pad2(start.date())}-${pad2(end.date())}, ${end.format("YYYY")}`;
  }
  return `${start.format("MMM DD")} - ${end.format("MMM DD")}, ${end.format("YYYY")}`;
}

function hourLabel(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// ── Weekly grid: day header row + 24 hour rows (85px labels + 7 columns) ──
function weeklyGrid(ui, pfx) {
  const start = schedState(ui).anchor.startOf("week");
  const today = Dayjs().format("YYYY-MM-DD");

  const header = Skeletons.Box.X({
    className: `${pfx}-sched-days`,
    kids: [
      Skeletons.Box.Y({ className: `${pfx}-sched-corner` }),
      ...Array.from({ length: 7 }, (_, i) => {
        const d = start.add(i, "day");
        return Skeletons.Box.Y({
          className: `${pfx}-sched-day`,
          attrOpt: { "data-today": d.format("YYYY-MM-DD") === today ? "1" : "0" },
          kids: [
            Skeletons.Note({ className: `${pfx}-sched-day-num`, content: pad2(d.date()) }),
            Skeletons.Note({ className: `${pfx}-sched-day-name`, content: d.format("dddd") }),
          ],
        });
      }),
    ],
  });

  const rows = Array.from({ length: 24 }, (_, h) =>
    Skeletons.Box.X({
      className: `${pfx}-sched-row`,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}-sched-hour`,
          kids: [Skeletons.Note({ className: `${pfx}-sched-hour-label`, content: hourLabel(h) })],
        }),
        ...Array.from({ length: 7 }, () =>
          Skeletons.Box.Y({ className: `${pfx}-sched-cell` }),
        ),
      ],
    }),
  );

  return [header, Skeletons.Box.Y({ className: `${pfx}-sched-body`, kids: rows })];
}

// ── Monthly grid: weekday header + weeks of day cells ─────────────────────
function monthlyGrid(ui, pfx) {
  const anchor = schedState(ui).anchor;
  const monthStart = anchor.startOf("month");
  const gridStart = monthStart.startOf("week");
  const today = Dayjs().format("YYYY-MM-DD");

  const header = Skeletons.Box.X({
    className: `${pfx}-sched-days ${pfx}-sched-days--month`,
    kids: Array.from({ length: 7 }, (_, i) =>
      Skeletons.Box.Y({
        className: `${pfx}-sched-day`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-sched-day-name`,
            content: gridStart.add(i, "day").format("dddd"),
          }),
        ],
      }),
    ),
  });

  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const rowStart = gridStart.add(w * 7, "day");
    // Stop once a full row falls outside the anchor month.
    if (w > 0 && rowStart.month() !== anchor.month() && rowStart.date() > 7) break;
    weeks.push(
      Skeletons.Box.X({
        className: `${pfx}-sched-week`,
        kids: Array.from({ length: 7 }, (_, i) => {
          const d = rowStart.add(i, "day");
          return Skeletons.Box.Y({
            className: `${pfx}-sched-mcell`,
            attrOpt: {
              "data-off": d.month() === anchor.month() ? "0" : "1",
              "data-today": d.format("YYYY-MM-DD") === today ? "1" : "0",
            },
            kids: [
              Skeletons.Note({ className: `${pfx}-sched-mnum`, content: pad2(d.date()) }),
            ],
          });
        }),
      }),
    );
  }

  return [header, Skeletons.Box.Y({ className: `${pfx}-sched-body ${pfx}-sched-body--month`, kids: weeks })];
}

module.exports = function meetingSchedule(ui) {
  const pfx = `${ui.fig.family}__meeting`;
  const { view } = schedState(ui);

  const navPill = Skeletons.Box.X({
    className: `${pfx}-sched-nav`,
    kids: [
      Skeletons.Button.Svg({
        ico: "caret-left",
        className: `${pfx}-sched-nav-btn prev`,
        service: "sched-prev",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}-sched-nav-today`,
        content: LOCALE.TODAY,
        service: "sched-today",
        uiHandler: [ui],
      }),
      Skeletons.Button.Svg({
        ico: "caret-left",
        className: `${pfx}-sched-nav-btn next`,
        service: "sched-next",
        uiHandler: [ui],
      }),
    ],
  });

  const label = Skeletons.Box.X({
    className: `${pfx}-sched-label-wrap`,
    kids: [
      Skeletons.Note({ className: `${pfx}-sched-label`, content: rangeLabel(ui) }),
      Skeletons.Image.Svg({ ico: "meet-caret-down", className: `${pfx}-sched-label-caret` }),
    ],
  });

  // Weekly ⬤ Monthly switch: the whole group toggles between the two views.
  const viewToggle = Skeletons.Box.X({
    className: `${pfx}-sched-toggle`,
    service: "sched-toggle-view",
    uiHandler: [ui],
    attrOpt: { "data-view": view },
    kids: [
      Skeletons.Note({ className: `${pfx}-sched-toggle-label weekly`, content: LOCALE.WEEKLY }),
      Skeletons.Box.X({
        className: `${pfx}-sched-toggle-switch`,
        kids: [Skeletons.Note({ className: `${pfx}-sched-toggle-knob` })],
      }),
      Skeletons.Note({ className: `${pfx}-sched-toggle-label monthly`, content: LOCALE.MONTHLY }),
    ],
  });

  const startBtn = Skeletons.Button.Label({
    className: `${pfx}-sched-start-btn`,
    ico: "meet-camera",
    label: LOCALE.START_A_MEETING,
    labelClass: `${pfx}-sched-start-label`,
    service: "start-meeting",
    uiHandler: [ui],
  });

  // Placeholder CTA — there is no meeting-scheduling backend wired yet
  // (window_schedule is not a registered kind); handled as a no-op.
  const scheduleBtn = Skeletons.Note({
    className: `${pfx}-sched-schedule-btn`,
    content: LOCALE.SCHEDULE,
    service: "open-schedule",
    uiHandler: [ui],
  });

  const toolbar = Skeletons.Box.X({
    className: `${pfx}-sched-toolbar`,
    kids: [
      Skeletons.Box.X({ className: `${pfx}-sched-toolbar-left`, kids: [navPill, label] }),
      Skeletons.Box.X({
        className: `${pfx}-sched-toolbar-right`,
        kids: [viewToggle, startBtn, scheduleBtn],
      }),
    ],
  });

  const grid = Skeletons.Box.Y({
    className: `${pfx}-sched-grid`,
    sys_pn: "sched-grid",
    partHandler: ui,
    kids: view === "monthly" ? monthlyGrid(ui, pfx) : weeklyGrid(ui, pfx),
  });

  // sys_pn "meeting-panel" keeps the existing onPartReady hook alive (a
  // start_meeting launch flag triggers _launchMeetingInPanel when this part
  // mounts — see window/folder/index.js onPartReady).
  return Skeletons.Box.Y({
    className: `${pfx}-schedule`,
    sys_pn: "meeting-panel",
    partHandler: ui,
    debug: __filename,
    kids: [toolbar, grid],
  });
};

module.exports.rangeLabel = rangeLabel;
module.exports.schedState = schedState;
