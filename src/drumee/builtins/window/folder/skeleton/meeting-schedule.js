// Meeting-tab schedule view: Today/week navigation, Weekly/Monthly toggle,
// "Start a Meeting" + "Schedule" CTAs, and a week/month grid populated from the
// hub's scheduled meetings (ui._meetings, fetched via room.list). View state
// lives on the folder window (ui._sched); nav/toggle services are handled in
// window/folder/index.js, which re-feeds this.
const { stripMarkers } = require("../meeting-markers");

// `autoDaily` marks a `view` that the RESPONSIVE rule chose, not the user:
// _applyScheduleBreakpoint sets it when a narrow panel switches weekly → daily,
// and every explicit view service (sched-set-view / sched-toggle-view /
// sched-pick-day) clears it. That one bit is what lets widening the panel undo
// an automatic switch without ever undoing a deliberate one.
function schedState(ui) {
  if (!ui._sched) {
    ui._sched = { anchor: Dayjs(), view: "weekly", autoDaily: false };
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

// Weekly-card text metrics — must match &__meeting-sched-card* in the skin.
// Used to decide how much of the description actually fits, so a card never
// renders a half-clipped line of text.
const CARD_PAD_PX = 8; // 4px top + 4px bottom
const CARD_TITLE_PX = 18; // title line-height
const CARD_DESC_PX = 14; // description line-height
const CARD_DESC_MAX_LINES = 3;
// Shortest slot a card is laid out against (height and overlap lanes alike).
const MIN_SLOT_MIN = 15;
// Floor tall enough for the title + one description line: a 15/30-minute
// meeting is otherwise ~34px, which clips both.
const CARD_MIN_PX = CARD_PAD_PX + CARD_TITLE_PX + CARD_DESC_PX; // 40

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

// Side-by-side columns for meetings that genuinely overlap in time. Splitting
// by start-hour alone halved every card in a busy hour even when the meetings
// ran back-to-back (09:00-09:30 then 09:30-10:00 each got 50% width). Walks one
// day's meetings in start order, groups transitively-overlapping ones into a
// cluster, and packs each cluster into the fewest lanes. Annotates every
// meeting with `lane` / `lanes` (mutating the per-render objects built by
// normalizeMeetings) and returns the list.
function layoutDay(list) {
  const sorted = list.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  // A meeting saved with end == start still takes the card's minimum slot, so
  // pack lanes against the same floor weekCard draws with — otherwise two
  // zero-length meetings at one time share a lane and land on top of each other.
  const endOf = (m) =>
    m.end.diff(m.start, "minute") >= MIN_SLOT_MIN ? m.end : m.start.add(MIN_SLOT_MIN, "minute");
  let cluster = [];
  let clusterEnd = null;

  const flush = () => {
    if (!cluster.length) return;
    const laneEnds = []; // laneEnds[k] = end of the last meeting placed in lane k
    for (const m of cluster) {
      // Reuse the first lane already free at this meeting's start time.
      let k = laneEnds.findIndex((end) => !m.start.isBefore(end));
      if (k < 0) k = laneEnds.length;
      laneEnds[k] = endOf(m);
      m.lane = k;
    }
    for (const m of cluster) m.lanes = laneEnds.length;
    cluster = [];
    clusterEnd = null;
  };

  for (const m of sorted) {
    if (clusterEnd && m.start.isBefore(clusterEnd)) {
      cluster.push(m);
      if (endOf(m).isAfter(clusterEnd)) clusterEnd = endOf(m);
    } else {
      flush();
      cluster = [m];
      clusterEnd = endOf(m);
    }
  }
  flush();
  return sorted;
}

// A meeting card absolutely positioned within its start-hour cell (top/height
// by minute so it can span rows; z-index lifts it above later sibling cells).
// `lane`/`lanes` (from layoutDay) split the width across overlapping meetings.
function weekCard(ui, pfx, mtg) {
  const top = (mtg.start.minute() / 60) * HOUR_PX;
  const durMin = Math.max(MIN_SLOT_MIN, mtg.end.diff(mtg.start, "minute"));
  // Duration drives the height, but never below the floor that keeps the title
  // and one description line readable.
  const height = Math.max(CARD_MIN_PX, (durMin / 60) * HOUR_PX - 2);
  const desc = mtg.message ? stripMarkers(mtg.message) : "";
  // Whole description lines that fit under the title — rendering more would
  // clip the last one mid-glyph, which is the "cut-off" look.
  const descLines = Math.min(
    CARD_DESC_MAX_LINES,
    Math.floor((height - CARD_PAD_PX - CARD_TITLE_PX) / CARD_DESC_PX),
  );
  const lanes = mtg.lanes || 1;
  const lane = mtg.lane || 0;
  const w = 100 / lanes;
  return Skeletons.Box.Y({
    className: `${pfx}-sched-card`,
    styleOpt: {
      top: `${top}px`,
      height: `${height}px`,
      // Hover expands the card to its full text (see the skin) — never past
      // the size the duration already gives it.
      minHeight: `${height}px`,
      left: `calc(${lane * w}% + 2px)`,
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
      desc && descLines > 0
        ? Skeletons.Note({
            className: `${pfx}-sched-card-desc`,
            content: desc,
            // Clamp AND cap the height: the cap still holds if the browser
            // drops -webkit-line-clamp, so no partial line either way.
            styleOpt: {
              "-webkit-line-clamp": String(descLines),
              maxHeight: `${descLines * CARD_DESC_PX}px`,
            },
          })
        : null,
      Skeletons.Button.Svg({
        className: `${pfx}-sched-card-join`,
        ico: "meet-camera",
        service: "join-meeting",
        nid: mtg.nid,
        bubble: 0,
        uiHandler: [ui],
      }),
    ].filter(Boolean),
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
  // Column layout is per day (overlaps only matter within one day column), so
  // resolve it once here rather than per hour cell.
  for (let i = 0; i < nDays; i++) {
    const day = start.add(i, "day");
    layoutDay(meetings.filter((m) => m.start.isSame(day, "day")));
  }
  // meetings that start on day i (0..nDays-1) at hour h → cellMeetings[i][h]
  const cellMeetings = (i, h) => {
    const day = start.add(i, "day");
    return meetings.filter(
      (m) => m.start.isSame(day, "day") && m.start.hour() === h,
    );
  };

  // `--day` marks the single-column variant, mirroring the month grid's own
  // `--month` modifier. The skin needs it because weekly and daily share every
  // other class: the compact block gives the grid a 620px min-width so seven
  // columns stay usable by scrolling, and without this modifier ONE column
  // inherited that floor and scrolled sideways too — which is precisely what
  // switching to daily on a narrow panel exists to avoid.
  const dayMod = daily ? ` ${pfx}-sched-days--day` : "";
  const bodyMod = daily ? ` ${pfx}-sched-body--day` : "";
  const header = Skeletons.Box.X({
    className: `${pfx}-sched-days${dayMod}`,
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
            kids: [slot(0), slot(30), ...cm.map((m) => weekCard(ui, pfx, m))],
          });
        }),
      ],
    }),
  );

  return [
    header,
    Skeletons.Box.Y({ className: `${pfx}-sched-body${bodyMod}`, kids: rows }),
  ];
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
  // Starting and scheduling are EDIT-tier actions; JOINING is not. So this
  // button is dropped only when it would START one — a live meeting (active) or
  // one we are already in (joined) keeps it, which is exactly what view and chat
  // are entitled to and mirrors conference_join's own rule (it refuses a start
  // only when no conference is active for the hub).
  // canUpload() is the folder window's own write test, the same one
  // syncNewCtrlVisibility uses; absent → treated as allowed (fail-open).
  const mayStart =
    typeof ui.canUpload !== "function" ? true : !!ui.canUpload();
  const startBtn = (!mayStart && !joined && !active) ? "" : Skeletons.Button.Label({
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
  // Scheduling always writes a `schedule` node (room.book asks for the write
  // bit), so unlike Start it has no join-equivalent and simply goes.
  const scheduleBtn = !mayStart ? "" : Skeletons.Note({
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
module.exports.HOUR_PX = HOUR_PX;
module.exports.normalizeMeetings = normalizeMeetings;
