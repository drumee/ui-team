// Meeting-tab schedule view: Today/week navigation, Weekly/Monthly toggle,
// "Start a Meeting" + "Schedule" CTAs, and a week/month grid populated from the
// hub's scheduled meetings (ui._meetings, fetched via room.list). View state
// lives on the folder window (ui._sched); nav/toggle services are handled in
// window/folder/index.js, which re-feeds this.

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
// "June 2026" (monthly view) / "June 16, 2026" (day view).
function rangeLabel(ui) {
  const { anchor, view } = schedState(ui);
  if (view === "monthly") return anchor.format("MMMM YYYY");
  if (view === "daily") return anchor.format("MMMM DD, YYYY");
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

const HOUR_PX = 72; // must match &__meeting-sched-row height in the skin

// ui._meetings (room.list rows) → occurrences { nid, title, start, end } within
// [rangeStart, rangeEnd). Recurring meetings are expanded across the range.
function normalizeMeetings(ui, rangeStart, rangeEnd) {
  const rows = Array.isArray(ui._meetings) ? ui._meetings : [];
  const out = [];
  const inRange = (d) =>
    !rangeStart || (!d.isBefore(rangeStart) && d.isBefore(rangeEnd));

  for (const m of rows) {
    let content = {};
    try {
      const md = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata || {};
      content = typeof md.content === "string" ? JSON.parse(md.content) : md.content || {};
    } catch (e) {
      content = {};
    }
    const s = Number(m.stime || content.stime);
    if (!s) continue; // legacy node without a queryable epoch → skip
    const e = Number(m.etime || content.etime) || s + 3600;
    const durMs = (e - s) * 1000;
    const base = {
      nid: m.id,
      title: content.title || m.filename || LOCALE.MEETING,
      message: content.message || "",
    };
    const push = (start) => out.push({ ...base, start, end: start.add(durMs, "millisecond") });

    const recur = content.recur;
    const freq = recur && recur.freq;
    if (!freq || freq === "none") {
      const st = Dayjs.unix(s);
      if (inRange(st)) push(st);
      continue;
    }

    const unit = freq === "daily" ? "day" : freq === "weekly" ? "week" : "month";
    const until = recur.until ? Dayjs.unix(Number(recur.until)) : null;
    let occ = Dayjs.unix(s);
    // Jump close to the window start, then walk occurrence-by-occurrence.
    if (rangeStart) {
      const n = rangeStart.diff(occ, unit);
      if (n > 0) occ = occ.add(n, unit);
    }
    let guard = 0;
    while (guard++ < 400) {
      if (until && occ.isAfter(until)) break;
      if (rangeEnd && !occ.isBefore(rangeEnd)) break;
      if (inRange(occ)) push(occ);
      occ = occ.add(1, unit);
    }
  }
  return out;
}

// A meeting card absolutely positioned within its start-hour cell (top/height
// by minute so it can span rows; z-index lifts it above later sibling cells).
// `idx`/`count` split the cell width so meetings in the same hour sit
// side-by-side instead of overlapping.
function weekCard(ui, pfx, mtg, idx = 0, count = 1) {
  const top = (mtg.start.minute() / 60) * HOUR_PX;
  const durMin = Math.max(30, mtg.end.diff(mtg.start, "minute"));
  const height = Math.max(22, (durMin / 60) * HOUR_PX - 2);
  const w = 100 / count;
  return Skeletons.Box.Y({
    className: `${pfx}-sched-card`,
    styleOpt: {
      top: `${top}px`,
      height: `${height}px`,
      left: `calc(${idx * w}% + 2px)`,
      width: `calc(${w}% - 3px)`,
      right: "auto",
    },
    service: "open-meeting",
    nid: mtg.nid,
    dataset: { nid: mtg.nid },
    attrOpt: { "data-nid": mtg.nid },
    // Don't bubble to the cell's "new meeting" click.
    bubble: 0,
    uiHandler: [ui],
    kids: [
      Skeletons.Note({ className: `${pfx}-sched-card-title`, content: mtg.title }),
      mtg.message
        ? Skeletons.Note({ className: `${pfx}-sched-card-desc`, content: mtg.message })
        : null,
      Skeletons.Button.Svg({
        className: `${pfx}-sched-card-join`,
        ico: "meet-camera",
        service: "join-meeting",
        nid: mtg.nid,
        bubble: 0,
        uiHandler: [ui],
      }),
    ],
  });
}

// ── Weekly / Day grid: day header row + 24 hour rows (85px labels + N day
// columns). The "daily" view (picked from the label's mini-calendar) is the
// same hourly grid over a single Google-Calendar-style day column.
function weeklyGrid(ui, pfx) {
  const st = schedState(ui);
  const daily = st.view === "daily";
  const start = daily ? st.anchor.startOf("day") : st.anchor.startOf("week");
  const nDays = daily ? 1 : 7;
  const today = Dayjs().format("YYYY-MM-DD");
  const meetings = normalizeMeetings(ui, start, start.add(nDays, "day"));
  // meetings that start on day i (0..nDays-1) at hour h → cellMeetings[i][h]
  const cellMeetings = (i, h) => {
    const day = start.add(i, "day");
    return meetings.filter(
      (m) => m.start.isSame(day, "day") && m.start.hour() === h,
    );
  };

  const header = Skeletons.Box.X({
    className: `${pfx}-sched-days`,
    kids: [
      Skeletons.Box.Y({ className: `${pfx}-sched-corner` }),
      ...Array.from({ length: nDays }, (_, i) => {
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
        ...Array.from({ length: nDays }, (_, i) => {
          const cm = cellMeetings(i, h);
          const dayStr = start.add(i, "day").format("YYYY-MM-DD");
          // Two half-hour click zones (:00 / :30) so clicking the 6:30 band
          // schedules 6:30, not the whole 6:00 hour.
          const slot = (min) =>
            Skeletons.Box.Y({
              className: `${pfx}-sched-slot`,
              service: "sched-new-at",
              day: dayStr,
              hour: h,
              min,
              attrOpt: { "data-day": dayStr, "data-hour": h, "data-min": min },
              uiHandler: [ui],
            });
          return Skeletons.Box.Y({
            className: `${pfx}-sched-cell`,
            kids: [slot(0), slot(30), ...cm.map((m, k) => weekCard(ui, pfx, m, k, cm.length))],
          });
        }),
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
  const meetings = normalizeMeetings(ui, gridStart, gridStart.add(42, "day"));
  const dayMeetings = (d) => meetings.filter((m) => m.start.isSame(d, "day"));
  const monthCard = (m) =>
    Skeletons.Note({
      className: `${pfx}-sched-mcard`,
      content: `${m.start.format("HH:mm")} ${m.title}`,
      service: "open-meeting",
      nid: m.nid,
      dataset: { nid: m.nid },
      attrOpt: { "data-nid": m.nid },
      uiHandler: [ui],
    });

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
              ...dayMeetings(d).map(monthCard),
            ],
          });
        }),
      }),
    );
  }

  return [header, Skeletons.Box.Y({ className: `${pfx}-sched-body ${pfx}-sched-body--month`, kids: weeks })];
}

// ── Mini-calendar dropdown (caret next to the range label) ────────────────
// One month (st.pickerCursor, ‹ › to move it) of pickable days. The current
// selection is brand-tinted: the anchor week in weekly view, the anchor day in
// monthly view. Picking a day re-anchors the schedule onto it.
function pickerCal(ui, pfx) {
  const st = schedState(ui);
  const cursor = st.pickerCursor || st.anchor;
  const gridStart = cursor.startOf("month").startOf("week");
  const today = Dayjs().format("YYYY-MM-DD");
  // Weekly highlights the anchor week band; monthly / day view just the day.
  const weekBand = st.view === "weekly";
  const selStart = weekBand ? st.anchor.startOf("week") : st.anchor.startOf("day");
  const selEnd = weekBand
    ? st.anchor.startOf("week").add(6, "day").endOf("day")
    : st.anchor.endOf("day");

  const head = Skeletons.Box.X({
    className: `${pfx}-sched-picker-head`,
    kids: [
      Skeletons.Button.Svg({
        ico: "caret-left",
        className: `${pfx}-sched-picker-nav prev`,
        service: "sched-picker-prev",
        bubble: 0,
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}-sched-picker-month`,
        content: cursor.format("MMMM YYYY"),
      }),
      Skeletons.Button.Svg({
        ico: "caret-left",
        className: `${pfx}-sched-picker-nav next`,
        service: "sched-picker-next",
        bubble: 0,
        uiHandler: [ui],
      }),
    ],
  });

  const dows = Skeletons.Box.X({
    className: `${pfx}-sched-picker-dows`,
    kids: Array.from({ length: 7 }, (_, i) =>
      Skeletons.Note({
        className: `${pfx}-sched-picker-dow`,
        content: gridStart.add(i, "day").format("dd"),
      }),
    ),
  });

  const weeks = Array.from({ length: 6 }, (_, w) =>
    Skeletons.Box.X({
      className: `${pfx}-sched-picker-week`,
      kids: Array.from({ length: 7 }, (_, i) => {
        const d = gridStart.add(w * 7 + i, "day");
        const ds = d.format("YYYY-MM-DD");
        const selected = !d.isBefore(selStart) && !d.isAfter(selEnd);
        return Skeletons.Note({
          className: `${pfx}-sched-picker-day`,
          content: String(d.date()),
          service: "sched-pick-day",
          schedDay: ds,
          dataset: { day: ds },
          attrOpt: {
            "data-in": d.month() === cursor.month() ? "1" : "0",
            "data-sel": selected ? "1" : "0",
            "data-today": ds === today ? "1" : "0",
          },
          bubble: 0,
          uiHandler: [ui],
        });
      }),
    }),
  );

  return Skeletons.Box.Y({
    className: `${pfx}-sched-picker`,
    kids: [head, dows, ...weeks],
  });
}

module.exports = function meetingSchedule(ui) {
  const pfx = `${ui.fig.family}__meeting`;
  const { view, pickerOpen } = schedState(ui);

  // [ ‹ range-label › ] — the label sits between the arrows (Figma pass);
  // Today is hidden until the design brings it back.
  const navPill = Skeletons.Box.X({
    className: `${pfx}-sched-nav`,
    kids: [
      Skeletons.Button.Svg({
        ico: "caret-left",
        className: `${pfx}-sched-nav-btn prev`,
        service: "sched-prev",
        uiHandler: [ui],
      }),
      // Skeletons.Note({
      //   className: `${pfx}-sched-nav-today`,
      //   content: LOCALE.TODAY,
      //   service: "sched-today",
      //   uiHandler: [ui],
      // }),
      Skeletons.Note({ className: `${pfx}-sched-label`, content: rangeLabel(ui) }),
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
    attrOpt: { "data-open": pickerOpen ? "1" : "0" },
    service: "sched-toggle-picker",
    uiHandler: [ui],
    kids: [
      Skeletons.Image.Svg({ ico: "meet-caret-down", className: `${pfx}-sched-label-caret` }),
    ],
  });

  // Each label sets its view explicitly (click Monthly → monthly); the pill —
  // and any other spot of the toggle (container catches the leftovers) —
  // toggles. `schedView`, not `view`: the widget factory consumes `view`, so
  // it never reaches the handler's mget.
  const viewToggle = Skeletons.Box.X({
    className: `${pfx}-sched-toggle`,
    attrOpt: { "data-view": view },
    service: "sched-toggle-view",
    uiHandler: [ui],
    kids: [
      Skeletons.Note({
        className: `${pfx}-sched-toggle-label weekly`,
        content: LOCALE.WEEKLY,
        bubble: 0,
        service: "sched-set-view",
        schedView: "weekly",
        uiHandler: [ui],
      }),
      Skeletons.Box.X({
        className: `${pfx}-sched-toggle-switch`,
        bubble: 0,
        service: "sched-toggle-view",
        uiHandler: [ui],
        kids: [Skeletons.Note({ className: `${pfx}-sched-toggle-knob` })],
      }),
      Skeletons.Note({
        className: `${pfx}-sched-toggle-label monthly`,
        content: LOCALE.MONTHLY,
        bubble: 0,
        service: "sched-set-view",
        schedView: "monthly",
        uiHandler: [ui],
      }),
    ],
  });

  // Render the button state up-front so a schedule re-render (fetch resolve,
  // nav/toggle) doesn't reset it — driven by the folder's flags:
  //   joined  → locked "Joined"       (local user is in the meeting)
  //   active  → "Join Meeting"        (a host is in the room, viewer isn't)
  //   else    → "Start a Meeting"
  const joined = !!(
    ui._meetingJoined ||
    (ui._meetingWindowLive && ui._meetingWindowLive())
  );
  const active = !joined && !!ui._meetingActive;
  const startLabel = joined
    ? LOCALE.JOINED || "Joined"
    : active
      ? LOCALE.JOIN_MEETING || "Join meeting"
      : LOCALE.START_A_MEETING;
  const startBtn = Skeletons.Button.Label({
    className: `${pfx}-sched-start-btn`,
    ico: "meet-camera",
    label: startLabel,
    labelClass: `${pfx}-sched-start-label`,
    service: "start-meeting",
    uiHandler: [ui],
    // attrOpt (not dataset) — the builder only applies `dataset` when an
    // attrOpt/attribute is also present (see addons/letc.js). Only "Joined"
    // locks/paints the button; "Join Meeting" stays a normal clickable button.
    attrOpt: joined ? { "data-joined": "1" } : undefined,
  });

  // Opens the create modal (skeleton/meeting-modal.js) via open-schedule.
  const scheduleBtn = Skeletons.Note({
    className: `${pfx}-sched-schedule-btn`,
    content: LOCALE.SCHEDULE,
    service: "open-schedule",
    uiHandler: [ui],
  });

  const toolbar = Skeletons.Box.X({
    className: `${pfx}-sched-toolbar`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-sched-toolbar-left`,
        kids: [navPill, label, pickerOpen ? pickerCal(ui, pfx) : null].filter(Boolean),
      }),
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
